/**
 * Prometheus Metrics
 *
 * Provides Prometheus-compatible metrics for monitoring API performance
 *
 * AI_DECISION: Use prom-client for Prometheus metrics
 * Justificación: Standard library for Prometheus metrics in Node.js, compatible with Prometheus scraping
 * Impacto: Better observability, standard metrics format, integration with monitoring tools
 */

import { Registry, Counter, Histogram, Gauge } from 'prom-client';

// Create a registry for metrics
const register = new Registry();

// Default labels for all metrics
register.setDefaultLabels({
  app: 'maatwork-api',
  environment: process.env.NODE_ENV || 'development',
});

// HTTP Request Metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

// Cache Metrics
export const cacheHitsTotal = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
  registers: [register],
});

export const cacheMissesTotal = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
  registers: [register],
});

// Database Query Metrics
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const dbQueriesTotal = new Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table'],
  registers: [register],
});

// Error Metrics
export const httpErrorsTotal = new Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

// System Metrics
const memoryUsage = new Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type'],
  registers: [register],
});

// AI_DECISION: Add detailed memory metrics for better monitoring
// Justificación: More granular memory metrics help identify memory issues and leaks
// Impacto: Better visibility into memory usage patterns
const nodejsHeapUsedBytes = new Gauge({
  name: 'nodejs_heap_used_bytes',
  help: 'Node.js heap used memory in bytes',
  registers: [register],
});

const nodejsHeapTotalBytes = new Gauge({
  name: 'nodejs_heap_total_bytes',
  help: 'Node.js heap total memory in bytes',
  registers: [register],
});

const nodejsExternalMemoryBytes = new Gauge({
  name: 'nodejs_external_memory_bytes',
  help: 'Node.js external memory in bytes',
  registers: [register],
});

const nodejsRssBytes = new Gauge({
  name: 'nodejs_rss_bytes',
  help: 'Node.js resident set size (RSS) in bytes',
  registers: [register],
});

// Cache size metrics (estimated)
const cacheSizeBytes = new Gauge({
  name: 'cache_size_bytes',
  help: 'Estimated cache size in bytes',
  labelNames: ['cache_type'],
  registers: [register],
});

const cacheKeyCount = new Gauge({
  name: 'cache_key_count',
  help: 'Number of keys in cache',
  labelNames: ['cache_type'],
  registers: [register],
});

const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(cacheHitsTotal);
register.registerMetric(cacheMissesTotal);
register.registerMetric(dbQueryDuration);
register.registerMetric(dbQueriesTotal);
register.registerMetric(httpErrorsTotal);
register.registerMetric(memoryUsage);
register.registerMetric(nodejsHeapUsedBytes);
register.registerMetric(nodejsHeapTotalBytes);
register.registerMetric(nodejsExternalMemoryBytes);
register.registerMetric(nodejsRssBytes);
register.registerMetric(cacheSizeBytes);
register.registerMetric(cacheKeyCount);
register.registerMetric(activeConnections);

/**
 * Get metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Update memory metrics
 * AI_DECISION: Add function to update memory metrics periodically
 * Justificación: Memory metrics should be updated regularly for accurate monitoring
 * Impacto: Better visibility into memory usage trends
 */
export function updateMemoryMetrics(): void {
  const memUsage = process.memoryUsage();
  const memUsageWithExternal = memUsage as typeof memUsage & { external?: number };

  // Update detailed memory metrics
  nodejsHeapUsedBytes.set(memUsage.heapUsed);
  nodejsHeapTotalBytes.set(memUsage.heapTotal);
  nodejsExternalMemoryBytes.set(memUsageWithExternal.external || 0);
  nodejsRssBytes.set(memUsage.rss);

  // Update legacy memoryUsage metric for backward compatibility
  memoryUsage.set({ type: 'rss' }, memUsage.rss);
  memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
  memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
  memoryUsage.set({ type: 'external' }, memUsageWithExternal.external || 0);
}

/**
 * Update cache metrics
 * AI_DECISION: Add function to update cache size metrics
 * Justificación: Cache size monitoring helps identify memory issues from cache bloat
 * Impacto: Better visibility into cache memory consumption
 */
export function updateCacheMetrics(
  cacheHealth: ReturnType<typeof import('./performance/cache').getCacheHealth>
): void {
  // Update cache metrics for each cache type
  const cacheTypes = [
    'pipeline',
    'instruments',
    'benchmarks',
    'lookupTables',
    'benchmarkComponents',
    'contactsList',
    'teamMetrics',
    'portfolioAssignments',
    'aumAggregations',
    'pipelineMetrics',
    'taskStatistics',
    'dashboardKpis',
  ] as const;

  for (const cacheType of cacheTypes) {
    const stats = cacheHealth[cacheType];
    if (
      stats &&
      typeof stats === 'object' &&
      stats !== null &&
      'sizeBytes' in stats &&
      'keyCount' in stats
    ) {
      const cacheStats = stats as { sizeBytes: number; keyCount: number };
      cacheSizeBytes.set({ cache_type: cacheType }, cacheStats.sizeBytes);
      cacheKeyCount.set({ cache_type: cacheType }, cacheStats.keyCount);
    }
  }
}

/**
 * Reset all metrics (useful for testing)
 */
function resetMetrics(): void {
  register.resetMetrics();
}
