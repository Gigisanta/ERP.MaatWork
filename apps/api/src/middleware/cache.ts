/**
 * Redis cache middleware for API endpoints
 *
 * AI_DECISION: Middleware-based caching with automatic key generation
 * Justificación: Reduces code duplication, consistent caching pattern, easy to apply to any endpoint
 * Impacto: Better code organization, easier to maintain cache invalidation
 */

import type { Request, Response, NextFunction } from 'express';
import { getRedisClient, buildCacheKey, REDIS_TTL } from '../config/redis';
import { logger } from '../utils/logger';

interface CacheOptions {
  ttl: number;
  keyPrefix: string;
  keyBuilder?: (req: Request) => string;
  skipCache?: (req: Request) => boolean;
}

// Cache statistics tracking
interface CacheStats {
  hits: number;
  misses: number;
}

const cacheStats = new Map<string, CacheStats>();

function getCacheStats(keyPrefix: string): CacheStats {
  if (!cacheStats.has(keyPrefix)) {
    cacheStats.set(keyPrefix, { hits: 0, misses: 0 });
  }
  return cacheStats.get(keyPrefix)!;
}

function getHitRate(keyPrefix: string): number {
  const stats = getCacheStats(keyPrefix);
  const total = stats.hits + stats.misses;
  return total > 0 ? (stats.hits / total) * 100 : 0;
}

/**
 * Cache middleware factory
 */
export function cache(options: CacheOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip cache if requested
    if (options.skipCache && options.skipCache(req)) {
      return next();
    }

    const redis = getRedisClient();
    if (!redis) {
      // Redis not available, skip caching
      return next();
    }

    // Build cache key
    const cacheKey = options.keyBuilder
      ? options.keyBuilder(req)
      : buildCacheKey(options.keyPrefix, req.path, JSON.stringify(req.query));

    try {
      // Try to get from cache
      const cached = await redis.get(cacheKey);
      if (cached) {
        const stats = getCacheStats(options.keyPrefix);
        stats.hits++;
        const hitRate = getHitRate(options.keyPrefix);

        logger.debug({ cacheKey, hitRate: hitRate.toFixed(2) }, 'Cache hit');
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Hit-Rate', `${hitRate.toFixed(2)}%`);
        res.json(JSON.parse(cached));
        return;
      }

      // Cache miss - override res.json to cache response
      const stats = getCacheStats(options.keyPrefix);
      stats.misses++;
      const hitRate = getHitRate(options.keyPrefix);

      const originalJson = res.json.bind(res);
      res.json = function (body: unknown) {
        // Cache the response
        redis.setex(cacheKey, options.ttl, JSON.stringify(body)).catch((err) => {
          logger.error({ error: err, cacheKey }, 'Failed to cache response');
        });

        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Hit-Rate', `${hitRate.toFixed(2)}%`);
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error({ error, cacheKey }, 'Cache middleware error');
      // Continue without caching on error
      next();
    }
  };
}

/**
 * Invalidate cache by pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
      logger.info({ pattern, count: keys.length }, 'Cache invalidated');
    }
  } catch (error) {
    logger.error({ error, pattern }, 'Failed to invalidate cache');
  }
}

/**
 * Invalidate cache for specific key
 */
export async function invalidateCacheKey(key: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    await redis.del(key);
    logger.debug({ key }, 'Cache key invalidated');
  } catch (error) {
    logger.error({ error, key }, 'Failed to invalidate cache key');
  }
}
