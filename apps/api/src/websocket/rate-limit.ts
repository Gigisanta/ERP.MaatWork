/**
 * WebSocket Rate Limiting
 *
 * AI_DECISION: Token bucket rate limiting for WebSocket connections and messages
 * Justificación: Prevents connection flooding and message spam abuse
 * Impacto: Better protection against DoS attacks, fair resource usage
 */

import NodeCache from 'node-cache';
import { logger } from '../utils/logger';
import type { IncomingMessage } from 'http';

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

interface WebSocketRateLimiterOptions {
  maxConnectionsPerIP: number;
  maxMessagesPerSecond: number;
  windowMs: number;
  burstTokens?: number;
}

class WebSocketRateLimiter {
  private connectionBuckets: Map<string, RateLimitBucket> = new Map();
  private messageBuckets: Map<string, RateLimitBucket> = new Map();
  private connectionCache: NodeCache;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private options: WebSocketRateLimiterOptions) {
    this.connectionCache = new NodeCache({ stdTTL: 60, checkperiod: 60 });
    this.startCleanup();
  }

  checkConnectionLimit(ip: string): boolean {
    const key = `ws_conn:${ip}`;
    const current = this.connectionCache.get<number>(key);

    if (current !== undefined && current >= this.options.maxConnectionsPerIP) {
      logger.warn({ ip, current: current + 1 }, 'WebSocket connection rate limit exceeded');
      return false;
    }

    const newCount = (current || 0) + 1;
    this.connectionCache.set(key, newCount);

    logger.debug({ ip, count: newCount }, 'WebSocket connection counted');
    return true;
  }

  releaseConnection(ip: string): void {
    const key = `ws_conn:${ip}`;
    const current = this.connectionCache.get<number>(key);

    if (current !== undefined && current > 0) {
      this.connectionCache.set(key, current - 1);
      logger.debug({ ip, count: current - 1 }, 'WebSocket connection released');
    }
  }

  checkMessageLimit(connectionId: string): boolean {
    const now = Date.now();
    const bucket = this.messageBuckets.get(connectionId);

    if (!bucket) {
      this.messageBuckets.set(connectionId, {
        tokens: this.options.burstTokens || this.options.maxMessagesPerSecond - 1,
        lastRefill: now,
      });
      return true;
    }

    const timeSinceRefill = now - bucket.lastRefill;
    const tokensToAdd = Math.floor((timeSinceRefill / 1000) * this.options.maxMessagesPerSecond);

    bucket.tokens = Math.min(
      this.options.burstTokens || this.options.maxMessagesPerSecond,
      bucket.tokens + tokensToAdd
    );
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      logger.warn({ connectionId }, 'WebSocket message rate limit exceeded');
      return false;
    }

    bucket.tokens -= 1;
    return true;
  }

  removeConnectionBucket(connectionId: string): void {
    this.messageBuckets.delete(connectionId);
  }

  getStats(): {
    totalConnections: number;
    activeMessageBuckets: number;
  } {
    let totalConnections = 0;
    this.connectionCache.keys().forEach(() => {
      totalConnections++;
    });

    return {
      totalConnections,
      activeMessageBuckets: this.messageBuckets.size,
    };
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const connectionTimeout = this.options.windowMs;

      for (const [connectionId, bucket] of this.messageBuckets.entries()) {
        if (now - bucket.lastRefill > connectionTimeout) {
          this.messageBuckets.delete(connectionId);
          logger.debug({ connectionId }, 'Cleaned up inactive message bucket');
        }
      }
    }, this.options.windowMs);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.connectionCache.close();
    this.messageBuckets.clear();
  }
}

export const WS_RATE_LIMIT_PRESETS = {
  default: {
    maxConnectionsPerIP: 10,
    maxMessagesPerSecond: 30,
    windowMs: 60000,
    burstTokens: 50,
  },
  strict: {
    maxConnectionsPerIP: 5,
    maxMessagesPerSecond: 10,
    windowMs: 60000,
    burstTokens: 20,
  },
  loose: {
    maxConnectionsPerIP: 20,
    maxMessagesPerSecond: 60,
    windowMs: 60000,
    burstTokens: 100,
  },
};

export { WebSocketRateLimiter };
export type { WebSocketRateLimiterOptions };
