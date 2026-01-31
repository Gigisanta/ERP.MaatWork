/**
 * Automations CRUD Handlers
 *
 * GET /automations - List automation configs
 * GET /automations/:id - Get automation config by ID
 * GET /automations/by-name/:name - Get automation config by name
 * POST /automations - Create automation config
 * PATCH /automations/:id - Update automation config
 * DELETE /automations/:id - Delete automation config
 */
import type { Request, Response } from 'express';
import { db, automationConfigs } from '@maatwork/db';
import { eq } from 'drizzle-orm';
import { createRouteHandler, createAsyncHandler, HttpError } from '../../../utils/route-handler';
import { createAutomationConfigSchema, updateAutomationConfigSchema } from '../schemas';
import { z } from 'zod';

/**
 * GET /automations - List automation configs
 */
export const handleListAutomations = createRouteHandler(async (_req: Request) => {
  const items = await db().select().from(automationConfigs).orderBy(automationConfigs.displayName);

  return items;
});

/**
 * GET /automations/:id - Get automation config by ID
 */
export const handleGetAutomation = createRouteHandler(async (req: Request) => {
  const { id } = req.params;

  const [item] = await db()
    .select()
    .from(automationConfigs)
    .where(eq(automationConfigs.id, id))
    .limit(1);

  if (!item) {
    throw new HttpError(404, 'Automation config not found');
  }

  return item;
});

/**
 * GET /automations/by-name/:name - Get automation config by name
 */
export const handleGetAutomationByName = createRouteHandler(async (req: Request) => {
  const { name } = req.params;

  const [item] = await db()
    .select()
    .from(automationConfigs)
    .where(eq(automationConfigs.name, name))
    .limit(1);

  if (!item) {
    throw new HttpError(404, 'Automation config not found');
  }

  return item;
});

/**
 * POST /automations - Create automation config
 */
export const handleCreateAutomation = createAsyncHandler(async (req: Request, res: Response) => {
  const validated = req.body as z.infer<typeof createAutomationConfigSchema>;

  // Verificar que no exista otra configuración con el mismo name
  const [existing] = await db()
    .select()
    .from(automationConfigs)
    .where(eq(automationConfigs.name, validated.name))
    .limit(1);

  if (existing) {
    throw new HttpError(409, 'Automation config with this name already exists');
  }

  const [newConfig] = await db()
    .insert(automationConfigs)
    .values({
      ...validated,
      updatedAt: new Date(),
    })
    .returning();

  req.log.info({ automationConfigId: newConfig.id }, 'automation config created');

  return res.status(201).json({
    success: true,
    data: newConfig,
    requestId: req.requestId,
  });
});

/**
 * PATCH /automations/:id - Update automation config
 */
export const handleUpdateAutomation = createRouteHandler(async (req: Request) => {
  const { id } = req.params;
  const validated = req.body as z.infer<typeof updateAutomationConfigSchema>;

  // Verificar que existe
  const [existing] = await db()
    .select()
    .from(automationConfigs)
    .where(eq(automationConfigs.id, id))
    .limit(1);

  if (!existing) {
    throw new HttpError(404, 'Automation config not found');
  }

  const [updated] = await db()
    .update(automationConfigs)
    .set({
      ...validated,
      updatedAt: new Date(),
    })
    .where(eq(automationConfigs.id, id))
    .returning();

  req.log.info({ automationConfigId: id }, 'automation config updated');

  return updated;
});

/**
 * DELETE /automations/:id - Delete automation config
 */
export const handleDeleteAutomation = createRouteHandler(async (req: Request) => {
  const { id } = req.params;

  // Verificar que existe
  const [existing] = await db()
    .select()
    .from(automationConfigs)
    .where(eq(automationConfigs.id, id))
    .limit(1);

  if (!existing) {
    throw new HttpError(404, 'Automation config not found');
  }

  await db().delete(automationConfigs).where(eq(automationConfigs.id, id));

  req.log.info({ automationConfigId: id }, 'automation config deleted');

  return { success: true };
});

/**
 * GET /automations/health - Diagnóstico del sistema de automations
 *
 * Verifica:
 * - Variables de entorno de Google OAuth
 * - Automations configuradas y su estado
 * - Tokens OAuth disponibles
 */
export const handleAutomationsHealth = createRouteHandler(async (_req: Request) => {
  const { googleOAuthTokens } = await import('@maatwork/db');
  const { env } = await import('../../../config/env');

  // Check all automations
  const automations = await db().select().from(automationConfigs);

  // Check OAuth tokens
  const tokens = await db()
    .select({
      id: googleOAuthTokens.id,
      email: googleOAuthTokens.email,
      userId: googleOAuthTokens.userId,
    })
    .from(googleOAuthTokens);

  // Analyze each automation
  const automationDetails = automations.map((auto: typeof automations[number]) => {
    const config = auto.config as { senderEmail?: string; subject?: string; body?: string } | null;
    const issues: string[] = [];

    if (!auto.enabled) {
      issues.push('Automation is disabled');
    }

    if (!config?.senderEmail) {
      issues.push('Missing senderEmail - configure with a Google OAuth connected email');
    } else {
      // Check if senderEmail has an OAuth token
      const hasToken = tokens.some((t: typeof tokens[number]) => t.email === config.senderEmail);
      if (!hasToken) {
        issues.push(`senderEmail "${config.senderEmail}" has no OAuth token connected`);
      }
    }

    if (!config?.subject) {
      issues.push('Missing email subject');
    }

    if (!config?.body) {
      issues.push('Missing email body');
    }

    return {
      id: auto.id,
      name: auto.name,
      displayName: auto.displayName,
      enabled: auto.enabled,
      triggerType: auto.triggerType,
      senderEmail: config?.senderEmail || null,
      hasWebhook: !!auto.webhookUrl,
      issues,
      ready: issues.length === 0,
    };
  });

  // Environment checks
  const envChecks = {
    googleClientId: !!env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_ID !== '',
    googleClientSecret: !!env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CLIENT_SECRET !== '',
    googleEncryptionKey:
      !!env.GOOGLE_ENCRYPTION_KEY && env.GOOGLE_ENCRYPTION_KEY.length >= 32,
    googleRedirectUri: !!env.GOOGLE_REDIRECT_URI,
  };

  const envReady = Object.values(envChecks).every(Boolean);

  // Summary
  interface AutomationDetail {
    ready: boolean;
    enabled: boolean;
  }
  
  const readyCount = automationDetails.filter((a: AutomationDetail) => a.ready).length;
  const enabledCount = automationDetails.filter((a: AutomationDetail) => a.enabled).length;

  return {
    summary: {
      environment: env.NODE_ENV,
      envConfigured: envReady,
      totalAutomations: automations.length,
      enabledAutomations: enabledCount,
      readyAutomations: readyCount,
      oauthTokensAvailable: tokens.length,
    },
    envChecks,
    oauthEmails: tokens.map((t: typeof tokens[number]) => t.email),
    automations: automationDetails,
  };
});
