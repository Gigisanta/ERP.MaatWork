/**
 * Rate limiter utilities using token bucket algorithm
 *
 * AI_DECISION: Centralizar lógica de rate limiting con token bucket
 * Justificación: Evita duplicación, permite configuración flexible, facilita testing
 * Impacto: Mejor protección contra abuso, configuración centralizada
 */

import type { Request, Response, NextFunction } from 'express';

export interface RateLimitConfig {
  /**
   * Capacidad máxima del bucket (número de tokens)
   */
  capacity: number;

  /**
   * Tokens que se agregan por segundo (refill rate)
   */
  refillPerSec: number;

  /**
   * Identificador único para el bucket (ej: IP, userId)
   * Si no se proporciona, se usa IP del request
   */
  keyExtractor?: (req: Request) => string;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

/**
 * Rate limiter usando token bucket algorithm
 */
export class RateLimiter {
  private buckets: Map<string, TokenBucket>;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.buckets = new Map();
  }

  /**
   * Obtener o crear bucket para una clave
   */
  private getBucket(key: string): TokenBucket {
    const bucket = this.buckets.get(key);
    const now = Date.now() / 1000;

    if (!bucket) {
      const newBucket: TokenBucket = {
        tokens: this.config.capacity,
        lastRefill: now,
      };
      this.buckets.set(key, newBucket);
      return newBucket;
    }

    // Refill tokens basado en tiempo transcurrido
    const elapsed = now - bucket.lastRefill;
    bucket.tokens = Math.min(
      this.config.capacity,
      bucket.tokens + elapsed * this.config.refillPerSec
    );
    bucket.lastRefill = now;

    return bucket;
  }

  /**
   * Verificar si se puede procesar un request (consumir un token)
   * @returns true si se puede procesar, false si se debe rechazar
   */
  canProceed(key: string): boolean {
    const bucket = this.getBucket(key);

    if (bucket.tokens < 1) {
      return false;
    }

    bucket.tokens -= 1;
    return true;
  }

  /**
   * Obtener tiempo hasta que el bucket tenga tokens disponibles (en segundos)
   */
  getRetryAfter(key: string): number {
    const bucket = this.getBucket(key);

    if (bucket.tokens >= 1) {
      return 0;
    }

    // Calcular cuántos segundos hasta que haya al menos 1 token
    const tokensNeeded = 1 - bucket.tokens;
    const secondsNeeded = tokensNeeded / this.config.refillPerSec;

    return Math.ceil(secondsNeeded);
  }

  /**
   * Limpiar buckets antiguos (para evitar memory leaks)
   * Elimina buckets que no han sido usados en los últimos `maxAgeSeconds`
   */
  cleanup(maxAgeSeconds: number = 3600): void {
    const now = Date.now() / 1000;

    for (const [key, bucket] of this.buckets.entries()) {
      const age = now - bucket.lastRefill;
      if (age > maxAgeSeconds) {
        this.buckets.delete(key);
      }
    }
  }

  /**
   * Crear middleware de Express para rate limiting
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Extraer clave (IP o userId)
      const key = this.config.keyExtractor ? this.config.keyExtractor(req) : this.extractIp(req);

      // Verificar si se puede procesar
      if (!this.canProceed(key)) {
        const retryAfter = this.getRetryAfter(key);

        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter,
        });
      }

      next();
    };
  }

  /**
   * Extraer IP del request (considerando proxies)
   */
  private extractIp(req: Request): string {
    const xf = req.headers['x-forwarded-for'];
    const forwarded = typeof xf === 'string' ? xf.split(',')[0]?.trim() : undefined;
    return forwarded || req.ip || 'unknown';
  }
}

/**
 * AI_DECISION: Presets de rate limiting preconfigurados por tipo de endpoint
 * Justificación: Evitar configuración manual inconsistente, proporcionar valores probados
 * Impacto: Rate limiting consistente y apropiado para diferentes tipos de endpoints
 */
export const RATE_LIMIT_PRESETS = {
  /**
   * Rate limit para endpoints de autenticación (más restrictivo)
   */
  auth: {
    capacity: 60,
    refillPerSec: 30,
  },

  /**
   * Rate limit para uploads (muy restrictivo)
   */
  uploads: {
    capacity: 10,
    refillPerSec: 2,
  },

  /**
   * Rate limit general (menos restrictivo)
   */
  general: {
    capacity: 200,
    refillPerSec: 100,
  },
} as const;

/**
 * Crear rate limiter por usuario autenticado
 * Usa userId como clave en lugar de IP
 */
export function createUserRateLimiter(config: RateLimitConfig): RateLimiter {
  return new RateLimiter({
    ...config,
    keyExtractor: (req: Request) => {
      const user = (req as any).user;
      if (user?.id) {
        return `user:${user.id}`;
      }
      // Fallback a IP si no hay usuario
      const xf = req.headers['x-forwarded-for'];
      const forwarded = typeof xf === 'string' ? xf.split(',')[0]?.trim() : undefined;
      return forwarded || req.ip || 'unknown';
    },
  });
}

/**
 * Limpiar buckets periódicamente para evitar memory leaks
 * Debe ejecutarse en un intervalo (ej: cada hora)
 */
export function setupRateLimiterCleanup(limiters: RateLimiter[]): NodeJS.Timeout {
  return setInterval(
    () => {
      for (const limiter of limiters) {
        limiter.cleanup(3600); // Limpiar buckets no usados en 1 hora
      }
    },
    60 * 60 * 1000
  ); // Ejecutar cada hora
}
