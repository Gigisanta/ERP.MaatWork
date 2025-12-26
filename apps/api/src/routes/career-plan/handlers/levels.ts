import { type Request, type Response } from 'express';
import { db, careerPlanLevels } from '@maatwork/db';
import { eq, asc } from 'drizzle-orm';
import { createRouteHandler, createAsyncHandler, HttpError } from '../../../utils/route-handler';
import { z } from 'zod';
import { createLevelSchema, updateLevelSchema } from '../schemas';
import { idParamSchema } from '../../../utils/validation/common-schemas';

export const handleListLevels = createRouteHandler(async (req: Request) => {
  const levels = await db()
    .select()
    .from(careerPlanLevels)
    .orderBy(asc(careerPlanLevels.levelNumber));

  return levels;
});

export const handleGetLevel = createRouteHandler(async (req: Request) => {
  const { id } = req.params as z.infer<typeof idParamSchema>;
  const [level] = await db()
    .select()
    .from(careerPlanLevels)
    .where(eq(careerPlanLevels.id, id))
    .limit(1);

  if (!level) {
    throw new HttpError(404, 'Career plan level not found');
  }

  return level;
});

export const handleCreateLevel = createAsyncHandler(async (req: Request, res: Response) => {
  const data = req.body as z.infer<typeof createLevelSchema>;

  // Verificar que levelNumber no esté duplicado
  const [existing] = await db()
    .select()
    .from(careerPlanLevels)
    .where(eq(careerPlanLevels.levelNumber, data.levelNumber))
    .limit(1);

  if (existing) {
    throw new HttpError(409, 'Level number already exists');
  }

  const [newLevel] = await db()
    .insert(careerPlanLevels)
    .values({
      category: data.category,
      level: data.level,
      levelNumber: data.levelNumber,
      index: data.index,
      percentage: data.percentage,
      annualGoalUsd: data.annualGoalUsd,
      isActive: data.isActive ?? true,
    })
    .returning();

  req.log?.info({ levelId: newLevel.id }, 'career plan level created');

  return res.status(201).json({
    success: true,
    data: newLevel,
    requestId: req.requestId,
  });
});

export const handleUpdateLevel = createRouteHandler(async (req: Request) => {
  const { id } = req.params as z.infer<typeof idParamSchema>;
  const data = req.body as z.infer<typeof updateLevelSchema>;

  // Verificar que el nivel existe
  const [existing] = await db()
    .select()
    .from(careerPlanLevels)
    .where(eq(careerPlanLevels.id, id))
    .limit(1);

  if (!existing) {
    throw new HttpError(404, 'Career plan level not found');
  }

  // Si se está actualizando levelNumber, verificar que no esté duplicado
  if (data.levelNumber !== undefined && data.levelNumber !== existing.levelNumber) {
    const [duplicate] = await db()
      .select()
      .from(careerPlanLevels)
      .where(eq(careerPlanLevels.levelNumber, data.levelNumber))
      .limit(1);

    if (duplicate) {
      throw new HttpError(409, 'Level number already exists');
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

  const [updatedLevel] = await db()
    .update(careerPlanLevels)
    .set(updateData)
    .where(eq(careerPlanLevels.id, id))
    .returning();

  req.log?.info({ levelId: id }, 'career plan level updated');

  return updatedLevel;
});

export const handleDeleteLevel = createRouteHandler(async (req: Request) => {
  const { id } = req.params as z.infer<typeof idParamSchema>;

  // Verificar que el nivel existe
  const [existing] = await db()
    .select()
    .from(careerPlanLevels)
    .where(eq(careerPlanLevels.id, id))
    .limit(1);

  if (!existing) {
    throw new HttpError(404, 'Career plan level not found');
  }

  await db().delete(careerPlanLevels).where(eq(careerPlanLevels.id, id));

  req.log?.info({ levelId: id }, 'career plan level deleted');

  return { success: true };
});

