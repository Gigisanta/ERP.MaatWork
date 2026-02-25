/**
 * Health check endpoints
 *
 * Provides system health information including cache statistics
 * and database connectivity.
 */

import { Router, type Request, type Response } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '@maatwork/db';
import { getCacheHealth } from '../utils/performance/cache';
import { requireAuth, requireRole } from '../auth/middlewares';
import { createRouteHandler, createAsyncHandler, HttpError } from '../utils/route-handler';

const router = Router();

/**
 * GET /health - Basic health check (public)
 *
 * AI_DECISION: Mantener createAsyncHandler para formato de respuesta personalizado
 * Justificación: Health check usa formato específico { status, timestamp, database } que difiere del formato estándar { success, data }
 * Impacto: Mantiene compatibilidad con sistemas de monitoreo que esperan este formato
 */
router.get(
  '/',
  createAsyncHandler(async (_req: Request, res: Response) => {
    try {
      // Simple database connectivity check
      const result = await db().execute(sql`SELECT 1`);

      // Optional sanity check on the result shape
      const ok = (result.rows[0] as { '?column?'?: number } | undefined)?.['?column?'] === 1;

      return res.json({
        status: ok ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        database: ok ? 'connected' : 'unexpected-result',
      });
    } catch (error) {
      return res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * GET /health/cache - Cache health metrics (admin only)
 *
 * Returns detailed cache statistics including hit rates and key counts.
 */
router.get(
  '/cache',
  requireAuth,
  requireRole(['admin']),
  createRouteHandler(async (_req: Request) => {
    const health = getCacheHealth();

    return {
      ...health,
      timestamp: new Date().toISOString(),
      summary: {
        totalHits: health.pipeline.hits + health.instruments.hits + health.benchmarks.hits,
        totalMisses: health.pipeline.misses + health.instruments.misses + health.benchmarks.misses,
        overallHitRate:
          ((health.pipeline.hits + health.instruments.hits + health.benchmarks.hits) /
            (health.pipeline.hits +
              health.pipeline.misses +
              health.instruments.hits +
              health.instruments.misses +
              health.benchmarks.hits +
              health.benchmarks.misses)) *
            100 || 0,
        totalKeys: health.pipeline.keys + health.instruments.keys + health.benchmarks.keys,
      },
    };
  })
);

/**
 * GET /health/database - Database health check (admin only)
 *
 * AI_DECISION: Migrar a createRouteHandler ya que retorna formato estándar { success, data }
 * Justificación: El handler retorna formato estándar, no necesita control directo de res
 * Impacto: Consistencia con otros endpoints y manejo automático de errores
 */
router.get(
  '/database',
  requireAuth,
  requireRole(['admin']),
  createRouteHandler(async (_req: Request) => {
    const startTime = Date.now();
    await db().execute(sql`SELECT 1`);
    const responseTime = Date.now() - startTime;

    // Get database size and connection info
    const dbInfoResult = await db().execute(sql`
      SELECT 
        pg_database_size(current_database()) as size,
        current_database() as name,
        version() as version
    `);

    const dbInfo = dbInfoResult.rows[0] as { size: bigint; name: string; version: string };

    return {
      connected: true,
      responseTime: `${responseTime}ms`,
      database: {
        name: dbInfo.name,
        size: `${Number(dbInfo.size) / 1024 / 1024} MB`,
        version: dbInfo.version.split(',')[0], // First line of version
      },
      timestamp: new Date().toISOString(),
    };
  })
);

export default router;
