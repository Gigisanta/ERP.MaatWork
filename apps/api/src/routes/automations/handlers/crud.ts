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
import { db, automationConfigs } from '@cactus/db';
import { eq } from 'drizzle-orm';
import { createRouteHandler, createAsyncHandler, HttpError } from '../../../utils/route-handler';
import { createAutomationConfigSchema, updateAutomationConfigSchema } from '../schemas';
import { z } from 'zod';

/**
 * GET /automations - List automation configs
 */
export const handleListAutomations = createRouteHandler(async (req: Request) => {
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
