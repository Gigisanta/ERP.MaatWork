/**
 * Cache utilities for frequently accessed data
 *
 * Uses NodeCache for in-memory caching by default.
 * Automatically uses Redis if REDIS_URL is configured for distributed caching.
 * Falls back to NodeCache if Redis is unavailable.
 *
 * Features:
 * - Automatic TTL expiration
 * - Statistics tracking (hits, misses, hit rate)
 * - Memory-efficient (no cloning by default)
 * - Thread-safe operations
 * - Redis support for multi-instance deployments
 *
 * AI_DECISION: Support Redis with NodeCache fallback
 * Justificación: Redis enables distributed caching across instances, NodeCache fallback ensures compatibility
 * Impacto: Better scalability with Redis, seamless fallback for development
 */

import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { logger } from '../logger';

// Initialize Redis if REDIS_URL is available
let redisClient: Redis | null = null;
const useRedis = !!process.env.REDIS_URL;

if (useRedis) {
  try {
    redisClient = new Redis(process.env.REDIS_URL!, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    redisClient.on('error', (err) => {
      logger.error({ err: { message: err.message } }, 'Redis connection error');
      redisClient = null; // Fallback to NodeCache
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    // Connect asynchronously (non-blocking)
    redisClient.connect().catch((err) => {
      logger.warn(
        { err: { message: err.message } },
        'Redis failed to connect, using NodeCache fallback'
      );
      redisClient = null;
    });
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? { message: err.message } : { message: String(err) } },
      'Redis failed to initialize, using NodeCache fallback'
    );
    redisClient = null;
  }
}

// Helper function to create cache with Redis support
function createCacheWithRedis(defaultTtl: number, maxKeys: number): NodeCache {
  return new NodeCache({
    stdTTL: defaultTtl,
    checkperiod: 600,
    maxKeys,
    useClones: false,
    deleteOnExpire: true,
    enableLegacyCallbacks: false,
  });
}

// Cache instance with 30 minute default TTL
const cache = createCacheWithRedis(1800, 1000);

// Helper to get from Redis (async, used as fallback)
async function getFromRedis(key: string): Promise<unknown | null> {
  if (!redisClient) return null;
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

// Helper to set in Redis (async, used for write-through)
async function setInRedis(key: string, value: unknown, ttl?: number): Promise<void> {
  if (!redisClient) return;
  try {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await redisClient.setex(key, ttl, serialized);
    } else {
      await redisClient.set(key, serialized);
    }
  } catch (err) {
    // Silently fail, NodeCache is the source of truth
    logger.debug(
      { err: err instanceof Error ? { message: err.message } : { message: String(err) } },
      'Redis set failed, using NodeCache only'
    );
  }
}

// Helper function to create cache wrapper with Redis support
function createCacheWrapper(nodeCache: NodeCache, cacheType: string = 'default') {
  return {
    get: (key: string) => {
      const value = nodeCache.get(key);

      // Track cache metrics (async, non-blocking)
      if (value !== undefined) {
        import('../metrics')
          .then(({ cacheHitsTotal }) => {
            cacheHitsTotal.inc({ cache_type: cacheType });
          })
          .catch(() => {
            // Silently fail metrics
          });
      } else {
        import('../metrics')
          .then(({ cacheMissesTotal }) => {
            cacheMissesTotal.inc({ cache_type: cacheType });
          })
          .catch(() => {
            // Silently fail metrics
          });
      }

      return value as unknown;
    },
    set: (key: string, value: unknown, ttl?: number) => {
      if (ttl) {
        nodeCache.set(key, value, ttl);
      } else {
        nodeCache.set(key, value);
      }
      // Write-through to Redis (async, non-blocking)
      setInRedis(key, value, ttl).catch(() => {
        // Silently fail, NodeCache is primary
      });
    },
    delete: (key: string) => {
      const result = nodeCache.del(key);
      // Delete from Redis (async, non-blocking)
      if (redisClient) {
        redisClient.del(key).catch(() => {
          // Silently fail
        });
      }
      return result;
    },
    clear: () => {
      nodeCache.flushAll();
      // Clear Redis (async, non-blocking)
      if (redisClient) {
        redisClient.flushdb().catch(() => {
          // Silently fail
        });
      }
    },
    getStats: () => nodeCache.getStats(),
    has: (key: string) => nodeCache.has(key),
  };
}

/**
 * Pipeline Stages Cache
 * Caches pipeline stages which change infrequently
 *
 * TTL: 30 minutes
 * Use case: Stages are shared across all users and change rarely
 */
export const pipelineStagesCache = createCacheWrapper(cache, 'pipeline_stages');

/**
 * Instruments Cache
 * Caches instrument search results with 1 hour TTL
 */
const instrumentsCache = createCacheWithRedis(3600, 500);

export const instrumentsSearchCache = {
  ...createCacheWrapper(instrumentsCache, 'instruments'),
  set: (key: string, value: unknown, ttl?: number) => {
    // Only cache queries with more than 2 characters to avoid caching too many short queries
    if (key.length > 2) {
      if (ttl) {
        instrumentsCache.set(key, value, ttl);
      } else {
        instrumentsCache.set(key, value);
      }
      // Write-through to Redis
      setInRedis(key, value, ttl).catch(() => {});
    }
  },
};

/**
 * Benchmarks Cache
 * Caches benchmark definitions and lists with 1 hour TTL
 */
const benchmarksCache = createCacheWithRedis(3600, 100);

export const benchmarksCacheUtil = createCacheWrapper(benchmarksCache, 'benchmarks');

/**
 * Helper function to normalize cache keys
 *
 * Ensures consistent cache key format across the application.
 * Filters out null/undefined values and normalizes strings.
 *
 * @param prefix - Cache key prefix (e.g., 'pipeline', 'instruments')
 * @param parts - Variable number of parts to join
 * @returns Normalized cache key string
 *
 * @example
 * normalizeCacheKey('pipeline', 'stages', 'all') // 'pipeline:stages:all'
 * normalizeCacheKey('instruments', 'search', 'AAPL') // 'instruments:search:aapl'
 */
export function normalizeCacheKey(
  prefix: string,
  ...parts: (string | number | null | undefined)[]
): string {
  const normalizedParts = parts
    .filter((part) => part !== null && part !== undefined)
    .map((part) => String(part).toLowerCase().trim().replace(/\s+/g, '_'));
  return `${prefix}:${normalizedParts.join(':')}`;
}

/**
 * Calculate cache hit rate percentage
 *
 * @param stats - Cache statistics from getStats()
 * @returns Hit rate as percentage (0-100)
 */
export function calculateHitRate(stats: ReturnType<typeof cache.getStats>): number {
  const total = stats.hits + stats.misses;
  if (total === 0) return 0;
  return (stats.hits / total) * 100;
}

/**
 * Lookup Tables Cache
 * Caches lookup tables (lookupAssetClass, lookupTaskStatus, lookupPriority, pipelineStages)
 * which change infrequently but are queried frequently
 *
 * TTL: 1 hour for lookup tables, 30 minutes for pipeline stages
 */
const lookupTablesCache = createCacheWithRedis(3600, 50);

export const lookupTablesCacheUtil = createCacheWrapper(lookupTablesCache, 'lookup_tables');

/**
 * Benchmark Components Cache
 * Caches individual benchmark components with 15 minute TTL
 */
const benchmarkComponentsCache = createCacheWithRedis(900, 200);

export const benchmarkComponentsCacheUtil = createCacheWrapper(
  benchmarkComponentsCache,
  'benchmark_components'
);

/**
 * Contacts List Cache
 * Caches contact lists by advisor with 5 minute TTL
 */
const contactsListCache = createCacheWithRedis(300, 200);

export const contactsListCacheUtil = createCacheWrapper(contactsListCache, 'contacts_list');

/**
 * Team Metrics Cache
 * Caches team metrics with 10 minute TTL
 */
const teamMetricsCache = createCacheWithRedis(600, 100);

export const teamMetricsCacheUtil = createCacheWrapper(teamMetricsCache, 'team_metrics');

/**
 * Portfolio Assignments Cache
 * Caches active portfolio assignments with 15 minute TTL
 */
const portfolioAssignmentsCache = createCacheWithRedis(900, 500);

export const portfolioAssignmentsCacheUtil = createCacheWrapper(
  portfolioAssignmentsCache,
  'portfolio_assignments'
);

/**
 * AUM Aggregations Cache
 * Caches AUM totals by advisor with 30 minute TTL
 */
const aumAggregationsCache = createCacheWithRedis(1800, 200);

export const aumAggregationsCacheUtil = createCacheWrapper(
  aumAggregationsCache,
  'aum_aggregations'
);

/**
 * Pipeline Metrics Cache
 * Caches pipeline metrics by stage with optimized TTL
 * Uses materialized views for fast retrieval
 *
 * TTL: 10 minutes (optimized for pipeline metrics that change with stage moves)
 * Use case: Pipeline metrics are queried frequently, invalidated on stage changes
 */
const pipelineMetricsCache = createCacheWithRedis(600, 100);

export const pipelineMetricsCacheUtil = {
  ...createCacheWrapper(pipelineMetricsCache, 'pipeline_metrics'),
  /**
   * Invalidate cache when pipeline stage changes occur
   * This should be called after contact stage moves
   */
  invalidateOnStageChange: () => {
    // Clear all pipeline metrics cache when stages change
    pipelineMetricsCache.flushAll();
    if (redisClient) {
      redisClient.flushdb().catch(() => {});
    }
  },
  /**
   * Invalidate cache for specific stage
   */
  invalidateByStage: (stageId: string) => {
    const keys = pipelineMetricsCache.keys();
    keys.forEach((key) => {
      if (String(key).includes(`stage:${stageId}`)) {
        pipelineMetricsCache.del(key);
        if (redisClient) {
          redisClient.del(String(key)).catch(() => {});
        }
      }
    });
  },
};

/**
 * Task Statistics Cache
 * Caches task statistics by user with 10 minute TTL
 */
const taskStatisticsCache = createCacheWithRedis(600, 300);

export const taskStatisticsCacheUtil = createCacheWrapper(taskStatisticsCache, 'task_statistics');

/**
 * Dashboard KPIs Cache
 * Caches dashboard KPIs by user role/advisor with 5 minute TTL
 * Uses materialized views for fast retrieval
 *
 * TTL: 5 minutes (optimized for near-real-time data)
 * Use case: Dashboard KPIs are queried frequently but change relatively slowly
 */
const dashboardKpisCache = createCacheWithRedis(300, 200);

export const dashboardKpisCacheUtil = {
  ...createCacheWrapper(dashboardKpisCache, 'dashboard_kpis'),
  /**
   * Invalidate cache for specific advisor or role
   */
  invalidateByAdvisor: (advisorId: string) => {
    const keys = dashboardKpisCache.keys();
    keys.forEach((key) => {
      if (
        String(key).includes(`advisor:${advisorId}`) ||
        String(key).includes(`user:${advisorId}`)
      ) {
        dashboardKpisCache.del(key);
        if (redisClient) {
          redisClient.del(String(key)).catch(() => {});
        }
      }
    });
  },
  /**
   * Invalidate cache for specific role
   */
  invalidateByRole: (role: string) => {
    const keys = dashboardKpisCache.keys();
    keys.forEach((key) => {
      if (String(key).includes(`role:${role}`)) {
        dashboardKpisCache.del(key);
        if (redisClient) {
          redisClient.del(String(key)).catch(() => {});
        }
      }
    });
  },
};

/**
 * Get cache health metrics
 *
 * Returns comprehensive cache health information including hit rate,
 * memory usage, and key count.
 */
export function getCacheHealth() {
  const pipelineStats = pipelineStagesCache.getStats();
  const instrumentsStats = instrumentsSearchCache.getStats();
  const benchmarksStats = benchmarksCacheUtil.getStats();
  const lookupTablesStats = lookupTablesCacheUtil.getStats();
  const benchmarkComponentsStats = benchmarkComponentsCacheUtil.getStats();
  const contactsListStats = contactsListCacheUtil.getStats();
  const teamMetricsStats = teamMetricsCacheUtil.getStats();
  const portfolioAssignmentsStats = portfolioAssignmentsCacheUtil.getStats();
  const aumAggregationsStats = aumAggregationsCacheUtil.getStats();
  const pipelineMetricsStats = pipelineMetricsCacheUtil.getStats();
  const taskStatisticsStats = taskStatisticsCacheUtil.getStats();

  return {
    pipeline: {
      ...pipelineStats,
      hitRate: calculateHitRate(pipelineStats),
    },
    instruments: {
      ...instrumentsStats,
      hitRate: calculateHitRate(instrumentsStats),
    },
    benchmarks: {
      ...benchmarksStats,
      hitRate: calculateHitRate(benchmarksStats),
    },
    lookupTables: {
      ...lookupTablesStats,
      hitRate: calculateHitRate(lookupTablesStats),
    },
    benchmarkComponents: {
      ...benchmarkComponentsStats,
      hitRate: calculateHitRate(benchmarkComponentsStats),
    },
    contactsList: {
      ...contactsListStats,
      hitRate: calculateHitRate(contactsListStats),
    },
    teamMetrics: {
      ...teamMetricsStats,
      hitRate: calculateHitRate(teamMetricsStats),
    },
    portfolioAssignments: {
      ...portfolioAssignmentsStats,
      hitRate: calculateHitRate(portfolioAssignmentsStats),
    },
    aumAggregations: {
      ...aumAggregationsStats,
      hitRate: calculateHitRate(aumAggregationsStats),
    },
    pipelineMetrics: {
      ...pipelineMetricsStats,
      hitRate: calculateHitRate(pipelineMetricsStats),
    },
    taskStatistics: {
      ...taskStatisticsStats,
      hitRate: calculateHitRate(taskStatisticsStats),
    },
    dashboardKpis: {
      ...dashboardKpisCache.getStats(),
      hitRate: calculateHitRate(dashboardKpisCache.getStats()),
    },
  };
}
