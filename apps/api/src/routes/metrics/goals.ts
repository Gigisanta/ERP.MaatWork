/**
 * Metrics Goals Routes
 *
 * Handles monthly goals operations
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, monthlyGoals } from '@cactus/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../../auth/middlewares';
import { z } from 'zod';
import { validate } from '../../utils/validation';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

const metricsQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(12))
    .optional(),
  year: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(2000)).optional(),
});

const saveGoalsSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  newProspectsGoal: z.number().int().min(0),
  firstMeetingsGoal: z.number().int().min(0),
  secondMeetingsGoal: z.number().int().min(0),
  newClientsGoal: z.number().int().min(0),
});

// ==========================================================
// Routes
// ==========================================================

/**
 * GET /metrics/goals - Obtener objetivos mensuales
 */
router.get(
  '/goals',
  requireAuth,
  validate({ query: metricsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { month, year } = req.query;

      const now = new Date();
      const targetMonth = month ? Number(month) : now.getMonth() + 1;
      const targetYear = year ? Number(year) : now.getFullYear();

      const [goal] = await db()
        .select()
        .from(monthlyGoals)
        .where(and(eq(monthlyGoals.month, targetMonth), eq(monthlyGoals.year, targetYear)))
        .limit(1);

      res.json({
        success: true,
        data: goal || null,
      });
    } catch (err) {
      req.log.error({ err }, 'failed to get monthly goals');
      next(err);
    }
  }
);

/**
 * POST /metrics/goals - Guardar/actualizar objetivos mensuales
 */
router.post(
  '/goals',
  requireAuth,
  validate({ body: saveGoalsSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = req.body;

      // Intentar actualizar objetivo existente
      const [existing] = await db()
        .select()
        .from(monthlyGoals)
        .where(and(eq(monthlyGoals.month, validated.month), eq(monthlyGoals.year, validated.year)))
        .limit(1);

      let result;
      if (existing) {
        // Actualizar
        [result] = await db()
          .update(monthlyGoals)
          .set({
            newProspectsGoal: validated.newProspectsGoal,
            firstMeetingsGoal: validated.firstMeetingsGoal,
            secondMeetingsGoal: validated.secondMeetingsGoal,
            newClientsGoal: validated.newClientsGoal,
            updatedAt: new Date(),
          })
          .where(eq(monthlyGoals.id, existing.id))
          .returning();
      } else {
        // Crear nuevo
        [result] = await db()
          .insert(monthlyGoals)
          .values({
            month: validated.month,
            year: validated.year,
            newProspectsGoal: validated.newProspectsGoal,
            firstMeetingsGoal: validated.firstMeetingsGoal,
            secondMeetingsGoal: validated.secondMeetingsGoal,
            newClientsGoal: validated.newClientsGoal,
          })
          .returning();
      }

      req.log.info({ month: validated.month, year: validated.year }, 'monthly goals saved');
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      req.log.error({ err }, 'failed to save monthly goals');
      next(err);
    }
  }
);

export default router;
