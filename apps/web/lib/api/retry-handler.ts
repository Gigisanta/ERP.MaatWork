/**
 * Retry Handler
 * 
 * Handles retry logic with exponential backoff for API requests
 * 
 * AI_DECISION: Agregar retry para 429 (Too Many Requests)
 * Justificación: Rate limiting puede ser temporal, retry con backoff apropiado
 * Impacto: Mejor manejo de rate limits, menos errores visibles al usuario
 */

import { ApiError } from '../api-error';

/**
 * Determine if an error should trigger a retry
 * 
 * - 5xx errors: Server errors that might be transient
 * - 504: Gateway timeout
 * - 429: Rate limiting (with appropriate backoff)
 */
export function shouldRetry(error: ApiError): boolean {
  return error.status >= 500 || error.status === 504 || error.status === 429;
}

/**
 * Calculate delay before next retry attempt
 * 
 * AI_DECISION: Mejorar backoff para 429 usando Retry-After header
 * Justificación: Rate limiting puede especificar tiempo de espera exacto
 * Impacto: Respeta límites del servidor, evita reintentos innecesarios
 */
export function calculateRetryDelay(
  error: ApiError,
  attempt: number,
  retryAfterHeader?: string | null
): number {
  // For 429, try to use Retry-After header
  if (error.status === 429 && retryAfterHeader) {
    const delayFromHeader = parseRetryAfterHeader(retryAfterHeader);
    if (delayFromHeader !== null) {
      return delayFromHeader;
    }
  }

  // Default exponential backoff with jitter
  const baseDelay = Math.pow(2, attempt) * 1000;
  
  // Add jitter for 429 to avoid thundering herd
  if (error.status === 429) {
    const jitter = Math.random() * 1000;
    return baseDelay + jitter;
  }

  return baseDelay;
}

/**
 * Parse Retry-After header value
 * 
 * Supports both:
 * - Numeric seconds: "120"
 * - HTTP date: "Wed, 21 Oct 2015 07:28:00 GMT"
 * 
 * Returns delay in milliseconds, or null if parsing fails
 */
function parseRetryAfterHeader(retryAfter: string): number | null {
  // Try parsing as seconds
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  // Try parsing as HTTP date
  const retryAfterDate = new Date(retryAfter);
  if (!isNaN(retryAfterDate.getTime())) {
    const now = Date.now();
    const retryTime = retryAfterDate.getTime();
    return Math.max(0, retryTime - now);
  }

  return null;
}

/**
 * Delay helper - returns a promise that resolves after ms milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}


