/**
 * Health check endpoints
 * 
 * Provides system health information including cache statistics
 * and database connectivity.
 */

import { Router, type Request, type Response } from 'express';
import { db } from '@cactus/db';
import { getCacheHealth } from '../utils/cache';
import { requireAuth, requireRole } from '../auth/middlewares';

const router = Router();

/**
 * GET /health - Basic health check (public)
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Simple database connectivity check
    await db().execute({ sql: 'SELECT 1', args: [] });
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /health/cache - Cache health metrics (admin only)
 * 
 * Returns detailed cache statistics including hit rates and key counts.
 */
router.get('/cache', requireAuth, requireRole(['admin']), async (_req: Request, res: Response) => {
  try {
    const health = getCacheHealth();
    
    res.json({
      success: true,
      data: {
        ...health,
        timestamp: new Date().toISOString(),
        summary: {
          totalHits: health.pipeline.hits + health.instruments.hits + health.benchmarks.hits,
          totalMisses: health.pipeline.misses + health.instruments.misses + health.benchmarks.misses,
          overallHitRate: (
            (health.pipeline.hits + health.instruments.hits + health.benchmarks.hits) /
            (health.pipeline.hits + health.pipeline.misses + 
             health.instruments.hits + health.instruments.misses + 
             health.benchmarks.hits + health.benchmarks.misses)
          ) * 100 || 0,
          totalKeys: health.pipeline.keys + health.instruments.keys + health.benchmarks.keys
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /health/database - Database health check (admin only)
 */
router.get('/database', requireAuth, requireRole(['admin']), async (_req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    await db().execute({ sql: 'SELECT 1', args: [] });
    const responseTime = Date.now() - startTime;

    // Get database size and connection info
    const [dbInfo] = await db().execute({
      sql: `
        SELECT 
          pg_database_size(current_database()) as size,
          current_database() as name,
          version() as version
      `,
      args: []
    }) as Array<{ size: bigint; name: string; version: string }>;

    res.json({
      success: true,
      data: {
        connected: true,
        responseTime: `${responseTime}ms`,
        database: {
          name: dbInfo.name,
          size: `${Number(dbInfo.size) / 1024 / 1024} MB`,
          version: dbInfo.version.split(',')[0] // First line of version
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      connected: false
    });
  }
});

export default router;

