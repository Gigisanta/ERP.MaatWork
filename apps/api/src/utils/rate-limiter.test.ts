import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter, RATE_LIMIT_PRESETS } from './rate-limiter';
import type { Request } from 'express';

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
});

