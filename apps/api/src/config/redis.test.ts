/**
 * Tests para redis config
 * 
 * AI_DECISION: Tests unitarios para configuración Redis
 * Justificación: Validación crítica de cliente Redis y TTL
 * Impacto: Prevenir errores en caching
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initializeRedis,
  getRedisClient,
  closeRedis,
  buildCacheKey,
  REDIS_TTL
} from './redis';

// Mock dependencies
vi.mock('redis', () => ({
  createClient: vi.fn()
}));

vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }
}));

import { createClient } from 'redis';
import { logger } from '../utils/logger';

const mockCreateClient = vi.mocked(createClient);
const mockLogger = vi.mocked(logger);

describe('redis config', () => {
  let mockRedisClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRedisClient = {
      on: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined),
      quit: vi.fn().mockResolvedValue(undefined)
    };

    mockCreateClient.mockReturnValue(mockRedisClient as any);
  });

  describe('initializeRedis', () => {
    it('debería inicializar Redis exitosamente', async () => {
      const client = await initializeRedis();

      expect(client).toBeDefined();
      expect(mockCreateClient).toHaveBeenCalled();
      expect(mockRedisClient.on).toHaveBeenCalled();
      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    it('debería retornar cliente existente si ya está inicializado', async () => {
      // Limpiar singleton antes del test
      const { closeRedis } = await import('./redis');
      await closeRedis();
      
      const client1 = await initializeRedis();
      const client2 = await initializeRedis();

      expect(client1).toBe(client2);
      expect(mockCreateClient).toHaveBeenCalledTimes(1);
    });

    it('debería manejar error de conexión', async () => {
      // Reset singleton first
      const { closeRedis } = await import('./redis');
      await closeRedis();
      
      // Setup mock to reject
      mockRedisClient.connect.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(initializeRedis()).rejects.toThrow('Connection failed');
      expect(mockLogger.error).toHaveBeenCalled();
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
      await initializeRedis();
      await closeRedis();

      expect(mockRedisClient.quit).toHaveBeenCalled();
    });

    it('debería no hacer nada cuando cliente no está inicializado', async () => {
      // Cerrar conexión primero para limpiar singleton
      await closeRedis();
      
      // Reset mock call count
      mockRedisClient.quit.mockClear();
      
      // Intentar cerrar de nuevo (no debería llamar quit porque no hay cliente)
      await closeRedis();

      expect(mockRedisClient.quit).not.toHaveBeenCalled();
    });
  });

  describe('buildCacheKey', () => {
    it('debería construir key correctamente', () => {
      const key = buildCacheKey('test', 'path', 'query');

      expect(key).toBe('bloomberg:test:path:query');
    });

    it('debería construir key con múltiples partes', () => {
      const key = buildCacheKey('test', 'path1', 'path2', 'path3');

      expect(key).toBe('bloomberg:test:path1:path2:path3');
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




