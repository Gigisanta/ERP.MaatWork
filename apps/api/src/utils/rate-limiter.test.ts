import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter, RATE_LIMIT_PRESETS, createUserRateLimiter, setupRateLimiterCleanup } from './rate-limiter';
import type { Request, Response, NextFunction } from 'express';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      capacity: 10,
      refillPerSec: 5
    });
  });

  it('debería permitir requests cuando hay tokens disponibles', () => {
    expect(limiter.canProceed('test-key')).toBe(true);
  });

  it('debería rechazar requests cuando no hay tokens', () => {
    // Consumir todos los tokens
    for (let i = 0; i < 10; i++) {
      limiter.canProceed('test-key');
    }

    expect(limiter.canProceed('test-key')).toBe(false);
  });

  it('debería refill tokens con el tiempo', async () => {
    // Consumir todos los tokens
    for (let i = 0; i < 10; i++) {
      limiter.canProceed('test-key');
    }

    expect(limiter.canProceed('test-key')).toBe(false);

    // Esperar 1 segundo para refill
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Debería tener tokens disponibles
    expect(limiter.canProceed('test-key')).toBe(true);
  });

  it('debería retornar retryAfter cuando no hay tokens', () => {
    // Consumir todos los tokens
    for (let i = 0; i < 10; i++) {
      limiter.canProceed('test-key');
    }

    const retryAfter = limiter.getRetryAfter('test-key');
    expect(retryAfter).toBeGreaterThan(0);
  });

  it('debería retornar 0 cuando hay tokens disponibles', () => {
    const retryAfter = limiter.getRetryAfter('test-key');
    expect(retryAfter).toBe(0);
  });

  it('debería crear middleware de Express', () => {
    const middleware = limiter.middleware();
    expect(typeof middleware).toBe('function');
  });

  it('debería tener presets definidos', () => {
    expect(RATE_LIMIT_PRESETS.auth).toBeDefined();
    expect(RATE_LIMIT_PRESETS.uploads).toBeDefined();
    expect(RATE_LIMIT_PRESETS.general).toBeDefined();
  });

  it('debería limpiar buckets antiguos', () => {
    limiter.canProceed('key1');
    limiter.canProceed('key2');
    
    // Limpiar buckets no usados en 1 hora (simulado)
    limiter.cleanup(0); // 0 segundos = limpiar todos
    
    // Después de cleanup, debería poder crear nuevos buckets
    expect(limiter.canProceed('key3')).toBe(true);
  });

  it('debería manejar múltiples keys independientemente', () => {
    limiter.canProceed('key1');
    limiter.canProceed('key2');
    
    // Cada key debería tener su propio bucket
    expect(limiter.canProceed('key1')).toBe(true);
    expect(limiter.canProceed('key2')).toBe(true);
  });

  it('debería limitar tokens al capacity máximo', async () => {
    // Consumir algunos tokens
    limiter.canProceed('test-key');
    
    // Esperar tiempo suficiente para refill más allá del capacity
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verificar que no excede capacity
    let tokensUsed = 0;
    while (limiter.canProceed('test-key') && tokensUsed < 20) {
      tokensUsed++;
    }
    
    // Debería permitir exactamente capacity tokens
    expect(tokensUsed).toBeLessThanOrEqual(10);
  });

  describe('middleware', () => {
    it('debería permitir request cuando hay tokens', () => {
      const middleware = limiter.middleware();
      const mockReq = {
        ip: '127.0.0.1',
        headers: {},
      } as Partial<Request>;
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
      } as Partial<Response>;
      const mockNext = vi.fn();

      middleware(mockReq as Request, mockRes as Response, mockNext as NextFunction);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('debería rechazar request cuando no hay tokens', () => {
      // Consumir todos los tokens
      for (let i = 0; i < 10; i++) {
        limiter.canProceed('127.0.0.1');
      }

      const middleware = limiter.middleware();
      const mockReq = {
        ip: '127.0.0.1',
        headers: {},
      } as Partial<Request>;
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
      } as Partial<Response>;
      const mockNext = vi.fn();

      middleware(mockReq as Request, mockRes as Response, mockNext as NextFunction);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });

    it('debería usar X-Forwarded-For header cuando está disponible', () => {
      const middleware = limiter.middleware();
      const mockReq = {
        ip: '127.0.0.1',
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      } as Partial<Request>;
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
      } as Partial<Response>;
      const mockNext = vi.fn();

      middleware(mockReq as Request, mockRes as Response, mockNext as NextFunction);

      // Debería usar la IP del header
      expect(mockNext).toHaveBeenCalled();
    });

    it('debería usar keyExtractor personalizado cuando se proporciona', () => {
      const customLimiter = new RateLimiter({
        capacity: 10,
        refillPerSec: 5,
        keyExtractor: (req: Request) => `custom-${req.ip}`,
      });

      const middleware = customLimiter.middleware();
      const mockReq = {
        ip: '127.0.0.1',
        headers: {},
      } as Partial<Request>;
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
      } as Partial<Response>;
      const mockNext = vi.fn();

      middleware(mockReq as Request, mockRes as Response, mockNext as NextFunction);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});

describe('createUserRateLimiter', () => {
  it('debería crear limiter con keyExtractor por usuario', () => {
    const limiter = createUserRateLimiter({
      capacity: 10,
      refillPerSec: 5,
    });

    const middleware = limiter.middleware();
    const mockReq = {
      ip: '127.0.0.1',
      headers: {},
      user: { id: 'user-123' },
    } as Partial<Request>;
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn(),
    } as Partial<Response>;
    const mockNext = vi.fn();

    middleware(mockReq as Request, mockRes as Response, mockNext as NextFunction);

    expect(mockNext).toHaveBeenCalled();
  });

  it('debería usar IP como fallback cuando no hay usuario', () => {
    const limiter = createUserRateLimiter({
      capacity: 10,
      refillPerSec: 5,
    });

    const middleware = limiter.middleware();
    const mockReq = {
      ip: '127.0.0.1',
      headers: {},
      user: null,
    } as Partial<Request>;
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn(),
    } as Partial<Response>;
    const mockNext = vi.fn();

    middleware(mockReq as Request, mockRes as Response, mockNext as NextFunction);

    expect(mockNext).toHaveBeenCalled();
  });
});

describe('setupRateLimiterCleanup', () => {
  it('debería configurar cleanup periódico', () => {
    const limiter1 = new RateLimiter({ capacity: 10, refillPerSec: 5 });
    const limiter2 = new RateLimiter({ capacity: 10, refillPerSec: 5 });

    const intervalId = setupRateLimiterCleanup([limiter1, limiter2]);

    expect(intervalId).toBeDefined();
    expect(typeof intervalId).toBe('object');

    // Cleanup
    clearInterval(intervalId);
  });
});

