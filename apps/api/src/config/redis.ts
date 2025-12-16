/**
 * Redis client configuration for caching
 *
 * AI_DECISION: Centralize Redis configuration with TTL presets per endpoint
 * Justificación: Consistent caching strategy across all Bloomberg endpoints, easy to adjust TTLs
 * Impacto: Better performance, reduced load on data sources, configurable cache duration
 */

import { createClient, type RedisClientType } from 'redis';
import { logger } from '../utils/logger';

let redisClient: RedisClientType | null = null;

/**
 * Redis TTL presets (in seconds) for different endpoint types
 */
export const REDIS_TTL = {
  // High-frequency, real-time data (short TTL)
  ASSET_SNAPSHOT: 60, // 1 minute
  INTRADAY: 300, // 5 minutes

  // Medium-frequency data
  OHLCV_DAILY: 600, // 10 minutes
  YIELD_CURVE: 600, // 10 minutes
  MACRO_SERIES: 1800, // 30 minutes
  DAILY: 600, // 10 minutes (Added alias for OHLCV_DAILY)
  HOURLY: 3600, // 1 hour (Added alias)
  LONG_CACHE: 86400, // 24 hours (Added alias)

  // Low-frequency data (long TTL)
  FILINGS: 3600, // 1 hour
  EVENTS: 3600, // 1 hour
  SOCIAL_POSTS: 1800, // 30 minutes

  // Static/reference data (very long TTL)
  MACRO_SERIES_LIST: 86400, // 24 hours
  INSTRUMENTS: 3600, // 1 hour

  // CRM endpoints TTLs (Fase 1: Redis Caching)
  CONTACTS: 60, // 1 minute - datos cambian frecuentemente pero se consultan mucho
  PIPELINE: 30, // 30 seconds - datos muy dinámicos
  BENCHMARKS: 300, // 5 minutes - datos relativamente estáticos
  TAGS: 180, // 3 minutes - datos que cambian ocasionalmente
} as const;

/**
 * Initialize Redis client
 */
export async function initializeRedis(): Promise<RedisClientType> {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error({ retries }, 'Redis reconnection failed after 10 retries');
            return new Error('Redis reconnection failed');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      logger.error({ error: err }, 'Redis client error');
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis client reconnecting');
    });

    await redisClient.connect();

    return redisClient;
  } catch (error) {
    logger.error({ error }, 'Failed to initialize Redis client');
    throw error;
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): RedisClientType | null {
  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis client closed');
  }
}

/**
 * Cache key builder
 *
 * AI_DECISION: Support both Bloomberg-specific and general caching prefixes
 * Justificación: Bloomberg endpoints use "bloomberg:" prefix, but CRM endpoints need general prefix
 * Impacto: Flexible cache key generation for different domains
 */
export function buildCacheKey(prefix: string, ...parts: (string | number)[]): string {
  // If prefix already includes a domain (e.g., "bloomberg:" or "crm:"), use as-is
  if (prefix.includes(':')) {
    return `${prefix}:${parts.join(':')}`;
  }
  // Default to general "crm:" prefix for CRM endpoints
  return `crm:${prefix}:${parts.join(':')}`;
}
