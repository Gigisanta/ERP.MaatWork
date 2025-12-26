/**
 * Handlers CRUD para benchmarks
 *
 * AI_DECISION: Extraer handlers CRUD a módulo separado
 * Justificación: Separar responsabilidades mejora mantenibilidad
 * Impacto: Código más organizado
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '@maatwork/db';
import { benchmarkDefinitions, benchmarkComponents, instruments } from '@maatwork/db/schema';
import { eq, sql } from 'drizzle-orm';
import { benchmarksCacheUtil } from '../../../utils/performance/cache';
import { createAsyncHandler, createRouteHandler, HttpError } from '../../../utils/route-handler';
import { createBenchmarkSchema, updateBenchmarkSchema } from '../schemas';

/**
 * POST /benchmarks
 * Crear benchmark custom (solo admin)
 */
export const handleCreateBenchmark = createAsyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const validated = req.body as z.infer<typeof createBenchmarkSchema>;
  const { code, name, description, components } = validated;

  // Verificar que el código sea único
  const existingBenchmark = await db()
    .select({ id: benchmarkDefinitions.id })
    .from(benchmarkDefinitions)
    .where(eq(benchmarkDefinitions.code, code))
    .limit(1);

  if (existingBenchmark.length > 0) {
    throw new HttpError(400, 'El código del benchmark ya existe');
  }

  // Verificar que los instrumentos existen si se proporcionan componentes
  if (components && components.length > 0) {
    const instrumentIds = components.map((comp) => comp.instrumentId);
    const existingInstruments = await db()
      .select({ id: instruments.id })
      .from(instruments)
      .where(sql`${instruments.id} = ANY(${instrumentIds})`);

    if (existingInstruments.length !== instrumentIds.length) {
      throw new HttpError(400, 'Algunos instrumentos no existen');
    }
  }

  // Crear benchmark
  const [benchmark] = await db()
    .insert(benchmarkDefinitions)
    .values({
      code,
      name,
      description,
      isSystem: false,
      createdByUserId: userId,
    })
    .returning();

  // Crear componentes si se proporcionan
  if (components && components.length > 0) {
    await db()
      .insert(benchmarkComponents)
      .values(
        components.map((comp) => ({
          benchmarkId: benchmark.id,
          instrumentId: comp.instrumentId,
          weight: comp.weight,
        }))
      );
  }

  // Invalidate cache when benchmark is created
  benchmarksCacheUtil.clear();

  req.log.info({ benchmarkId: benchmark.id }, 'benchmark created');
  return res.status(201).json({ success: true, data: benchmark, requestId: req.requestId });
});

/**
 * PUT /benchmarks/:id
 * Actualizar benchmark (solo admin, solo custom)
 */
export const handleUpdateBenchmark = createRouteHandler(async (req: Request) => {
  const benchmarkId = req.params.id;
  const validated = req.body as z.infer<typeof updateBenchmarkSchema>;
  const { name, description } = validated;

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
    throw new HttpError(403, 'No se pueden editar benchmarks del sistema');
  }

  // Actualizar benchmark
  const [updatedBenchmark] = await db()
    .update(benchmarkDefinitions)
    .set({
      name,
      description,
    })
    .where(eq(benchmarkDefinitions.id, benchmarkId))
    .returning();

  // Invalidate cache when benchmark is updated
  benchmarksCacheUtil.clear();

  req.log.info({ benchmarkId }, 'benchmark updated');
  return updatedBenchmark;
});

/**
 * DELETE /benchmarks/:id
 * Eliminar benchmark (solo admin, solo custom)
 */
export const handleDeleteBenchmark = createRouteHandler(async (req: Request) => {
  const benchmarkId = req.params.id;

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
    throw new HttpError(403, 'No se pueden eliminar benchmarks del sistema');
  }

  // Eliminar benchmark (los componentes se eliminan por CASCADE)
  await db().delete(benchmarkDefinitions).where(eq(benchmarkDefinitions.id, benchmarkId));

  // Invalidate cache when benchmark is deleted
  benchmarksCacheUtil.clear();

  req.log.info({ benchmarkId }, 'benchmark deleted');
  return { message: 'Benchmark eliminado correctamente' };
});
