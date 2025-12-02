/**
 * Handler para obtener componentes de múltiples benchmarks (batch)
 *
 * AI_DECISION: Extraer handler de batch a módulo separado
 * Justificación: Separar responsabilidades mejora mantenibilidad
 * Impacto: Código más organizado
 */

import type { Request, Response } from 'express';
import { db } from '@cactus/db';
import { benchmarkComponents, instruments } from '@cactus/db/schema';
import { eq, sql } from 'drizzle-orm';
import { UserRole } from '../../../auth/types';
import type { BenchmarkComponentBatch } from '../types';

/**
 * GET /benchmarks/components/batch
 * Obtener componentes de múltiples benchmarks (batch)
 * Query params: ids=id1,id2,id3
 */
export async function handleBatchComponents(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;

    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

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
      return res.status(400).json({
        error: 'Invalid batch request',
        details: validation.errors,
      });
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
    const componentsByBenchmark: Record<string, any[]> = {};
    benchmarkIds.forEach((id) => {
      componentsByBenchmark[id] = [];
    });

    allComponents.forEach((comp: BenchmarkComponentBatch) => {
      if (componentsByBenchmark[comp.benchmarkId]) {
        componentsByBenchmark[comp.benchmarkId].push({
          id: comp.componentId,
          instrumentId: comp.instrumentId,
          weight: comp.weight,
          instrumentSymbol: comp.instrumentSymbol,
          instrumentName: comp.instrumentName,
          active: comp.active,
        });
      }
    });

    res.json({
      success: true,
      data: componentsByBenchmark,
    });
  } catch (error) {
    req.log.error({ error }, 'Error fetching benchmark components batch');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
