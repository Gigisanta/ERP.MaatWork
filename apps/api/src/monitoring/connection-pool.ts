/**
 * Connection Pool Monitoring
 *
 * AI_DECISION: Implement connection pool monitoring for production health visibility
 * Justificación: Detectar pool exhaustion antes de que cause timeouts y errores
 * Impacto: Mejor visibilidad en health del sistema, alertas tempranas de problemas
 * Referencias: Performance optimization plan - Fase 3
 */

import { db } from '@maatwork/db';
import { logger } from '../utils/logger';

interface PoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

/**
 * Get current connection pool statistics
 */
export function getPoolStats(): PoolStats | null {
  try {
    const dbInstance = db();
    // Access the underlying pg Pool through Drizzle's internal structure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pool = (dbInstance as any).$client;

    if (!pool || typeof pool !== 'object') {
      return null;
    }

    return {
      totalCount: pool.totalCount || 0,
      idleCount: pool.idleCount || 0,
      waitingCount: pool.waitingCount || 0,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get pool stats');
    return null;
  }
}

/**
 * Start monitoring connection pool health
 * Logs stats periodically and alerts on potential issues
 */
export function startPoolMonitoring(intervalMs: number = 60000): NodeJS.Timeout {
  const interval = setInterval(() => {
    const stats = getPoolStats();

    if (!stats) {
      return;
    }

    // Log stats at debug level for normal operation
    logger.debug(
      {
        totalCount: stats.totalCount,
        idleCount: stats.idleCount,
        waitingCount: stats.waitingCount,
        utilization:
          stats.totalCount > 0
            ? Math.round(((stats.totalCount - stats.idleCount) / stats.totalCount) * 100)
            : 0,
      },
      'Connection pool stats'
    );

    // Alert if waiting count is high (potential pool exhaustion)
    if (stats.waitingCount > 5) {
      logger.warn(
        {
          waitingCount: stats.waitingCount,
          totalCount: stats.totalCount,
          idleCount: stats.idleCount,
        },
        'High waiting count in connection pool - consider increasing pool size or investigating slow queries'
      );
    }

    // Alert if pool is near capacity
    const utilization =
      stats.totalCount > 0 ? (stats.totalCount - stats.idleCount) / stats.totalCount : 0;

    if (utilization > 0.9) {
      logger.warn(
        {
          utilization: Math.round(utilization * 100),
          totalCount: stats.totalCount,
          idleCount: stats.idleCount,
        },
        'Connection pool near capacity - may need to scale'
      );
    }
  }, intervalMs);

  // Return interval so it can be cleared if needed
  return interval;
}

/**
 * Stop pool monitoring
 */
export function stopPoolMonitoring(interval: NodeJS.Timeout): void {
  clearInterval(interval);
}
