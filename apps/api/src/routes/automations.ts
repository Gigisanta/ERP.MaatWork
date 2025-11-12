/**
 * Automations Routes
 * 
 * Handles CRUD operations for automation configurations
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, automationConfigs } from '@cactus/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../auth/middlewares';
import { z } from 'zod';
import { validate } from '../utils/validation';
import { idParamSchema } from '../utils/common-schemas';
import { VALIDATION_LIMITS } from '../config/api-limits';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

const triggerConfigSchema = z.record(z.unknown());

const automationConfigDataSchema = z.record(z.unknown());

const createAutomationConfigSchema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(200),
  triggerType: z.string().min(1).max(100),
  triggerConfig: triggerConfigSchema,
  webhookUrl: z.string().url().optional().nullable(),
  enabled: z.boolean().default(true),
  config: automationConfigDataSchema.optional().default({})
});

const updateAutomationConfigSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  triggerType: z.string().min(1).max(100).optional(),
  triggerConfig: triggerConfigSchema.optional(),
  webhookUrl: z.string().url().optional().nullable(),
  enabled: z.boolean().optional(),
  config: automationConfigDataSchema.optional()
});

// ==========================================================
// Routes
// ==========================================================

/**
 * GET /v1/automations - Listar configuraciones de automatización
 */
router.get('/',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await db()
        .select()
        .from(automationConfigs)
        .orderBy(automationConfigs.displayName);

      res.json({ success: true, data: items });
    } catch (err) {
      req.log.error({ err }, 'failed to list automation configs');
      next(err);
    }
  }
);

/**
 * GET /v1/automations/:id - Obtener configuración específica
 */
router.get('/:id',
  requireAuth,
  validate({ params: idParamSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const [item] = await db()
        .select()
        .from(automationConfigs)
        .where(eq(automationConfigs.id, id))
        .limit(1);

      if (!item) {
        return res.status(404).json({ error: 'Automation config not found' });
      }

      res.json({ success: true, data: item });
    } catch (err) {
      req.log.error({ err }, 'failed to get automation config');
      next(err);
    }
  }
);

/**
 * GET /v1/automations/by-name/:name - Obtener configuración por nombre
 */
router.get('/by-name/:name',
  requireAuth,
  validate({ params: z.object({ name: z.string().min(1) }) }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name } = req.params;

      const [item] = await db()
        .select()
        .from(automationConfigs)
        .where(eq(automationConfigs.name, name))
        .limit(1);

      if (!item) {
        return res.status(404).json({ error: 'Automation config not found' });
      }

      res.json({ success: true, data: item });
    } catch (err) {
      req.log.error({ err }, 'failed to get automation config by name');
      next(err);
    }
  }
);

/**
 * POST /v1/automations - Crear nueva configuración de automatización
 */
router.post('/',
  requireAuth,
  validate({ body: createAutomationConfigSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = req.body;

      // Verificar que no exista otra configuración con el mismo name
      const [existing] = await db()
        .select()
        .from(automationConfigs)
        .where(eq(automationConfigs.name, validated.name))
        .limit(1);

      if (existing) {
        return res.status(409).json({ error: 'Automation config with this name already exists' });
      }

      const [newConfig] = await db()
        .insert(automationConfigs)
        .values({
          ...validated,
          updatedAt: new Date()
        })
        .returning();

      req.log.info({ automationConfigId: newConfig.id }, 'automation config created');
      res.status(201).json({ success: true, data: newConfig });
    } catch (err) {
      req.log.error({ err }, 'failed to create automation config');
      next(err);
    }
  }
);

/**
 * PATCH /v1/automations/:id - Actualizar configuración de automatización
 */
router.patch('/:id',
  requireAuth,
  validate({ params: idParamSchema, body: updateAutomationConfigSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const validated = req.body;

      // Verificar que existe
      const [existing] = await db()
        .select()
        .from(automationConfigs)
        .where(eq(automationConfigs.id, id))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: 'Automation config not found' });
      }

      const [updated] = await db()
        .update(automationConfigs)
        .set({
          ...validated,
          updatedAt: new Date()
        })
        .where(eq(automationConfigs.id, id))
        .returning();

      req.log.info({ automationConfigId: id }, 'automation config updated');
      res.json({ success: true, data: updated });
    } catch (err) {
      req.log.error({ err }, 'failed to update automation config');
      next(err);
    }
  }
);

/**
 * DELETE /v1/automations/:id - Eliminar configuración de automatización
 */
router.delete('/:id',
  requireAuth,
  validate({ params: idParamSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Verificar que existe
      const [existing] = await db()
        .select()
        .from(automationConfigs)
        .where(eq(automationConfigs.id, id))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: 'Automation config not found' });
      }

      await db()
        .delete(automationConfigs)
        .where(eq(automationConfigs.id, id));

      req.log.info({ automationConfigId: id }, 'automation config deleted');
      res.json({ success: true });
    } catch (err) {
      req.log.error({ err }, 'failed to delete automation config');
      next(err);
    }
  }
);

export default router;

