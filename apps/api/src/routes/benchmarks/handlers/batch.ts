/**
 * Handler para obtener componentes de múltiples benchmarks (batch)
 *
 * AI_DECISION: Extraer handler de batch a módulo separado
 * Justificación: Separar responsabilidades mejora mantenibilidad
 * Impacto: Código más organizado
 */

import type { Request } from 'express';
import { db } from '@cactus/db';
import { benchmarkComponents, instruments } from '@cactus/db/schema';
import { eq, sql } from 'drizzle-orm';
import { HttpError } from '../../../utils/route-handler';
import { createRouteHandler } from '../../../utils/route-handler';
import type { BenchmarkComponentBatch } from '../types';

/**
 * GET /benchmarks/components/batch
 * Obtener componentes de múltiples benchmarks (batch)
 * Query params: ids=id1,id2,id3
 */
export const handleBatchComponents = createRouteHandler(async (req: Request) => {
  // AI_DECISION: Validación robusta de IDs en batch endpoint
  // Justificación: Prevenir DoS, validar formato UUID, eliminar duplicados
  // Impacto: Seguridad mejorada, mejor manejo de errores
  const { validateBatchIds, BATCH_LIMITS } = await import('../../../utils/batch-validation');

  const validation = validateBatchIds(req.query.ids as string, {
    maxCount: BATCH_LIMITS.MAX_BENCHMARKS,
    requireUuid: true,
    fieldName: 'ids',
  });

  if (!validation.valid) {
    throw new HttpError(400, validation.errors?.join(', ') || 'Invalid batch request');
  }

  const benchmarkIds = validation.ids;

  // Obtener todos los componentes de todos los benchmarks en una sola query
  const allComponents = await db()
    .select({
      componentId: benchmarkComponents.id,
      benchmarkId: benchmarkComponents.benchmarkId,
      instrumentId: benchmarkComponents.instrumentId,
      weight: benchmarkComponents.weight,
      instrumentSymbol: instruments.symbol,
      instrumentName: instruments.name,
      active: instruments.active,
    })
    .from(benchmarkComponents)
    .innerJoin(instruments, eq(benchmarkComponents.instrumentId, instruments.id))
    .where(sql`${benchmarkComponents.benchmarkId} = ANY(${benchmarkIds})`);

  // Agrupar componentes por benchmarkId
  type ComponentItem = {
    id: string;
    instrumentId: string;
    weight: number;
    instrumentSymbol: string;
    instrumentName: string;
    active: boolean;
  };
  const componentsByBenchmark: Record<string, ComponentItem[]> = {};
  benchmarkIds.forEach((id) => {
    componentsByBenchmark[id] = [];
  });

  allComponents.forEach((comp: BenchmarkComponentBatch) => {
    if (componentsByBenchmark[comp.benchmarkId]) {
      componentsByBenchmark[comp.benchmarkId].push({
        id: comp.componentId,
        instrumentId: comp.instrumentId,
        // AI_DECISION: Convertir weight de string a number (numeric de PostgreSQL retorna string)
        // Justificación: Drizzle retorna numeric como string, necesitamos convertir a number para el tipo
        // Impacto: Cumple con el tipo esperado por BenchmarkComponentBatch
        weight: typeof comp.weight === 'string' ? parseFloat(comp.weight) : comp.weight,
        instrumentSymbol: comp.instrumentSymbol,
        instrumentName: comp.instrumentName,
        active: comp.active,
      });
    }
  });

  return componentsByBenchmark;
});
