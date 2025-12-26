/**
 * Handlers para componentes de benchmarks
 *
 * AI_DECISION: Extraer handlers de componentes a módulo separado
 * Justificación: Separar responsabilidades mejora mantenibilidad
 * Impacto: Código más organizado
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '@maatwork/db';
import { benchmarkDefinitions, benchmarkComponents, instruments } from '@maatwork/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  benchmarksCacheUtil,
  benchmarkComponentsCacheUtil,
  normalizeCacheKey,
} from '../../../utils/performance/cache';
import { createAsyncHandler, createRouteHandler, HttpError } from '@/utils/route-handler';
import { addComponentSchema, updateComponentSchema } from '../schemas';
import type { ComponentWithWeight } from '../types';

/**
 * POST /benchmarks/:id/components
 * Agregar componente a benchmark
 */
export const handleAddComponent = createAsyncHandler(async (req: Request, res: Response) => {
  const benchmarkId = req.params.id;
  const validated = req.body as z.infer<typeof addComponentSchema>;
  const { instrumentId, weight } = validated;

  // Verificar que el benchmark existe y es custom
  const benchmark = await db()
    .select({ id: benchmarkDefinitions.id, isSystem: benchmarkDefinitions.isSystem })
    .from(benchmarkDefinitions)
    .where(eq(benchmarkDefinitions.id, benchmarkId))
    .limit(1);

  if (benchmark.length === 0) {
    throw new HttpError(404, 'Benchmark no encontrado');
  }

  if (benchmark[0].isSystem) {
    throw new HttpError(403, 'No se pueden editar componentes de benchmarks del sistema');
  }

  // Verificar que el instrumento existe
  const instrument = await db()
    .select({ id: instruments.id })
    .from(instruments)
    .where(eq(instruments.id, instrumentId))
    .limit(1);

  if (instrument.length === 0) {
    throw new HttpError(404, 'Instrumento no encontrado');
  }

  // Verificar que la suma de pesos no exceda 1.0
  const existingComponents = await db()
    .select({ weight: benchmarkComponents.weight })
    .from(benchmarkComponents)
    .where(eq(benchmarkComponents.benchmarkId, benchmarkId));

  const currentTotal = existingComponents.reduce(
    (sum: number, comp: ComponentWithWeight) => sum + Number(comp.weight),
    0
  );
  if (currentTotal + weight > 1.0) {
    throw new HttpError(
      400,
      `La suma de pesos excedería 100%. Peso actual: ${(currentTotal * 100).toFixed(2)}%, nuevo peso: ${(weight * 100).toFixed(2)}%`
    );
  }

  // Crear componente
  const [component] = await db()
    .insert(benchmarkComponents)
    .values({
      benchmarkId,
      instrumentId,
      weight,
    })
    .returning();

  // Invalidate cache when component is added
  benchmarksCacheUtil.clear();
  benchmarkComponentsCacheUtil.delete(normalizeCacheKey('benchmark', 'components', benchmarkId));

  req.log.info({ componentId: component.id, benchmarkId }, 'benchmark component added');
  return res.status(201).json({ success: true, data: component, requestId: req.requestId });
});

/**
 * PUT /benchmarks/:id/components/:componentId
 * Actualizar componente de benchmark
 */
export const handleUpdateComponent = createRouteHandler(async (req: Request) => {
  const { id: benchmarkId, componentId } = req.params;
  const validated = req.body as z.infer<typeof updateComponentSchema>;
  const { weight } = validated;

  // Verificar que el benchmark existe y es custom
  const benchmark = await db()
    .select({ id: benchmarkDefinitions.id, isSystem: benchmarkDefinitions.isSystem })
    .from(benchmarkDefinitions)
    .where(eq(benchmarkDefinitions.id, benchmarkId))
    .limit(1);

  if (benchmark.length === 0) {
    throw new HttpError(404, 'Benchmark no encontrado');
  }

  if (benchmark[0].isSystem) {
    throw new HttpError(403, 'No se pueden editar componentes de benchmarks del sistema');
  }

  // Obtener peso actual del componente
  const currentComponent = await db()
    .select({ weight: benchmarkComponents.weight })
    .from(benchmarkComponents)
    .where(
      and(eq(benchmarkComponents.id, componentId), eq(benchmarkComponents.benchmarkId, benchmarkId))
    )
    .limit(1);

  if (currentComponent.length === 0) {
    throw new HttpError(404, 'Componente no encontrado');
  }

  // Verificar que la suma de pesos no exceda 1.0
  const existingComponents = await db()
    .select({ weight: benchmarkComponents.weight })
    .from(benchmarkComponents)
    .where(eq(benchmarkComponents.benchmarkId, benchmarkId));

  const currentTotal = existingComponents.reduce(
    (sum: number, comp: ComponentWithWeight) => sum + Number(comp.weight),
    0
  );
  const currentWeight = Number(currentComponent[0].weight);
  const newTotal = currentTotal - currentWeight + weight;

  if (newTotal > 1.0) {
    throw new HttpError(
      400,
      `La suma de pesos excedería 100%. Peso actual total: ${(currentTotal * 100).toFixed(2)}%, nuevo total: ${(newTotal * 100).toFixed(2)}%`
    );
  }

  // Actualizar componente
  const [updatedComponent] = await db()
    .update(benchmarkComponents)
    .set({
      weight,
    })
    .where(
      and(eq(benchmarkComponents.id, componentId), eq(benchmarkComponents.benchmarkId, benchmarkId))
    )
    .returning();

  // Invalidate cache when component is updated
  benchmarksCacheUtil.clear();
  benchmarkComponentsCacheUtil.delete(normalizeCacheKey('benchmark', 'components', benchmarkId));

  req.log.info({ componentId, benchmarkId }, 'benchmark component updated');
  return updatedComponent;
});

/**
 * DELETE /benchmarks/:id/components/:componentId
 * Eliminar componente de benchmark
 */
export const handleDeleteComponent = createRouteHandler(async (req: Request) => {
  const { id: benchmarkId, componentId } = req.params;

  // Verificar que el benchmark existe y es custom
  const benchmark = await db()
    .select({ id: benchmarkDefinitions.id, isSystem: benchmarkDefinitions.isSystem })
    .from(benchmarkDefinitions)
    .where(eq(benchmarkDefinitions.id, benchmarkId))
    .limit(1);

  if (benchmark.length === 0) {
    throw new HttpError(404, 'Benchmark no encontrado');
  }

  if (benchmark[0].isSystem) {
    throw new HttpError(403, 'No se pueden eliminar componentes de benchmarks del sistema');
  }

  // Eliminar componente
  await db()
    .delete(benchmarkComponents)
    .where(
      and(eq(benchmarkComponents.id, componentId), eq(benchmarkComponents.benchmarkId, benchmarkId))
    );

  // Invalidate cache when component is deleted
  benchmarksCacheUtil.clear();
  benchmarkComponentsCacheUtil.delete(normalizeCacheKey('benchmark', 'components', benchmarkId));

  req.log.info({ componentId, benchmarkId }, 'benchmark component deleted');
  return { message: 'Componente eliminado correctamente' };
});
