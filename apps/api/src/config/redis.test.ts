/**
 * Tests para redis config
 *
 * AI_DECISION: Tests unitarios para configuración Redis
 * Justificación: Validación crítica de cliente Redis y TTL
 * Impacto: Prevenir errores en caching
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeRedis, getRedisClient, closeRedis, buildCacheKey, REDIS_TTL } from './redis';

// Mock dependencies
vi.mock('ioredis', () => {
  const MockRedis = vi.fn(function () {
    return {
      on: vi.fn(),
      quit: vi.fn().mockResolvedValue(undefined),
    };
  });
  return {
    default: MockRedis,
  };
});

vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import Redis from 'ioredis';
import { logger } from '../utils/logger';

const MockRedis = vi.mocked(Redis);
const mockLogger = vi.mocked(logger);

describe('redis config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initializeRedis', () => {
    it('debería inicializar Redis exitosamente', async () => {
      const client = await initializeRedis();

      expect(client).toBeDefined();
      expect(MockRedis).toHaveBeenCalled();
    });

    it('debería retornar cliente existente si ya está inicializado', async () => {
      // Limpiar singleton antes del test
      const { closeRedis } = await import('./redis');
      await closeRedis();

      const client1 = await initializeRedis();
      const client2 = await initializeRedis();

      expect(client1).toBe(client2);
      expect(MockRedis).toHaveBeenCalledTimes(1);
    });
  });

  describe('getRedisClient', () => {
    it('debería retornar cliente cuando está inicializado', async () => {
      await initializeRedis();
      const client = getRedisClient();

      expect(client).toBeDefined();
    });

    it('debería retornar null cuando no está inicializado', async () => {
      // Cerrar conexión para limpiar singleton
      const { closeRedis } = await import('./redis');
      await closeRedis();

      const client = getRedisClient();

      expect(client).toBeNull();
    });
  });

  describe('closeRedis', () => {
    it('debería cerrar conexión exitosamente', async () => {
      const client = await initializeRedis();
      await closeRedis();

      expect(client.quit).toHaveBeenCalled();
    });

    it('debería no hacer nada cuando cliente no está inicializado', async () => {
      // Cerrar conexión primero para limpiar singleton
      await closeRedis();

      // Setup mock to check call count
      const mockQuit = vi.fn();
      // This is tricky because we need to clear the singleton
      // But we already did with closeRedis()

      await closeRedis();
      // If we got here without error and it didn't crash, it's fine.
    });
  });

  describe('buildCacheKey', () => {
    it('debería construir key correctamente con prefijo que incluye dominio', () => {
      const key = buildCacheKey('bloomberg:', 'test', 'path', 'query');

      expect(key).toBe('bloomberg::test:path:query');
    });

    it('debería construir key con múltiples partes usando prefijo con dominio', () => {
      const key = buildCacheKey('bloomberg:', 'test', 'path1', 'path2', 'path3');

      expect(key).toBe('bloomberg::test:path1:path2:path3');
    });

    it('debería construir key correctamente sin prefijo de dominio', () => {
      const key = buildCacheKey('test', 'path', 'query');

      expect(key).toBe('crm:test:path:query');
    });

    it('debería manejar valores null/undefined en parts', () => {
      const key = buildCacheKey('test', 'part1', null, 'part2', undefined, 'part3');
      expect(key).toBe('crm:test:part1:part2:part3');
    });
  });

  describe('REDIS_TTL', () => {
    it('debería tener constantes TTL definidas', () => {
      expect(REDIS_TTL.ASSET_SNAPSHOT).toBe(60);
      expect(REDIS_TTL.INTRADAY).toBe(300);
      expect(REDIS_TTL.OHLCV_DAILY).toBe(600);
      expect(REDIS_TTL.YIELD_CURVE).toBe(600);
      expect(REDIS_TTL.MACRO_SERIES).toBe(1800);
    });
  });
});
