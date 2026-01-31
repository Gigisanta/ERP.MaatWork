/**
 * Circuit breaker implementation
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

export interface CircuitBreakerMetrics {
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
    this.updateState();

    if (this.metrics.state === CircuitState.OPEN) {
      throw new CircuitBreakerOpenError('Circuit breaker is OPEN');
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Circuit breaker timeout after ${this.options.timeout}ms`));
      }, this.options.timeout);
    });

    try {
      const result = await Promise.race([fn(), timeoutPromise]);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  isOpen(): boolean {
    this.updateState();
    return this.metrics.state === CircuitState.OPEN;
  }

  isClosed(): boolean {
    this.updateState();
    return this.metrics.state === CircuitState.CLOSED;
  }

  isHalfOpen(): boolean {
    this.updateState();
    return this.metrics.state === CircuitState.HALF_OPEN;
  }

  getState(): CircuitState {
    this.updateState();
    return this.metrics.state;
  }

  getMetrics(): Readonly<CircuitBreakerMetrics> {
    return { ...this.metrics };
  }

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

  private onSuccess(): void {
    this.metrics.lastSuccessTime = Date.now();

    if (this.metrics.state === CircuitState.HALF_OPEN) {
      this.metrics.successes += 1;
      if (this.metrics.successes >= this.options.successThreshold) {
        this.setState(CircuitState.CLOSED);
        this.metrics.failures = 0;
        this.metrics.successes = 0;
      }
    } else if (this.metrics.state === CircuitState.CLOSED) {
      this.metrics.failures = 0;
    }
  }

  private onFailure(): void {
    this.metrics.lastFailureTime = Date.now();
    this.metrics.failures += 1;

    if (this.metrics.state === CircuitState.HALF_OPEN) {
      this.setState(CircuitState.OPEN);
      this.metrics.successes = 0;
    } else if (this.metrics.state === CircuitState.CLOSED) {
      if (this.metrics.failures >= this.options.failureThreshold) {
        this.setState(CircuitState.OPEN);
      }
    }
  }

  private updateState(): void {
    const now = Date.now();
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
