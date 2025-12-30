/**
 * Admin Performance Metrics Endpoint
 *
 * AI_DECISION: Create dedicated endpoint for performance metrics
 * Justificación: Centralizar métricas de performance para dashboard de admin
 * Impacto: Mejor visibilidad en health del sistema
 * Referencias: Performance optimization plan - Fase 4
 */

import { Router } from 'express';
import { requireAuth, requireRole } from '../../auth/middlewares';
import { createRouteHandler } from '../../utils/route-handler';
import { getPoolStats } from '../../monitoring/connection-pool';

const router = Router();

/**
 * GET /admin/performance/pool - Get connection pool stats
 */
router.get(
  '/pool',
  requireAuth,
  requireRole(['admin']),
  createRouteHandler(async (req) => {
    const stats = getPoolStats();

    if (!stats) {
      return {
        available: false,
        message: 'Pool stats not available',
      };
    }

    const utilization =
      stats.totalCount > 0
        ? Math.round(((stats.totalCount - stats.idleCount) / stats.totalCount) * 100)
        : 0;

    return {
      available: true,
      totalCount: stats.totalCount,
      idleCount: stats.idleCount,
      waitingCount: stats.waitingCount,
      activeCount: stats.totalCount - stats.idleCount,
      utilization,
      health: stats.waitingCount > 5 ? 'warning' : utilization > 90 ? 'warning' : 'healthy',
    };
  })
);

export default router;
