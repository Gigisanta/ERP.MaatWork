import { Router } from 'express';
import { z } from 'zod';
import { db, careerPlanLevels } from '@cactus/db';
import { eq, asc } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth/middlewares';
import { validate } from '../utils/validation';
import { uuidSchema } from '../utils/common-schemas';
import { calculateUserCareerProgress } from '../utils/career-plan';
import type { Request, Response, NextFunction } from 'express';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

const createLevelSchema = z.object({
  category: z.string().min(1).max(100),
  level: z.string().min(1).max(100),
  levelNumber: z.number().int().positive(),
  index: z.union([z.string(), z.number()]).transform((val) => {
    if (typeof val === 'string') {
      return val;
    }
    return val.toString();
  }),
  percentage: z.union([z.string(), z.number()]).transform((val) => {
    if (typeof val === 'string') {
      return val;
    }
    return val.toString();
  }),
  annualGoalUsd: z.number().int().positive(),
  isActive: z.boolean().optional().default(true)
});

const updateLevelSchema = z.object({
  category: z.string().min(1).max(100).optional(),
  level: z.string().min(1).max(100).optional(),
  levelNumber: z.number().int().positive().optional(),
  index: z.union([z.string(), z.number()]).transform((val) => {
    if (typeof val === 'string') {
      return val;
    }
    return val.toString();
  }).optional(),
  percentage: z.union([z.string(), z.number()]).transform((val) => {
    if (typeof val === 'string') {
      return val;
    }
    return val.toString();
  }).optional(),
  annualGoalUsd: z.number().int().positive().optional(),
  isActive: z.boolean().optional()
});

const idParamsSchema = z.object({ id: uuidSchema });

// ==========================================================
// Routes
// ==========================================================

// GET /career-plan/levels - Listar todos los niveles (ordenados por levelNumber)
router.get('/levels', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dbi = db();
    const levels = await dbi
      .select()
      .from(careerPlanLevels)
      .orderBy(asc(careerPlanLevels.levelNumber));

    res.json({ success: true, data: levels });
  } catch (err) {
    req.log?.error({ err }, 'failed to list career plan levels');
    next(err);
  }
});

// GET /career-plan/levels/:id - Obtener nivel específico
router.get(
  '/levels/:id',
  requireAuth,
  validate({ params: idParamsSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as z.infer<typeof idParamsSchema>;
      const dbi = db();
      const [level] = await dbi
        .select()
        .from(careerPlanLevels)
        .where(eq(careerPlanLevels.id, id))
        .limit(1);

      if (!level) {
        return res.status(404).json({ error: 'Career plan level not found' });
      }

      res.json({ success: true, data: level });
    } catch (err) {
      req.log?.error({ err, levelId: req.params.id }, 'failed to get career plan level');
      next(err);
    }
  }
);

// POST /career-plan/levels - Crear nivel (solo admin)
router.post(
  '/levels',
  requireAuth,
  requireRole(['admin']),
  validate({ body: createLevelSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dbi = db();
      const data = req.body as z.infer<typeof createLevelSchema>;

      // Verificar que levelNumber no esté duplicado
      const [existing] = await dbi
        .select()
        .from(careerPlanLevels)
        .where(eq(careerPlanLevels.levelNumber, data.levelNumber))
        .limit(1);

      if (existing) {
        return res.status(409).json({ error: 'Level number already exists' });
      }

      const [newLevel] = await dbi
        .insert(careerPlanLevels)
        .values({
          category: data.category,
          level: data.level,
          levelNumber: data.levelNumber,
          index: data.index,
          percentage: data.percentage,
          annualGoalUsd: data.annualGoalUsd,
          isActive: data.isActive ?? true
        })
        .returning();

      req.log?.info({ levelId: newLevel.id }, 'career plan level created');
      res.status(201).json({ success: true, data: newLevel });
    } catch (err) {
      req.log?.error({ err }, 'failed to create career plan level');
      next(err);
    }
  }
);

// PUT /career-plan/levels/:id - Actualizar nivel (solo admin)
router.put(
  '/levels/:id',
  requireAuth,
  requireRole(['admin']),
  validate({ params: idParamsSchema, body: updateLevelSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as z.infer<typeof idParamsSchema>;
      const data = req.body as z.infer<typeof updateLevelSchema>;
      const dbi = db();

      // Verificar que el nivel existe
      const [existing] = await dbi
        .select()
        .from(careerPlanLevels)
        .where(eq(careerPlanLevels.id, id))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: 'Career plan level not found' });
      }

      // Si se está actualizando levelNumber, verificar que no esté duplicado
      if (data.levelNumber !== undefined && data.levelNumber !== existing.levelNumber) {
        const [duplicate] = await dbi
          .select()
          .from(careerPlanLevels)
          .where(eq(careerPlanLevels.levelNumber, data.levelNumber))
          .limit(1);

        if (duplicate) {
          return res.status(409).json({ error: 'Level number already exists' });
        }
      }

      const updateData: Partial<typeof existing> = {};
      if (data.category !== undefined) updateData.category = data.category;
      if (data.level !== undefined) updateData.level = data.level;
      if (data.levelNumber !== undefined) updateData.levelNumber = data.levelNumber;
      if (data.index !== undefined) updateData.index = data.index;
      if (data.percentage !== undefined) updateData.percentage = data.percentage;
      if (data.annualGoalUsd !== undefined) updateData.annualGoalUsd = data.annualGoalUsd;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      updateData.updatedAt = new Date();

      const [updatedLevel] = await dbi
        .update(careerPlanLevels)
        .set(updateData)
        .where(eq(careerPlanLevels.id, id))
        .returning();

      req.log?.info({ levelId: id }, 'career plan level updated');
      res.json({ success: true, data: updatedLevel });
    } catch (err) {
      req.log?.error({ err, levelId: req.params.id }, 'failed to update career plan level');
      next(err);
    }
  }
);

// DELETE /career-plan/levels/:id - Eliminar nivel (solo admin)
router.delete(
  '/levels/:id',
  requireAuth,
  requireRole(['admin']),
  validate({ params: idParamsSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as z.infer<typeof idParamsSchema>;
      const dbi = db();

      // Verificar que el nivel existe
      const [existing] = await dbi
        .select()
        .from(careerPlanLevels)
        .where(eq(careerPlanLevels.id, id))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: 'Career plan level not found' });
      }

      await dbi.delete(careerPlanLevels).where(eq(careerPlanLevels.id, id));

      req.log?.info({ levelId: id }, 'career plan level deleted');
      res.json({ success: true });
    } catch (err) {
      req.log?.error({ err, levelId: req.params.id }, 'failed to delete career plan level');
      next(err);
    }
  }
);

// GET /career-plan/user-progress - Calcular progreso del usuario actual
router.get('/user-progress', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const progress = await calculateUserCareerProgress(userId, userRole);

    res.json({ success: true, data: progress });
  } catch (err) {
    req.log?.error({ err, userId: req.user?.id }, 'failed to calculate user career progress');
    next(err);
  }
});

export default router;

