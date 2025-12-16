/**
 * Circuit breaker implementation
 *
 * AI_DECISION: Implementar circuit breaker para mejorar resiliencia
 * Justificación: Previene llamadas fallidas repetidas a servicios externos
 * Permite fallback rápido cuando el servicio está caído
 * Impacto: Mejor UX, menos carga en servicios fallidos, recuperación automática
 */

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation, requests allowed
  OPEN = 'OPEN', // Failing, requests rejected immediately
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

export interface CircuitBreakerOptions {
  /**
   * Número de fallos consecutivos antes de abrir el circuito
   * @default 5
   */
  failureThreshold?: number;

  /**
   * Tiempo en ms que el circuito permanece abierto antes de intentar half-open
   * @default 60000 (60 segundos)
   */
  resetTimeout?: number;

  /**
   * Tiempo máximo en ms para considerar una request como timeout
   * @default 30000 (30 segundos)
   */
  timeout?: number;

  /**
   * Número de éxitos necesarios en half-open para cerrar el circuito
   * @default 2
   */
  successThreshold?: number;
}

interface CircuitBreakerMetrics {
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  state: CircuitState;
  stateChangedAt: number;
}

/**
 * Circuit breaker para proteger llamadas a servicios externos
 */
export class CircuitBreaker {
  private options: Required<CircuitBreakerOptions>;
  private metrics: CircuitBreakerMetrics;

  constructor(options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      resetTimeout: options.resetTimeout ?? 60000,
      timeout: options.timeout ?? 30000,
      successThreshold: options.successThreshold ?? 2,
    };

    this.metrics = {
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      state: CircuitState.CLOSED,
      stateChangedAt: Date.now(),
    };
  }

  /**
   * Ejecutar una función protegida por el circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Verificar estado antes de ejecutar
    this.updateState();

    if (this.metrics.state === CircuitState.OPEN) {
      throw new CircuitBreakerOpenError('Circuit breaker is OPEN');
    }

    // Ejecutar con timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Circuit breaker timeout after ${this.options.timeout}ms`));
      }, this.options.timeout);
    });

    try {
      const result = await Promise.race([fn(), timeoutPromise]);

      // Éxito: resetear contadores y actualizar estado
      this.onSuccess();
      return result;
    } catch (error) {
      // Falla: incrementar contador y actualizar estado
      this.onFailure();
      throw error;
    }
  }

  /**
   * Verificar si el circuito está abierto
   */
  isOpen(): boolean {
    this.updateState();
    return this.metrics.state === CircuitState.OPEN;
  }

  /**
   * Verificar si el circuito está cerrado
   */
  isClosed(): boolean {
    this.updateState();
    return this.metrics.state === CircuitState.CLOSED;
  }

  /**
   * Verificar si el circuito está en half-open
   */
  isHalfOpen(): boolean {
    this.updateState();
    return this.metrics.state === CircuitState.HALF_OPEN;
  }

  /**
   * Obtener estado actual
   */
  getState(): CircuitState {
    this.updateState();
    return this.metrics.state;
  }

  /**
   * Obtener métricas
   */
  getMetrics(): Readonly<CircuitBreakerMetrics> {
    return { ...this.metrics };
  }

  /**
   * Resetear métricas (útil para testing)
   */
  reset(): void {
    this.metrics = {
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      state: CircuitState.CLOSED,
      stateChangedAt: Date.now(),
    };
  }

  /**
   * Manejar éxito
   */
  private onSuccess(): void {
    this.metrics.lastSuccessTime = Date.now();

    if (this.metrics.state === CircuitState.HALF_OPEN) {
      this.metrics.successes += 1;

      // Si alcanzamos el threshold de éxitos, cerrar el circuito
      if (this.metrics.successes >= this.options.successThreshold) {
        this.setState(CircuitState.CLOSED);
        this.metrics.failures = 0;
        this.metrics.successes = 0;
      }
    } else if (this.metrics.state === CircuitState.CLOSED) {
      // Resetear contador de fallos en estado cerrado
      this.metrics.failures = 0;
    }
  }

  /**
   * Manejar fallo
   */
  private onFailure(): void {
    this.metrics.lastFailureTime = Date.now();
    this.metrics.failures += 1;

    if (this.metrics.state === CircuitState.HALF_OPEN) {
      // Cualquier fallo en half-open vuelve a abrir
      this.setState(CircuitState.OPEN);
      this.metrics.successes = 0;
    } else if (this.metrics.state === CircuitState.CLOSED) {
      // Si alcanzamos el threshold de fallos, abrir el circuito
      if (this.metrics.failures >= this.options.failureThreshold) {
        this.setState(CircuitState.OPEN);
      }
    }
  }

  /**
   * Actualizar estado basado en tiempo transcurrido
   */
  private updateState(): void {
    const now = Date.now();

    // Si está abierto y ha pasado el reset timeout, cambiar a half-open
    if (
      this.metrics.state === CircuitState.OPEN &&
      this.metrics.lastFailureTime &&
      now - this.metrics.lastFailureTime >= this.options.resetTimeout
    ) {
      this.setState(CircuitState.HALF_OPEN);
      this.metrics.failures = 0;
      this.metrics.successes = 0;
    }
  }

  /**
   * Cambiar estado y registrar timestamp
   */
  private setState(newState: CircuitState): void {
    if (this.metrics.state !== newState) {
      this.metrics.state = newState;
      this.metrics.stateChangedAt = Date.now();
    }
  }
}

/**
 * Error específico para cuando el circuit breaker está abierto
 */
export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}
