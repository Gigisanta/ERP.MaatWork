/**
 * Email Automation Service
 *
 * AI_DECISION: Servicio robusto para envío de emails automáticos via Gmail API
 * Justificación: Implementa retry logic, refresh de tokens, y logging detallado
 * Impacto: Automations funcionan de manera confiable en dev y producción
 */

import { google, Auth } from 'googleapis';
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
import { decryptToken, encryptToken } from '../../utils/encryption';
import { env } from '../../config/env';
import { pino } from 'pino';
import { sendWebhook, WebhookPayload } from '../../utils/http/webhook-client';

const logger = pino({ name: 'email-automation-service' });

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

// Basic context passed to the service
export interface AutomationContext {
  contactId?: string;
  userId?: string; // The user who triggered the action
  newPipelineStageId?: string; // If stage changed
  [key: string]: unknown;
}

// Enriched context with DB entities
export interface EnrichedAutomationContext extends AutomationContext {
  contact?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
    email: string | null;
    phone: string | null;
    country: string | null;
    dni: string | null;
    pipelineStageId: string | null;
    assignedAdvisorId: string | null;
    tags?: string[];
    tagNames?: string;
  };
  advisor?: {
    id: string;
    fullName: string | null;
    email: string;
  };
  stage?: {
    id: string;
    name: string;
  };
  toStageName?: string | null;
}

export interface AutomationEmailConfig {
  subject: string;
  body: string;
  senderEmail: string;
}

export interface AutomationWebhookConfig {
  payload?: Record<string, unknown>;
}

interface TokenData {
  id: string;
  userId: string;
  email: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class EmailAutomationService {
  /**
   * Check and trigger automations for a specific event type
   */
  async checkAndTriggerAutomations(triggerType: string, context: AutomationContext): Promise<void> {
    const logContext = { triggerType, contactId: context.contactId, userId: context.userId };
    logger.info(logContext, '[AUTOMATION] Starting automation check');

    try {
      const automations = await db()
        .select()
        .from(automationConfigs)
        .where(
          and(eq(automationConfigs.triggerType, triggerType), eq(automationConfigs.enabled, true))
        );

      if (automations.length === 0) {
        logger.info(logContext, '[AUTOMATION] No enabled automations found for trigger type');
        return;
      }

      logger.info(
        { ...logContext, automationCount: automations.length },
        '[AUTOMATION] Found enabled automations'
      );

      // Fetch context data (Contact, Advisor, etc.)
      const contextData = await this.enrichContext(context);

      if (!contextData.contact) {
        logger.warn(logContext, '[AUTOMATION] Contact not found in context, skipping automations');
        return;
      }

      // Process each automation
      for (const automation of automations) {
        const automationLogContext = {
          ...logContext,
          automationId: automation.id,
          automationName: automation.name,
        };

        try {
          // Check trigger specific conditions
          if (
            !this.matchesTriggerConfig(
              automation.triggerConfig as Record<string, unknown>,
              contextData
            )
          ) {
            logger.debug(
              automationLogContext,
              '[AUTOMATION] Trigger config does not match, skipping'
            );
            continue;
          }

          logger.info(automationLogContext, '[AUTOMATION] Trigger config matched, processing');

          // Handle Email
          const config = automation.config as unknown as AutomationEmailConfig;
          if (config && (config.subject || config.body || config.senderEmail)) {
            await this.handleEmailAutomation(automation, config, contextData, automationLogContext);
          }

          // Handle Webhook
          if (automation.webhookUrl) {
            await this.handleWebhookAutomation(automation, contextData, automationLogContext);
          }
        } catch (err) {
          logger.error(
            { ...automationLogContext, error: err instanceof Error ? err.message : String(err) },
            '[AUTOMATION] Failed to execute automation'
          );
          // Don't throw, continue with other automations
        }
      }

      logger.info(logContext, '[AUTOMATION] Completed automation check');
    } catch (err) {
      logger.error(
        { ...logContext, error: err instanceof Error ? err.message : String(err) },
        '[AUTOMATION] Error in checkAndTriggerAutomations'
      );
      // Don't throw to avoid blocking the main flow
    }
  }

  /**
   * Handle email automation with validation and retry logic
   */
  private async handleEmailAutomation(
    automation: { id: string; name: string },
    config: AutomationEmailConfig,
    contextData: EnrichedAutomationContext,
    logContext: Record<string, unknown>
  ): Promise<void> {
    // Validate email config
    if (!config.subject) {
      logger.warn(logContext, '[EMAIL] Missing subject in automation config');
      return;
    }

    if (!config.body) {
      logger.warn(logContext, '[EMAIL] Missing body in automation config');
      return;
    }

    if (!config.senderEmail) {
      logger.warn(
        logContext,
        '[EMAIL] Missing senderEmail in automation config. Configure senderEmail with a Google OAuth connected email.'
      );
      return;
    }

    if (!contextData.contact?.email) {
      logger.warn(
        { ...logContext, contactId: contextData.contact?.id },
        '[EMAIL] Contact has no email address, skipping'
      );
      return;
    }

    // Resolve variables in subject and body
    const subject = this.resolveVariables(config.subject, contextData);
    const body = this.resolveVariables(config.body, contextData);

    logger.info(
      { ...logContext, toEmail: contextData.contact.email },
      '[EMAIL] Preparing to send automation email'
    );

    // Send email with retry logic
    await this.sendEmailWithRetry(
      contextData,
      config.senderEmail,
      contextData.contact.email,
      subject,
      body,
      contextData.userId
    );

    logger.info(logContext, '[EMAIL] Automation email sent successfully');
  }

  /**
   * Handle webhook automation
   */
  private async handleWebhookAutomation(
    automation: { id: string; name: string; webhookUrl: string | null; config: unknown },
    contextData: EnrichedAutomationContext,
    logContext: Record<string, unknown>
  ): Promise<void> {
    if (!automation.webhookUrl) {
      return;
    }

    const webhookConfig = automation.config as unknown as AutomationWebhookConfig;
    const payload = this.constructWebhookPayload(contextData, webhookConfig);

    await sendWebhook(automation.webhookUrl, payload as WebhookPayload, {
      logger: logger.child({
        automationId: automation.id,
        contactId: contextData.contactId,
        webhookUrl: automation.webhookUrl,
      }),
    });

    logger.info(logContext, '[WEBHOOK] Automation webhook triggered successfully');
  }

  /**
   * Enrich the context with database entities
   */
  private async enrichContext(context: AutomationContext): Promise<EnrichedAutomationContext> {
    const data: EnrichedAutomationContext = { ...context };

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
        if (data.contact) {
          data.contact.tags = tagNames;
          data.contact.tagNames = tagNames.join(', ');
        }
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

    return true;
  }

  /**
   * Replace {variable} placeholders with actual values
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
   * Send email with retry logic and token refresh
   */
  private async sendEmailWithRetry(
    contextData: EnrichedAutomationContext,
    fallbackSenderEmail: string,
    to: string,
    subject: string,
    body: string,
    triggeringUserId?: string
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.sendEmail(
          contextData,
          fallbackSenderEmail,
          to,
          subject,
          body,
          triggeringUserId
        );
        return; // Success!
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const isAuthError =
          lastError.message.includes('invalid_grant') ||
          lastError.message.includes('Token has been expired') ||
          lastError.message.includes('Invalid Credentials');

        logger.warn(
          {
            attempt,
            maxRetries: MAX_RETRIES,
            error: lastError.message,
            isAuthError,
          },
          '[EMAIL] Email send attempt failed'
        );

        if (attempt < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          logger.info({ delay }, '[EMAIL] Waiting before retry');
          await sleep(delay);
        }
      }
    }

    throw lastError || new Error('Failed to send email after retries');
  }

  /**
   * Send email using Google OAuth with dynamic sender resolution
   * Priority: triggeringUserId -> assignedAdvisorId -> configuredSenderEmail
   */
  private async sendEmail(
    contextData: EnrichedAutomationContext,
    fallbackSenderEmail: string,
    to: string,
    subject: string,
    body: string,
    triggeringUserId?: string
  ): Promise<void> {
    let tokenData: TokenData | null = null;
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
          '[EMAIL] Using triggering user OAuth tokens'
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
          '[EMAIL] Using assigned advisor OAuth tokens'
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
        logger.info({ email: senderEmailUsed }, '[EMAIL] Using fallback sender email');
      }
    }

    if (!tokenData) {
      const errorMsg = `No connected Google account found. Tried: TriggerUser(${triggeringUserId || 'none'}), Advisor(${contextData.contact?.assignedAdvisorId || 'none'}), Fallback(${fallbackSenderEmail || 'none'})`;
      logger.error({ error: errorMsg }, '[EMAIL] No OAuth tokens available');
      throw new Error(errorMsg);
    }

    // Decrypt tokens
    const accessToken = decryptToken(tokenData.accessTokenEncrypted, env.GOOGLE_ENCRYPTION_KEY);
    const refreshToken = decryptToken(tokenData.refreshTokenEncrypted, env.GOOGLE_ENCRYPTION_KEY);

    // Setup OAuth client with token refresh handler
    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Set up token refresh handler to persist new tokens
    oauth2Client.on('tokens', async (tokens: Auth.Credentials) => {
      if (tokens.access_token) {
        try {
          const newAccessTokenEncrypted = encryptToken(
            tokens.access_token,
            env.GOOGLE_ENCRYPTION_KEY
          );
          await db()
            .update(googleOAuthTokens)
            .set({
              accessTokenEncrypted: newAccessTokenEncrypted,
              updatedAt: new Date(),
            })
            .where(eq(googleOAuthTokens.id, tokenData!.id));

          logger.info(
            { tokenId: tokenData!.id, email: senderEmailUsed },
            '[EMAIL] OAuth access token refreshed and saved'
          );
        } catch (err) {
          logger.error(
            { error: err instanceof Error ? err.message : String(err) },
            '[EMAIL] Failed to save refreshed token'
          );
        }
      }
    });

    // Create Gmail client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Construct raw email
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;

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

    // Encode for Gmail API
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send
    logger.info({ from: senderEmailUsed, to, subject }, '[EMAIL] Sending email via Gmail API');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    logger.info({ from: senderEmailUsed, to }, '[EMAIL] Email sent successfully');
  }

  /**
   * Helper to construct a rich webhook payload
   */
  private constructWebhookPayload(
    contextData: EnrichedAutomationContext,
    automationConfig: AutomationWebhookConfig
  ): Record<string, unknown> {
    const { contact, advisor, toStageName } = contextData;

    // Base payload with unified structure
    const basePayload = {
      contactId: contact?.id,
      nombre: contact?.firstName,
      apellido: contact?.lastName,
      nombreCompleto: contact?.fullName || `${contact?.firstName} ${contact?.lastName}`,
      email: contact?.email || null,
      telefono: contact?.phone || null,
      pais: contact?.country || null,
      dni: contact?.dni || null,
      etapaActual: toStageName || contact?.pipelineStageId,
      advisor: advisor
        ? {
            id: advisor.id,
            fullName: advisor.fullName,
            email: advisor.email,
          }
        : null,
      productos: contact?.tags || [],
    };

    // Merge with custom payload if defined in automation config
    if (automationConfig && typeof automationConfig === 'object' && 'payload' in automationConfig) {
      return { ...(automationConfig.payload as Record<string, unknown>), ...basePayload };
    }

    return basePayload;
  }
}

export const emailAutomationService = new EmailAutomationService();
