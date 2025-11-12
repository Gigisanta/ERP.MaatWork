/**
 * Simple in-memory cache utility
 * 
 * Uses Node.js Map for thread-safe caching with TTL support
 * Suitable for single-instance deployments
 * 
 * For multi-instance deployments, consider migrating to Redis
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set value in cache with TTL (time to live) in milliseconds
   */
  set<T>(key: string, value: T, ttlMs: number): void {
    const expiresAt = Date.now() + ttlMs;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Delete value from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear all cache entries matching a pattern
   */
  clearPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Destroy cache and cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Singleton instance
const cacheInstance = new SimpleCache();

// Cleanup on process exit
process.on('SIGTERM', () => {
  cacheInstance.destroy();
});

process.on('SIGINT', () => {
  cacheInstance.destroy();
});

/**
 * Cache utilities for specific domains
 */
export const pipelineStagesCache = {
  /**
   * Get pipeline stages for a user/team
   */
  get: (key: string) => cacheInstance.get<unknown>(`pipeline:stages:${key}`),
  
  /**
   * Set pipeline stages with 30 minute TTL
   */
  set: (key: string, value: unknown) => {
    cacheInstance.set(`pipeline:stages:${key}`, value, 30 * 60 * 1000); // 30 minutes
  },
  
  /**
   * Invalidate all pipeline stages cache
   */
  invalidate: () => {
    cacheInstance.clearPattern('^pipeline:stages:');
  },
  
  /**
   * Invalidate specific pipeline stages cache
   */
  invalidateKey: (key: string) => {
    cacheInstance.delete(`pipeline:stages:${key}`);
  }
};

/**
 * Cache utilities for instruments search
 */
export const instrumentsCache = {
  /**
   * Get instrument search results
   */
  get: (query: string) => {
    const normalizedQuery = query.trim().toUpperCase();
    return cacheInstance.get<unknown>(`instruments:search:${normalizedQuery}`);
  },
  
  /**
   * Set instrument search results with 1 hour TTL
   */
  set: (query: string, value: unknown) => {
    const normalizedQuery = query.trim().toUpperCase();
    // Only cache queries with 2+ characters to avoid cache pollution
    if (normalizedQuery.length >= 2) {
      cacheInstance.set(`instruments:search:${normalizedQuery}`, value, 60 * 60 * 1000); // 1 hour
    }
  },
  
  /**
   * Invalidate all instrument search cache
   */
  invalidate: () => {
    cacheInstance.clearPattern('^instruments:search:');
  },
  
  /**
   * Invalidate specific instrument search cache
   */
  invalidateQuery: (query: string) => {
    const normalizedQuery = query.trim().toUpperCase();
    cacheInstance.delete(`instruments:search:${normalizedQuery}`);
  }
};

/**
 * Cache utilities for benchmarks
 */
export const benchmarksCache = {
  /**
   * Get benchmark data
   */
  get: (key: string) => cacheInstance.get<unknown>(`benchmarks:${key}`),
  
  /**
   * Set benchmark data with 1 hour TTL
   */
  set: (key: string, value: unknown) => {
    cacheInstance.set(`benchmarks:${key}`, value, 60 * 60 * 1000); // 1 hour
  },
  
  /**
   * Invalidate all benchmarks cache
   */
  invalidate: () => {
    cacheInstance.clearPattern('^benchmarks:');
  },
  
  /**
   * Invalidate specific benchmark cache
   */
  invalidateKey: (key: string) => {
    cacheInstance.delete(`benchmarks:${key}`);
  }
};

export default cacheInstance;


