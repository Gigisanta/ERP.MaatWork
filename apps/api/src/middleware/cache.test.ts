/**
 * Tests para cache middleware
 * 
 * AI_DECISION: Tests unitarios para middleware de caché Redis
 * Justificación: Validación crítica de lógica de caché y invalidación
 * Impacto: Prevenir errores en caching y mejorar performance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { cache, invalidateCache, invalidateCacheKey } from './cache';

// Mock dependencies
vi.mock('../config/redis', () => ({
  getRedisClient: vi.fn(),
  buildCacheKey: vi.fn((prefix: string, ...parts: (string | number)[]) => {
    return `bloomberg:${prefix}:${parts.join(':')}`;
  }),
  REDIS_TTL: {
    ASSET_SNAPSHOT: 60,
    OHLCV_DAILY: 600
  }
}));

vi.mock('../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

import { getRedisClient, buildCacheKey } from '../config/redis';
import { logger } from '../utils/logger';

const mockGetRedisClient = vi.mocked(getRedisClient);
const mockLogger = vi.mocked(logger);

describe('cache middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockRedis: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      path: '/api/test',
      query: { param: 'value' },
      params: {}
    };

    mockRes = {
      setHeader: vi.fn(),
      json: vi.fn().mockReturnThis()
    };

    mockNext = vi.fn();

    mockRedis = {
      get: vi.fn(),
      setEx: vi.fn(),
      keys: vi.fn(),
      del: vi.fn()
    };
  });

  describe('cache middleware', () => {
    it('debería retornar cache hit cuando existe en Redis', async () => {
      const cachedData = { data: 'cached' };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));
      mockGetRedisClient.mockReturnValue(mockRedis);

      const middleware = cache({
        ttl: 60,
        keyPrefix: 'test'
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRedis.get).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Cache', 'HIT');
      expect(mockRes.json).toHaveBeenCalledWith(cachedData);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('debería continuar cuando cache miss y cachear respuesta', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setEx.mockResolvedValue(undefined);
      mockGetRedisClient.mockReturnValue(mockRedis);

      const middleware = cache({
        ttl: 60,
        keyPrefix: 'test'
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRedis.get).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();

      // Simular que el handler llama res.json
      const responseData = { data: 'response' };
      (mockRes.json as any)(responseData);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Cache', 'MISS');
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        expect.any(String),
        60,
        JSON.stringify(responseData)
      );
    });

    it('debería continuar sin caché cuando Redis no está disponible', async () => {
      mockGetRedisClient.mockReturnValue(null);

      const middleware = cache({
        ttl: 60,
        keyPrefix: 'test'
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRedis.get).not.toHaveBeenCalled();
    });

    it('debería usar keyBuilder personalizado cuando se proporciona', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockGetRedisClient.mockReturnValue(mockRedis);

      const customKeyBuilder = vi.fn((req: Request) => 'custom-key');
      const middleware = cache({
        ttl: 60,
        keyPrefix: 'test',
        keyBuilder: customKeyBuilder
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(customKeyBuilder).toHaveBeenCalledWith(mockReq);
      expect(mockRedis.get).toHaveBeenCalledWith('custom-key');
    });

    it('debería skip cache cuando skipCache retorna true', async () => {
      mockGetRedisClient.mockReturnValue(mockRedis);

      const middleware = cache({
        ttl: 60,
        keyPrefix: 'test',
        skipCache: (req: Request) => req.query.skip === 'true'
      });

      mockReq.query = { skip: 'true' };
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRedis.get).not.toHaveBeenCalled();
    });

    it('debería continuar cuando hay error en Redis', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));
      mockGetRedisClient.mockReturnValue(mockRedis);

      const middleware = cache({
        ttl: 60,
        keyPrefix: 'test'
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('debería manejar error al cachear respuesta', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setEx.mockRejectedValue(new Error('Set error'));
      mockGetRedisClient.mockReturnValue(mockRedis);

      const middleware = cache({
        ttl: 60,
        keyPrefix: 'test'
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();

      // Simular que el handler llama res.json
      const responseData = { data: 'response' };
      (mockRes.json as any)(responseData);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error) }),
        'Failed to cache response'
      );
    });

    it('debería usar buildCacheKey por defecto cuando no hay keyBuilder', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockGetRedisClient.mockReturnValue(mockRedis);

      const middleware = cache({
        ttl: 60,
        keyPrefix: 'test'
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(buildCacheKey).toHaveBeenCalledWith(
        'test',
        mockReq.path,
        JSON.stringify(mockReq.query)
      );
    });
  });

  describe('invalidateCache', () => {
    it('debería invalidar cache por pattern', async () => {
      mockRedis.keys.mockResolvedValue(['key1', 'key2', 'key3']);
      mockRedis.del.mockResolvedValue(3);
      mockGetRedisClient.mockReturnValue(mockRedis);

      await invalidateCache('pattern:*');

      expect(mockRedis.keys).toHaveBeenCalledWith('pattern:*');
      expect(mockRedis.del).toHaveBeenCalledWith(['key1', 'key2', 'key3']);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { pattern: 'pattern:*', count: 3 },
        'Cache invalidated'
      );
    });

    it('debería no hacer nada cuando pattern no tiene matches', async () => {
      mockRedis.keys.mockResolvedValue([]);
      mockGetRedisClient.mockReturnValue(mockRedis);

      await invalidateCache('pattern:*');

      expect(mockRedis.keys).toHaveBeenCalledWith('pattern:*');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('debería no hacer nada cuando Redis no está disponible', async () => {
      mockGetRedisClient.mockReturnValue(null);

      await invalidateCache('pattern:*');

      expect(mockRedis.keys).not.toHaveBeenCalled();
    });

    it('debería manejar error al invalidar cache', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));
      mockGetRedisClient.mockReturnValue(mockRedis);

      await invalidateCache('pattern:*');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error), pattern: 'pattern:*' }),
        'Failed to invalidate cache'
      );
    });
  });

  describe('invalidateCacheKey', () => {
    it('debería invalidar cache key específica', async () => {
      mockRedis.del.mockResolvedValue(1);
      mockGetRedisClient.mockReturnValue(mockRedis);

      await invalidateCacheKey('specific-key');

      expect(mockRedis.del).toHaveBeenCalledWith('specific-key');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { key: 'specific-key' },
        'Cache key invalidated'
      );
    });

    it('debería no hacer nada cuando Redis no está disponible', async () => {
      mockGetRedisClient.mockReturnValue(null);

      await invalidateCacheKey('specific-key');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('debería manejar error al invalidar cache key', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));
      mockGetRedisClient.mockReturnValue(mockRedis);

      await invalidateCacheKey('specific-key');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error), key: 'specific-key' }),
        'Failed to invalidate cache key'
      );
    });
  });
});


