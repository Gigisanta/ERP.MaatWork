/**
 * Database transaction utilities with logging and error handling
 * 
 * AI_DECISION: Centralizar lógica de transacciones con logging y retry
 * Justificación: Evita duplicación, asegura consistencia en manejo de errores, facilita debugging
 * Impacto: Mejor observabilidad y resiliencia en operaciones multi-query
 */

import { Logger } from 'pino';
import { db } from '@cactus/db';
import { loggedTransaction } from './db-logger';

/**
 * Error codes de PostgreSQL que indican errores transitorios (retry-safe)
 */
const TRANSIENT_ERROR_CODES = [
  '40P01', // deadlock_detected
  '40001', // serialization_failure
  '55P03', // lock_not_available
];

/**
 * Error codes que indican timeout
 */
const TIMEOUT_ERROR_CODES = [
  '57014', // query_canceled
];

export interface TransactionOptions {
  /**
   * Número máximo de reintentos para errores transitorios
   * @default 3
   */
  maxRetries?: number;
  
  /**
   * Delay base en ms entre reintentos (exponential backoff)
   * @default 100
   */
  retryDelay?: number;
  
  /**
   * Timeout en ms para la transacción completa
   * @default 30000 (30 segundos)
   */
  timeout?: number;
}

/**
 * Ejecuta una transacción de base de datos con logging y manejo de errores
 * 
 * @param logger - Instancia de logger de pino
 * @param operation - Nombre descriptivo de la operación para logging
 * @param transactionFn - Función que ejecuta operaciones dentro de la transacción
 * @param options - Opciones de configuración (retries, timeout)
 * @returns Resultado de la transacción
 * 
 * @example
 * ```typescript
 * await transactionWithLogging(
 *   req.log,
 *   'commit-aum-file',
 *   async (tx) => {
 *     await tx.insert(brokerAccounts).values({...});
 *     await tx.update(contacts).set({...});
 *     return { success: true };
 *   }
 * );
 * ```
 */
export async function transactionWithLogging<T>(
  logger: Logger,
  operation: string,
  transactionFn: (tx: ReturnType<typeof db>) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 100,
    timeout = 30000,
  } = options;

  let lastError: Error | unknown;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      // Envolver la transacción de Drizzle con logging
      return await loggedTransaction(
        logger,
        operation,
        async () => {
          // Ejecutar transacción con timeout
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error(`Transaction timeout after ${timeout}ms`));
            }, timeout);
          });

          const transactionPromise = db().transaction(async (tx: any) => {
            return await transactionFn(tx);
          });

          return Promise.race([transactionPromise, timeoutPromise]);
        }
      );
    } catch (error) {
      lastError = error;
      
      // Verificar si es un error transitorio que debemos reintentar
      const isTransient = isTransientError(error);
      const isTimeout = isTimeoutError(error);
      
      // Si no es transitorio o timeout, no reintentar
      if (!isTransient && !isTimeout) {
        logger.error({
          operation,
          attempt,
          error: error as Error,
          errorCode: getErrorCode(error),
        }, 'Transaction failed with non-transient error');
        throw error;
      }

      // Si es el último intento, throw
      if (attempt >= maxRetries) {
        logger.error({
          operation,
          attempt,
          maxRetries,
          error: error as Error,
          errorCode: getErrorCode(error),
        }, 'Transaction failed after max retries');
        throw error;
      }

      // Calcular delay con exponential backoff
      const delay = retryDelay * Math.pow(2, attempt);
      
      logger.warn({
        operation,
        attempt,
        maxRetries,
        delay,
        error: error as Error,
        errorCode: getErrorCode(error),
      }, 'Retrying transaction after transient error');

      // Esperar antes de reintentar
      await new Promise(resolve => setTimeout(resolve, delay));
      
      attempt++;
    }
  }

  // Esta línea nunca debería ejecutarse, pero TypeScript lo requiere
  throw lastError || new Error('Transaction failed');
}

/**
 * Verifica si un error es transitorio (puede reintentarse)
 */
function isTransientError(error: unknown): boolean {
  const errorCode = getErrorCode(error);
  return TRANSIENT_ERROR_CODES.includes(errorCode);
}

/**
 * Verifica si un error es de timeout
 */
function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error && error.message.includes('timeout')) {
    return true;
  }
  const errorCode = getErrorCode(error);
  return TIMEOUT_ERROR_CODES.includes(errorCode);
}

/**
 * Extrae el código de error de PostgreSQL si está disponible
 */
function getErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String(error.code);
  }
  return 'UNKNOWN';
}

