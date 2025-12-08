/**
 * Performance Dashboard
 *
 * Visualiza métricas de queries en tiempo real, incluyendo:
 * - Latencia p50, p95, p99
 * - Top queries lentas
 * - Cache hit rate
 * - Queries N+1 detectadas
 */

'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card } from '@cactus/ui';
import { logger } from '@/lib/logger';

interface QueryMetrics {
  operationBase: string;
  count: number;
  avgDuration: number;
  p95Duration: number;
  p99Duration: number;
  nPlusOneCount: number;
}

interface CacheHealth {
  [key: string]: {
    hits: number;
    misses: number;
    hitRate: number;
    keys: number;
  };
}

interface PerformanceData {
  allMetrics: QueryMetrics[];
  slowQueries: QueryMetrics[];
  nPlusOneQueries: QueryMetrics[];
  cacheHealth: CacheHealth;
  summary: {
    totalQueries: number;
    slowQueriesCount: number;
    nPlusOneQueriesCount: number;
    threshold: number;
  };
}

export default function PerformanceDashboard() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(500);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<PerformanceData>(
        `/v1/admin/query-metrics?threshold=${threshold}`
      );

      if (response.success && response.data) {
        setData(response.data);
      } else {
        throw new Error('Failed to fetch metrics');
      }
    } catch (err) {
      logger.error('Error fetching performance metrics', {
        err: err instanceof Error ? err.message : String(err),
      });
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchMetrics, threshold]);

  if (loading && !data) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Performance Dashboard</h1>
        <p>Loading metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Performance Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-800">Error: {error}</p>
          <button
            onClick={fetchMetrics}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Calculate overall cache hit rate
  const cacheEntries = Object.values(data.cacheHealth);
  const totalCacheHits = cacheEntries.reduce((sum, c) => sum + c.hits, 0);
  const totalCacheMisses = cacheEntries.reduce((sum, c) => sum + c.misses, 0);
  const overallCacheHitRate =
    totalCacheHits + totalCacheMisses > 0
      ? (totalCacheHits / (totalCacheHits + totalCacheMisses)) * 100
      : 0;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Performance Dashboard</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <span>Slow Query Threshold (ms):</span>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="border rounded px-2 py-1 w-24"
              min={100}
              max={5000}
              step={100}
            />
          </label>
          <button
            onClick={fetchMetrics}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Queries</h3>
          <p className="text-2xl font-bold">{data.summary.totalQueries}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Slow Queries</h3>
          <p className="text-2xl font-bold text-orange-600">{data.summary.slowQueriesCount}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">N+1 Queries</h3>
          <p className="text-2xl font-bold text-red-600">{data.summary.nPlusOneQueriesCount}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Cache Hit Rate</h3>
          <p className="text-2xl font-bold text-green-600">{overallCacheHitRate.toFixed(1)}%</p>
        </Card>
      </div>

      {/* Top Slow Queries */}
      {data.slowQueries.length > 0 && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Top Slow Queries (p95 &gt; {threshold}ms)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Operation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Count
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Avg (ms)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    P95 (ms)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    P99 (ms)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.slowQueries.slice(0, 20).map((query) => (
                  <tr key={query.operationBase}>
                    <td className="px-4 py-3 text-sm font-mono">{query.operationBase}</td>
                    <td className="px-4 py-3 text-sm">{query.count}</td>
                    <td className="px-4 py-3 text-sm">{query.avgDuration.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-orange-600">
                      {query.p95Duration.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-600">
                      {query.p99Duration.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* N+1 Queries */}
      {data.nPlusOneQueries.length > 0 && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">N+1 Query Patterns Detected</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Operation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total Executions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    N+1 Occurrences
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Avg Duration (ms)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.nPlusOneQueries.map((query) => (
                  <tr key={query.operationBase}>
                    <td className="px-4 py-3 text-sm font-mono">{query.operationBase}</td>
                    <td className="px-4 py-3 text-sm">{query.count}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-600">
                      {query.nPlusOneCount}
                    </td>
                    <td className="px-4 py-3 text-sm">{query.avgDuration.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Cache Health */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Cache Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(data.cacheHealth).map(([name, stats]) => (
            <div key={name} className="border rounded p-4">
              <h3 className="font-semibold mb-2 capitalize">
                {name.replace(/([A-Z])/g, ' $1').trim()}
              </h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Hit Rate:</span>
                  <span
                    className={
                      stats.hitRate >= 70
                        ? 'text-green-600'
                        : stats.hitRate >= 50
                          ? 'text-yellow-600'
                          : 'text-red-600'
                    }
                  >
                    {stats.hitRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Hits:</span>
                  <span>{stats.hits}</span>
                </div>
                <div className="flex justify-between">
                  <span>Misses:</span>
                  <span>{stats.misses}</span>
                </div>
                <div className="flex justify-between">
                  <span>Keys:</span>
                  <span>{stats.keys}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
