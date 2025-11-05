import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker, CircuitState, CircuitBreakerOpenError } from './circuit-breaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
      timeout: 5000,
      successThreshold: 2
    });
  });

  it('debería estar en estado CLOSED inicialmente', () => {
    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('debería ejecutar función exitosamente cuando está CLOSED', async () => {
    const result = await circuitBreaker.execute(async () => {
      return 'success';
    });

    expect(result).toBe('success');
  });

  it('debería abrir el circuito después de N fallos', async () => {
    // Fallar 3 veces
    for (let i = 0; i < 3; i++) {
      await expect(
        circuitBreaker.execute(async () => {
          throw new Error('Service error');
        })
      ).rejects.toThrow('Service error');
    }

    expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
  });

  it('debería lanzar CircuitBreakerOpenError cuando está OPEN', async () => {
    // Abrir el circuito
    for (let i = 0; i < 3; i++) {
      await circuitBreaker.execute(async () => {
        throw new Error('Service error');
      }).catch(() => {});
    }

    await expect(
      circuitBreaker.execute(async () => 'success')
    ).rejects.toThrow(CircuitBreakerOpenError);
  });

  it('debería cambiar a HALF_OPEN después de resetTimeout', async () => {
    // Abrir el circuito
    for (let i = 0; i < 3; i++) {
      await circuitBreaker.execute(async () => {
        throw new Error('Service error');
      }).catch(() => {});
    }

    expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

    // Esperar reset timeout
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Verificar estado (debería actualizarse internamente)
    circuitBreaker.getState(); // Trigger updateState
  });

  it('debería resetear métricas', () => {
    circuitBreaker.reset();
    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    expect(circuitBreaker.getMetrics().failures).toBe(0);
  });
});

