/**
 * Cache para queries COUNT de AUM rows
 */

import type { CountCacheEntry, CacheFilters } from './types';

// Simple in-memory cache for COUNT queries when no filters are active
const countCache = new Map<string, CountCacheEntry>();
const COUNT_CACHE_TTL_MS = 30000; // 30 seconds

/**
 * Genera clave de cache basada en filtros
 */
export function getCacheKey(filters: CacheFilters): string {
  return JSON.stringify({
    broker: filters.broker || null,
    status: filters.status || null,
    fileId: filters.fileId || null,
    preferredOnly: filters.preferredOnly,
    search: filters.search || null,
    onlyUpdated: filters.onlyUpdated,
    reportMonth: filters.reportMonth || null,
    reportYear: filters.reportYear || null,
  });
}

/**
 * Obtiene conteo del cache si existe y no ha expirado
 */
export function getCachedCount(cacheKey: string): number | null {
  const entry = countCache.get(cacheKey);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > COUNT_CACHE_TTL_MS) {
    countCache.delete(cacheKey);
    return null;
  }

  return entry.total;
}

/**
 * Guarda conteo en cache
 */
export function setCachedCount(cacheKey: string, total: number): void {
  countCache.set(cacheKey, {
    total,
    timestamp: Date.now(),
  });

  // Clean up old entries periodically (keep cache size reasonable)
  if (countCache.size > 100) {
    const now = Date.now();
    for (const [key, entry] of countCache.entries()) {
      if (now - entry.timestamp > COUNT_CACHE_TTL_MS) {
        countCache.delete(key);
      }
    }
  }
}

// Cache se limpia automáticamente por TTL; función manual eliminada por no usarse
