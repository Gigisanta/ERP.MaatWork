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
    const state = circuitBreaker.getState(); // Trigger updateState
    expect(state).toBe(CircuitState.HALF_OPEN);
  });

  it('debería resetear métricas', () => {
    circuitBreaker.reset();
    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    expect(circuitBreaker.getMetrics().failures).toBe(0);
    expect(circuitBreaker.getMetrics().successes).toBe(0);
  });

  it('debería cerrar circuito después de successThreshold en HALF_OPEN', async () => {
    // Abrir el circuito
    for (let i = 0; i < 3; i++) {
      await circuitBreaker.execute(async () => {
        throw new Error('Service error');
      }).catch(() => {});
    }

    // Esperar reset timeout
    await new Promise(resolve => setTimeout(resolve, 1100));
    circuitBreaker.getState(); // Trigger updateState to HALF_OPEN

    // Ejecutar 2 éxitos (successThreshold)
    await circuitBreaker.execute(async () => 'success1');
    await circuitBreaker.execute(async () => 'success2');

    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('debería volver a abrir si falla en HALF_OPEN', async () => {
    // Abrir el circuito
    for (let i = 0; i < 3; i++) {
      await circuitBreaker.execute(async () => {
        throw new Error('Service error');
      }).catch(() => {});
    }

    // Esperar reset timeout
    await new Promise(resolve => setTimeout(resolve, 1100));
    circuitBreaker.getState(); // Trigger updateState to HALF_OPEN

    // Fallar en HALF_OPEN
    await circuitBreaker.execute(async () => {
      throw new Error('Service error');
    }).catch(() => {});

    expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
  });

  it('debería manejar timeout correctamente', async () => {
    await expect(
      circuitBreaker.execute(async () => {
        await new Promise(resolve => setTimeout(resolve, 6000));
        return 'success';
      })
    ).rejects.toThrow(/timeout|Circuit breaker timeout/);
  }, 10000); // Increase test timeout to 10s since we're waiting 6s

  it('debería usar valores por defecto cuando no se proporcionan opciones', () => {
    const defaultBreaker = new CircuitBreaker();
    expect(defaultBreaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('debería obtener métricas correctamente', () => {
    const metrics = circuitBreaker.getMetrics();
    expect(metrics).toHaveProperty('failures');
    expect(metrics).toHaveProperty('successes');
    expect(metrics).toHaveProperty('state');
    expect(metrics).toHaveProperty('stateChangedAt');
  });

  it('debería verificar estados correctamente', () => {
    expect(circuitBreaker.isClosed()).toBe(true);
    expect(circuitBreaker.isOpen()).toBe(false);
    expect(circuitBreaker.isHalfOpen()).toBe(false);
  });

  it('debería resetear contador de fallos en CLOSED después de éxito', async () => {
    // Fallar 2 veces (menos que threshold)
    await circuitBreaker.execute(async () => {
      throw new Error('Service error');
    }).catch(() => {});
    await circuitBreaker.execute(async () => {
      throw new Error('Service error');
    }).catch(() => {});

    // Éxito debería resetear contador
    await circuitBreaker.execute(async () => 'success');

    const metrics = circuitBreaker.getMetrics();
    expect(metrics.failures).toBe(0);
  });
});

describe('CircuitBreakerOpenError', () => {
  it('debería crear error con mensaje correcto', () => {
    const error = new CircuitBreakerOpenError('Circuit breaker is OPEN');
    expect(error.message).toBe('Circuit breaker is OPEN');
    expect(error.name).toBe('CircuitBreakerOpenError');
  });
});

