/**
 * Admin Memory Dashboard
 *
 * GET /v1/admin/memory - Memory usage dashboard with recommendations
 *
 * AI_DECISION: Create memory dashboard endpoint for monitoring and diagnostics
 * Justificación: Provides visibility into memory usage, cache sizes, and recommendations
 * Impacto: Better diagnostics and monitoring of memory issues
 */

import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middlewares';
import { createRouteHandler } from '../utils/route-handler';

const router = Router();

/**
 * GET /v1/admin/memory
 * Get memory usage dashboard with recommendations
 */
router.get(
  '/memory',
  requireAuth,
  requireRole(['admin']),
  createRouteHandler(async (req) => {
    const { getCacheHealth } = await import('../utils/performance/cache');
    const { getQueryMetrics } = await import('../utils/database/db-logger');
    const { getEtagCacheStats } = await import('../utils/etag-cache');

    const memUsage = process.memoryUsage();
    const memUsageWithExternal = memUsage as typeof memUsage & { external?: number };
    const cacheHealth = getCacheHealth();
    const queryMetrics = getQueryMetrics();
    const etagCacheStats = getEtagCacheStats();

    // Calculate memory percentages
    const maxHeapSize = 384 * 1024 * 1024; // 384MB from --max-old-space-size
    const heapUsedPercent = (memUsage.heapUsed / maxHeapSize) * 100;
    const rssPercent = (memUsage.rss / maxHeapSize) * 100;

    // Get top memory-consuming queries (estimate based on row count and duration)
    const topQueriesByMemory = queryMetrics.slice(0, 10).map((q) => ({
      operation: q.operationBase,
      count: q.count,
      avgDuration: q.avgDuration,
      estimatedMemoryMB: (q.avgDuration * q.count * 0.001).toFixed(2), // Rough estimate
      p95Duration: q.p95Duration,
      nPlusOneCount: q.nPlusOneCount,
    }));

    // Calculate total cache memory
    const totalCacheMemory = cacheHealth.totalMemoryBytes || 0;
    const maxCacheMemory = cacheHealth.maxMemoryBytes || 0;
    const cacheMemoryPercent = maxCacheMemory > 0 ? (totalCacheMemory / maxCacheMemory) * 100 : 0;

    // Generate recommendations
    const recommendations: string[] = [];

    if (heapUsedPercent > 80) {
      recommendations.push(
        '⚠️ Heap memory usage is above 80%. Consider reducing cache sizes or optimizing queries.'
      );
    }

    if (rssPercent > 80) {
      recommendations.push('⚠️ RSS memory usage is above 80%. Monitor for memory leaks.');
    }

    if (cacheMemoryPercent > 80) {
      recommendations.push(
        '⚠️ Cache memory usage is above 80%. Consider reducing cache TTLs or maxKeys.'
      );
    }

    const nPlusOneQueries = queryMetrics.filter((q) => q.nPlusOneCount > 0);
    if (nPlusOneQueries.length > 0) {
      recommendations.push(
        `⚠️ Found ${nPlusOneQueries.length} queries with N+1 patterns. Consider using batch loading.`
      );
    }

    const slowQueries = queryMetrics.filter((q) => q.p95Duration > 1000);
    if (slowQueries.length > 0) {
      recommendations.push(
        `⚠️ Found ${slowQueries.length} slow queries (p95 > 1s). Consider optimizing these queries.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Memory usage is within healthy limits.');
    }

    return {
      memory: {
        heap: {
          used: memUsage.heapUsed,
          total: memUsage.heapTotal,
          usedMB: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
          totalMB: (memUsage.heapTotal / 1024 / 1024).toFixed(2),
          usedPercent: heapUsedPercent.toFixed(2),
          maxMB: (maxHeapSize / 1024 / 1024).toFixed(2),
        },
        rss: {
          bytes: memUsage.rss,
          mb: (memUsage.rss / 1024 / 1024).toFixed(2),
          percent: rssPercent.toFixed(2),
        },
        external: {
          bytes: memUsageWithExternal.external || 0,
          mb: ((memUsageWithExternal.external || 0) / 1024 / 1024).toFixed(2),
        },
      },
      cache: {
        totalMemoryBytes: totalCacheMemory,
        totalMemoryMB: (totalCacheMemory / 1024 / 1024).toFixed(2),
        maxMemoryBytes: maxCacheMemory,
        maxMemoryMB: (maxCacheMemory / 1024 / 1024).toFixed(2),
        usagePercent: cacheMemoryPercent.toFixed(2),
        caches: Object.entries(cacheHealth)
          .filter(([key]) => key !== 'totalMemoryBytes' && key !== 'maxMemoryBytes')
          .map(([key, stats]) => {
            const s = stats as {
              hits?: number;
              misses?: number;
              hitRate?: number;
              keyCount?: number;
              keys?: number;
              sizeBytes?: number;
              largestValueBytes?: number;
            };
            return {
              name: key,
              hits: s.hits || 0,
              misses: s.misses || 0,
              hitRate: s.hitRate?.toFixed(2) || '0.00',
              keys: s.keyCount || s.keys || 0,
              sizeMB: s.sizeBytes ? (s.sizeBytes / 1024 / 1024).toFixed(2) : '0.00',
              largestValueMB: s.largestValueBytes
                ? (s.largestValueBytes / 1024 / 1024).toFixed(2)
                : '0.00',
            };
          }),
      },
      etagCache: {
        size: etagCacheStats.size,
        maxSize: etagCacheStats.maxSize,
        hitRate: etagCacheStats.hitRate,
      },
      queries: {
        totalTracked: queryMetrics.length,
        topByMemory: topQueriesByMemory,
        nPlusOneCount: nPlusOneQueries.length,
        slowQueriesCount: slowQueries.length,
      },
      recommendations,
      timestamp: new Date().toISOString(),
    };
  })
);

export default router;
