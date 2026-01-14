/* eslint-disable @typescript-eslint/no-explicit-any */
import { google } from 'googleapis';
import {
  db,
  automationConfigs,
  googleOAuthTokens,
  contacts,
  users,
  pipelineStages,
  contactTags,
  tags,
} from '@maatwork/db';
import { eq, and } from 'drizzle-orm';
import { decryptToken } from '../../utils/encryption';
import { env } from '../../config/env';
import { pino } from 'pino';

const logger = pino({ name: 'email-automation-service' });

export interface AutomationContext {
  contactId?: string;
  userId?: string; // The user who triggered the action
  newPipelineStageId?: string; // If stage changed
  [key: string]: unknown;
}

export interface EmailConfig {
  subject: string;
  body: string;
  senderEmail: string;
}

export class EmailAutomationService {
  /**
   * Check and trigger automations for a specific event type
   */
  async checkAndTriggerAutomations(triggerType: string, context: AutomationContext) {
    logger.info({ triggerType, context }, 'Checking automations');

    try {
      // 1. Fetch enabled automations for this trigger type
      const automations = await db()
        .select()
        .from(automationConfigs)
        .where(
          and(eq(automationConfigs.triggerType, triggerType), eq(automationConfigs.enabled, true))
        );

      if (automations.length === 0) {
        return;
      }

      // 2. Fetch context data (Contact, Advisor, etc.)
      const contextData = await this.enrichContext(context);

      // 3. Process each automation
      for (const automation of automations) {
        try {
          // Check trigger specific conditions
          if (
            !this.matchesTriggerConfig(
              automation.triggerConfig as Record<string, unknown>,
              contextData
            )
          ) {
            continue;
          }

          const config = automation.config as unknown as EmailConfig;

          if (!config.subject || !config.body || !config.senderEmail) {
            logger.warn({ automationId: automation.id }, 'Invalid email automation config');
            continue;
          }

          if (!contextData.contact?.email) {
            logger.warn(
              { automationId: automation.id, contactId: context.contactId },
              'Contact has no email, skipping'
            );
            continue;
          }

          // Resolve variables
          const subject = this.resolveVariables(config.subject, contextData);
          const body = this.resolveVariables(config.body, contextData);

          // Resolve Sender and Send Email
          await this.sendEmail(
            contextData,
            config.senderEmail,
            contextData.contact.email,
            subject,
            body,
            context.userId
          );

          logger.info(
            { automationId: automation.id, contactId: context.contactId },
            'Automation executed successfully'
          );
        } catch (err) {
          logger.error({ automationId: automation.id, error: err }, 'Failed to execute automation');
          // Don't throw, continue with other automations
        }
      }
    } catch (err) {
      logger.error({ error: err }, 'Error in checkAndTriggerAutomations');
      // Don't throw to avoid blocking the main flow
    }
  }

  // ... (enrichContext, matchesTriggerConfig, resolveVariables implementation remains same)

  private async enrichContext(context: AutomationContext) {
    const data: Record<string, any> = { ...context }; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (context.contactId) {
      const [contact] = await db()
        .select()
        .from(contacts)
        .where(eq(contacts.id, context.contactId))
        .limit(1);

      if (contact) {
        data.contact = contact;

        if (contact.assignedAdvisorId) {
          const [advisor] = await db()
            .select()
            .from(users)
            .where(eq(users.id, contact.assignedAdvisorId))
            .limit(1);
          data.advisor = advisor;
        }

        // Fetch current stage info (if not overridden by newPipelineStageId)
        const stageId = context.newPipelineStageId || contact.pipelineStageId;
        if (stageId) {
          const [stage] = await db()
            .select()
            .from(pipelineStages)
            .where(eq(pipelineStages.id, stageId))
            .limit(1);
          data.stage = stage;
          data.toStageName = stage?.name;
        }

        // Fetch contact tags
        const tagsData = await db()
          .select({ name: tags.name })
          .from(contactTags)
          .innerJoin(tags, eq(contactTags.tagId, tags.id))
          .where(eq(contactTags.contactId, contact.id));

        const tagNames = tagsData.map((t: { name: string }) => t.name);
        data.contact.tags = tagNames;
        data.contact.tagNames = tagNames.join(', ');
      }
    }

    return data;
  }

  /**
   * Check if the event matches the trigger configuration
   */
  private matchesTriggerConfig(
    triggerConfig: Record<string, unknown>,
    contextData: Record<string, unknown>
  ): boolean {
    // Pipeline Stage Change
    if (triggerConfig.stageName) {
      // Check if we moved TO this stage
      if (contextData.toStageName === triggerConfig.stageName) {
        return true;
      }
      return false;
    }

    return true; // If no specific config, assume match (e.g. any stage change? usually not, but safe default for now)
  }

  /**
   * Replace {variable} placeholders
   */
  private resolveVariables(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{([^}]+)\}/g, (match, path) => {
      const value = path
        .split('.')
        .reduce((obj: unknown, key: string) => (obj as Record<string, unknown>)?.[key], data);
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Send email using Google OAuth with dynamic sender resolution
   * Priority: verifyUserId -> assignedAdvisorId -> configuredSenderEmail
   */
  private async sendEmail(
    contextData: Record<string, any>,
    fallbackSenderEmail: string,
    to: string,
    subject: string,
    body: string,
    triggeringUserId?: string
  ) {
    let tokenData = null;
    let senderEmailUsed = fallbackSenderEmail;

    // 1. Try Triggering User
    if (triggeringUserId) {
      const [userToken] = await db()
        .select()
        .from(googleOAuthTokens)
        .where(eq(googleOAuthTokens.userId, triggeringUserId))
        .limit(1);

      if (userToken) {
        tokenData = userToken;
        senderEmailUsed = userToken.email;
        logger.info(
          { userId: triggeringUserId, email: senderEmailUsed },
          'Using triggering user context for automation email'
        );
      }
    }

    // 2. Try Assigned Advisor (if triggering user failed or yielded no tokens)
    if (!tokenData && contextData.contact?.assignedAdvisorId) {
      const [advisorToken] = await db()
        .select()
        .from(googleOAuthTokens)
        .where(eq(googleOAuthTokens.userId, contextData.contact.assignedAdvisorId))
        .limit(1);

      if (advisorToken) {
        tokenData = advisorToken;
        senderEmailUsed = advisorToken.email;
        logger.info(
          { userId: contextData.contact.assignedAdvisorId, email: senderEmailUsed },
          'Using assigned advisor context for automation email'
        );
      }
    }

    // 3. Fallback to Configured Email (Legacy/System Account)
    if (!tokenData && fallbackSenderEmail) {
      const [configToken] = await db()
        .select()
        .from(googleOAuthTokens)
        .where(eq(googleOAuthTokens.email, fallbackSenderEmail))
        .limit(1);

      if (configToken) {
        tokenData = configToken;
        senderEmailUsed = fallbackSenderEmail;
        logger.info({ email: senderEmailUsed }, 'Using configured fallback email');
      }
    }

    if (!tokenData) {
      throw new Error(
        `No connected Google account found for automation. Tried: TriggerUser, Advisor, Fallback(${fallbackSenderEmail})`
      );
    }

    // 2. Decrypt tokens
    const accessToken = decryptToken(tokenData.accessTokenEncrypted, env.GOOGLE_ENCRYPTION_KEY);
    const refreshToken = decryptToken(tokenData.refreshTokenEncrypted, env.GOOGLE_ENCRYPTION_KEY);

    // 3. Setup OAuth client
    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      // Optional: expiry_date
    });

    // 4. Create Gmail client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // 5. Construct raw email
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    // const senderName = contextData.advisor?.fullName || 'Cactus Dashboard'; // Optional: Use advisor name if available

    const messageParts = [
      `From: ${senderEmailUsed}`,
      `To: ${to}`,
      `Subject: ${utf8Subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      body,
    ];
    const message = messageParts.join('\n');

    // 6. Send
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });
  }
}

export const emailAutomationService = new EmailAutomationService();
