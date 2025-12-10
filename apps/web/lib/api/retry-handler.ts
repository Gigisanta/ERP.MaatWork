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
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Options for retry with backoff
 */
export interface RetryWithBackoffOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelay?: number;
  /** Whether to add jitter to delay (default: true) */
  addJitter?: boolean;
  /** Callback called on each retry attempt */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
  /** Callback called before giving up */
  onGiveUp?: (error: unknown, attempts: number) => void;
  /** Custom function to determine if error should be retried */
  shouldRetryFn?: (error: unknown) => boolean;
}

/**
 * Default function to check if an error should be retried
 */
function defaultShouldRetry(error: unknown): boolean {
  if (error instanceof ApiError) {
    return shouldRetry(error);
  }

  // Retry on network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Check for status in error-like objects
  if (typeof error === 'object' && error !== null) {
    const status = (error as { status?: number }).status;
    if (status !== undefined) {
      return status >= 500 || status === 504 || status === 429;
    }
  }

  return false;
}

/**
 * Execute a function with automatic retry and exponential backoff
 *
 * AI_DECISION: Implementar retry automático con exponential backoff
 * Justificación: Mejora la resiliencia ante errores transitorios de servidor
 * Impacto: Menos errores visibles al usuario, mejor experiencia general
 *
 * @param fn - Async function to execute
 * @param options - Retry options
 * @returns Promise resolving to function result or rejecting after max retries
 *
 * @example
 * ```tsx
 * const result = await retryWithBackoff(
 *   () => fetchData(url),
 *   {
 *     maxRetries: 3,
 *     baseDelay: 1000,
 *     onRetry: (attempt, error, delayMs) => {
 *       console.log(`Retry ${attempt} after ${delayMs}ms`);
 *     }
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryWithBackoffOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    addJitter = true,
    onRetry,
    onGiveUp,
    shouldRetryFn = defaultShouldRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt >= maxRetries || !shouldRetryFn(error)) {
        break;
      }

      // Calculate delay with exponential backoff
      let delayMs = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

      // Handle Retry-After header for ApiError with 429
      if (error instanceof ApiError && error.status === 429) {
        // Try to get Retry-After from error details if available
        const retryAfter = (error as ApiError & { retryAfter?: string }).retryAfter;
        if (retryAfter) {
          const headerDelay = parseRetryAfterHeader(retryAfter);
          if (headerDelay !== null) {
            delayMs = Math.min(headerDelay, maxDelay);
          }
        }
      }

      // Add jitter to prevent thundering herd
      if (addJitter) {
        const jitter = Math.random() * (delayMs * 0.2); // Up to 20% jitter
        delayMs = delayMs + jitter;
      }

      // Notify about retry
      onRetry?.(attempt + 1, error, delayMs);

      // Wait before next attempt
      await delay(delayMs);
    }
  }

  // Give up after max retries
  onGiveUp?.(lastError, maxRetries + 1);
  throw lastError;
}

/**
 * Creates a wrapper function that automatically retries on failure
 *
 * @example
 * ```tsx
 * const fetchWithRetry = withRetry(async (id: string) => {
 *   return await fetchContact(id);
 * }, { maxRetries: 2 });
 *
 * const contact = await fetchWithRetry('123');
 * ```
 */
export function withRetry<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  options: RetryWithBackoffOptions = {}
): (...args: Args) => Promise<Result> {
  return (...args: Args) => retryWithBackoff(() => fn(...args), options);
}

/**
 * Hook-friendly retry status tracking
 */
export interface RetryStatus {
  isRetrying: boolean;
  attempt: number;
  lastError: unknown | null;
  nextRetryIn: number | null;
}

/**
 * Creates a retry controller for use with hooks
 *
 * @example
 * ```tsx
 * const retryController = createRetryController({
 *   onStatusChange: setRetryStatus
 * });
 *
 * await retryController.execute(() => fetchData());
 * ```
 */
export function createRetryController(
  options: {
    onStatusChange?: (status: RetryStatus) => void;
  } & RetryWithBackoffOptions = {}
) {
  const { onStatusChange, ...retryOptions } = options;

  let currentStatus: RetryStatus = {
    isRetrying: false,
    attempt: 0,
    lastError: null,
    nextRetryIn: null,
  };

  const updateStatus = (updates: Partial<RetryStatus>) => {
    currentStatus = { ...currentStatus, ...updates };
    onStatusChange?.(currentStatus);
  };

  return {
    execute: async <T>(fn: () => Promise<T>): Promise<T> => {
      updateStatus({ isRetrying: true, attempt: 0, lastError: null });

      try {
        return await retryWithBackoff(fn, {
          ...retryOptions,
          onRetry: (attempt, error, delayMs) => {
            updateStatus({
              attempt,
              lastError: error,
              nextRetryIn: delayMs,
            });
            retryOptions.onRetry?.(attempt, error, delayMs);
          },
          onGiveUp: (error, attempts) => {
            updateStatus({
              isRetrying: false,
              lastError: error,
              nextRetryIn: null,
            });
            retryOptions.onGiveUp?.(error, attempts);
          },
        });
      } finally {
        updateStatus({ isRetrying: false, nextRetryIn: null });
      }
    },
    getStatus: () => currentStatus,
    reset: () => {
      updateStatus({
        isRetrying: false,
        attempt: 0,
        lastError: null,
        nextRetryIn: null,
      });
    },
  };
}
