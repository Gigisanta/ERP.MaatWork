/**
 * Tests para cache middleware
 *
 * AI_DECISION: Tests unitarios para middleware de cache Redis
 * Justificación: Validación crítica de caching para performance
 * Impacto: Prevenir errores en cache que afecten performance
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { cache, invalidateCache, invalidateCacheKey } from './cache';
import { getRedisClient, buildCacheKey } from '../config/redis';
import { logger } from '../utils/logger';

// Mock dependencies
vi.mock('../config/redis', () => ({
  getRedisClient: vi.fn(),
  buildCacheKey: vi.fn((...parts) => parts.join(':')),
  REDIS_TTL: {
    DEFAULT: 3600,
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const mockGetRedisClient = vi.mocked(getRedisClient);
const mockLogger = vi.mocked(logger);

describe('Cache Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockRedis: {
    get: ReturnType<typeof vi.fn>;
    setEx: ReturnType<typeof vi.fn>;
    keys: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockReq = {
      path: '/test',
      query: { param: 'value' },
      log: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
      },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();

    mockRedis = {
      get: vi.fn(),
      setEx: vi.fn(),
      keys: vi.fn(),
      del: vi.fn(),
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('cache middleware', () => {
    it('debería retornar cached response cuando existe', async () => {
      const cachedData = { success: true, data: 'cached' };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));
      mockGetRedisClient.mockReturnValue(mockRedis as any);

      const middleware = cache({
        ttl: 3600,
        keyPrefix: 'test',
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRedis.get).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(cachedData);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Cache', 'HIT');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería continuar sin cache cuando Redis no está disponible', async () => {
      mockGetRedisClient.mockReturnValue(null);

      const middleware = cache({
        ttl: 3600,
        keyPrefix: 'test',
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('debería cachear response cuando hay cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setEx.mockResolvedValue('OK');
      mockGetRedisClient.mockReturnValue(mockRedis as any);

      // Store original json function
      const originalJson = mockRes.json;

      const middleware = cache({
        ttl: 3600,
        keyPrefix: 'test',
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRedis.get).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();

      // Simular respuesta después de next() - res.json fue sobrescrito por el middleware
      const responseData = { success: true, data: 'new' };
      // Call the overridden json function
      await (mockRes.json as any)(responseData);

      expect(mockRedis.setEx).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Cache', 'MISS');
    });

    it('debería usar keyBuilder personalizado cuando se proporciona', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockGetRedisClient.mockReturnValue(mockRedis as any);

      const customKeyBuilder = vi.fn((req) => `custom:${req.path}`);
      const middleware = cache({
        ttl: 3600,
        keyPrefix: 'test',
        keyBuilder: customKeyBuilder,
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(customKeyBuilder).toHaveBeenCalledWith(mockReq);
    });

    it('debería skip cache cuando skipCache retorna true', async () => {
      mockGetRedisClient.mockReturnValue(mockRedis as any);

      const middleware = cache({
        ttl: 3600,
        keyPrefix: 'test',
        skipCache: (req) => req.query.skip === 'true',
      });

      (mockReq.query as any).skip = 'true';

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRedis.get).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('debería manejar errores de Redis gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));
      mockGetRedisClient.mockReturnValue(mockRedis as any);

      const middleware = cache({
        ttl: 3600,
        keyPrefix: 'test',
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('invalidateCache', () => {
    it('debería invalidar cache por pattern', async () => {
      mockRedis.keys.mockResolvedValue(['key1', 'key2', 'key3']);
      mockRedis.del.mockResolvedValue(3);
      mockGetRedisClient.mockReturnValue(mockRedis as any);

      await invalidateCache('test:*');

      expect(mockRedis.keys).toHaveBeenCalledWith('test:*');
      expect(mockRedis.del).toHaveBeenCalledWith(['key1', 'key2', 'key3']);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ pattern: 'test:*', count: 3 }),
        'Cache invalidated'
      );
    });

    it('debería manejar cuando no hay keys que coincidan', async () => {
      mockRedis.keys.mockResolvedValue([]);
      mockGetRedisClient.mockReturnValue(mockRedis as any);

      await invalidateCache('test:*');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('debería manejar cuando Redis no está disponible', async () => {
      mockGetRedisClient.mockReturnValue(null);

      await invalidateCache('test:*');

      expect(mockRedis.keys).not.toHaveBeenCalled();
    });

    it('debería manejar errores de Redis', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));
      mockGetRedisClient.mockReturnValue(mockRedis as any);

      await invalidateCache('test:*');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('invalidateCacheKey', () => {
    it('debería invalidar cache por key específica', async () => {
      mockRedis.del.mockResolvedValue(1);
      mockGetRedisClient.mockReturnValue(mockRedis as any);

      await invalidateCacheKey('test:key');

      expect(mockRedis.del).toHaveBeenCalledWith('test:key');
    });

    it('debería manejar cuando Redis no está disponible', async () => {
      mockGetRedisClient.mockReturnValue(null);

      await invalidateCacheKey('test:key');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('debería manejar errores de Redis', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));
      mockGetRedisClient.mockReturnValue(mockRedis as any);

      await invalidateCacheKey('test:key');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
