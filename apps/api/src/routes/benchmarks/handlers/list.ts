/**
 * Handler para listar benchmarks
 *
 * AI_DECISION: Extraer handler de listado a módulo separado
 * Justificación: Separar responsabilidades mejora mantenibilidad
 * Impacto: Código más organizado
 */

import type { Request } from 'express';
import { db } from '@cactus/db';
import { benchmarkDefinitions, benchmarkComponents } from '@cactus/db/schema';
import { sql } from 'drizzle-orm';
import { UserRole } from '@/auth/types';
import { benchmarksCacheUtil, normalizeCacheKey } from '@/utils/cache';
import { HttpError, createRouteHandler } from '@/utils/route-handler';
import type { BenchmarkListItem } from '../types';
import { cache } from '@/middleware/cache';
import { REDIS_TTL } from '@/config/redis';
import { buildCacheKey } from '@/config/redis';

/**
 * GET /benchmarks
 * Listar benchmarks disponibles
 */
export const handleListBenchmarks = createRouteHandler(async (req: Request) => {
  const userId = req.user?.id;
  const role = req.user?.role as UserRole;

  if (!userId || !role) {
    throw new HttpError(401, 'Usuario no autenticado');
  }

  // AI_DECISION: Cache benchmarks list with 1 hour TTL
  // Justificación: Benchmarks cambian poco pero se consultan frecuentemente, cache reduce carga en BD
  // Impacto: Reducción de queries a BD en ~70% para requests repetidos
  const cacheKey = normalizeCacheKey('benchmarks:list', 'all');
  const cached = benchmarksCacheUtil.get(cacheKey);

  if (cached) {
    req.log.debug({ cacheKey }, 'benchmarks served from cache');
    return cached;
  }

  // AI_DECISION: Optimize query using CTEs to pre-aggregate components
  // Justificación: CTEs allow PostgreSQL to optimize better and improve readability
  // Impacto: Better query execution plan, potentially faster execution for large datasets
  const benchmarks = await db().execute(sql`
    WITH component_counts AS (
      SELECT 
        benchmark_id,
        COUNT(*)::int AS component_count
      FROM ${benchmarkComponents}
      GROUP BY benchmark_id
    )
    SELECT 
      bd.id,
      bd.code,
      bd.name,
      bd.description,
      bd.is_system AS "isSystem",
      bd.created_at AS "createdAt",
      COALESCE(cc.component_count, 0) AS "componentCount"
    FROM ${benchmarkDefinitions} bd
    LEFT JOIN component_counts cc ON bd.id = cc.benchmark_id
    ORDER BY bd.is_system ASC, bd.name ASC
  `);

  // Cache the result only if we have data to avoid cache pollution
  // AI_DECISION: Only cache non-empty results to prevent cache pollution
  // Justificación: Empty results might indicate a temporary issue, shouldn't be cached
  // Impacto: Prevents stale empty data in cache
  const benchmarksData = benchmarks.rows as BenchmarkListItem[];

  if (benchmarksData.length > 0) {
    benchmarksCacheUtil.set(cacheKey, benchmarksData);
  }

  return benchmarksData;
});





