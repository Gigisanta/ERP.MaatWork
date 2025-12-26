/**
 * Session Manager
 *
 * Utilities for session verification, refresh, and token management
 *
 * AI_DECISION: Centralizar l?gica de sesi?n en m?dulo separado
 * Justificaci?n: Reutilizable, testeable, separaci?n de responsabilidades
 * Impacto: C?digo m?s mantenible, l?gica de sesi?n centralizada
 */

import { logger } from '../logger';
import { config } from '../config';
import { fetchWithLogging, postJson } from '../fetch-client';
import type { AuthUser } from '../../app/auth/AuthContext';

interface SessionCheckResult {
  success: boolean;
  user: AuthUser | null;
  error?: {
    type: 'network' | 'auth' | 'invalid' | 'timeout';
    message: string;
    status?: number;
  };
}

/**
 * Verify current session with retry logic
 *
 * @param maxRetries Maximum number of retry attempts (default: 3)
 * @param retryDelays Delays in ms for each retry attempt (default: [500, 1000, 2000])
 * @returns Session check result with user data or error details
 */
export async function verifySession(
  maxRetries: number = 3,
  retryDelays: number[] = [500, 1000, 2000]
): Promise<SessionCheckResult> {
  const startTime = Date.now();
  logger.debug('Verificando sesión', { maxRetries, apiUrl: config.apiUrl });

  let lastError: Error | null = null;
  let lastStatus: number | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = retryDelays[attempt - 1] || 1000;
        logger.debug(
          `Reintentando verificaci?n de sesi?n (intento ${attempt + 1}/${maxRetries + 1})`,
          {
            delay,
          }
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const endpoint = `${config.apiUrl}/v1/auth/me`;
      logger.debug('Llamando endpoint de verificación de sesión', {
        endpoint,
        attempt: attempt + 1,
      });

      const response = await fetchWithLogging(endpoint, {
        credentials: 'include',
        cache: 'no-store', // AI_DECISION: Prevent caching of session check
        timeout: 10000, // 10 second timeout for session check
      });

      lastStatus = response.status;

      if (response.ok) {
        const data = await response.json();

        // Verify response format
        if (!data || typeof data !== 'object') {
          logger.warn('Respuesta de /auth/me tiene formato inv?lido', { data });
          return {
            success: false,
            user: null,
            error: {
              type: 'invalid',
              message: 'Invalid response format from server',
              status: response.status,
            },
          };
        }

        // AI_DECISION: Backend uses createRouteHandler which wraps response in { success, data }
        // Justificación: The actual user data is in data.data, not data.user
        // Impacto: Correct parsing of user data including isGoogleConnected flag
        if (data?.data) {
          const duration = Date.now() - startTime;
          logger.info('Sesi?n verificada exitosamente', {
            userId: data.data.id,
            attempt: attempt + 1,
            duration,
            isGoogleConnected: data.data.isGoogleConnected,
          });

          return {
            success: true,
            user: data.data as AuthUser,
          };
        }

        // No user in response but status is OK - treat as no session
        logger.debug('Respuesta OK pero sin usuario', { data });
        return {
          success: false,
          user: null,
          error: {
            type: 'auth',
            message: 'No active session',
            status: response.status,
          },
        };
      }

      // Handle different error statuses
      if (response.status === 401 || response.status === 403) {
        // Authentication error - don't retry
        const duration = Date.now() - startTime;
        logger.debug('Sesi?n no v?lida', {
          status: response.status,
          attempt: attempt + 1,
          duration,
        });

        return {
          success: false,
          user: null,
          error: {
            type: 'auth',
            message: response.status === 401 ? 'Unauthorized' : 'Forbidden',
            status: response.status,
          },
        };
      }

      // Network/server errors - retry if not last attempt
      if (attempt < maxRetries && (response.status >= 500 || response.status === 0)) {
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        continue; // Retry
      }

      // Other errors - don't retry
      return {
        success: false,
        user: null,
        error: {
          type: 'network',
          message: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const duration = Date.now() - startTime;

      // Check if it's a timeout error
      if (error instanceof Error && error.message.includes('timeout')) {
        if (attempt < maxRetries) {
          logger.warn('Timeout en verificaci?n de sesi?n, reintentando', {
            attempt: attempt + 1,
            error: error.message,
          });
          continue; // Retry
        }

        return {
          success: false,
          user: null,
          error: {
            type: 'timeout',
            message: 'Session verification timeout',
          },
        };
      }

      // Network errors - retry if not last attempt
      if (attempt < maxRetries) {
        logger.warn('Error de red en verificaci?n de sesi?n, reintentando', {
          attempt: attempt + 1,
          error: error instanceof Error ? error.message : String(error),
        });
        continue; // Retry
      }

      // Last attempt failed
      logger.error('Error al verificar sesión después de todos los intentos', {
        attempts: attempt + 1,
        duration,
        error: error instanceof Error ? error.message : String(error),
        apiUrl: config.apiUrl,
        endpoint: `${config.apiUrl}/v1/auth/me`,
      });

      return {
        success: false,
        user: null,
        error: {
          type: 'network',
          message: error instanceof Error ? error.message : 'Network error',
        },
      };
    }
  }

  // All retries exhausted
  const duration = Date.now() - startTime;
  logger.error('Fallo al verificar sesión después de todos los reintentos', {
    attempts: maxRetries + 1,
    duration,
    lastError: lastError?.message,
    lastStatus,
    apiUrl: config.apiUrl,
    endpoint: `${config.apiUrl}/v1/auth/me`,
  });

  return {
    success: false,
    user: null,
    error: {
      type: 'network',
      message: lastError?.message || 'Failed to verify session',
      ...(lastStatus !== undefined && { status: lastStatus }),
    },
  };
}

/**
 * Refresh authentication token
 *
 * @returns True if refresh was successful, false otherwise
 */
export async function refreshToken(): Promise<boolean> {
  try {
    logger.debug('Refrescando token de autenticaci?n');

    const response = await fetchWithLogging(`${config.apiUrl}/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      timeout: 10000,
    });

    if (response.ok) {
      logger.info('Token refrescado exitosamente');
      return true;
    }

    logger.warn('Fallo al refrescar token', { status: response.status });
    return false;
  } catch (error) {
    logger.error('Error al refrescar token', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Check if token is expiring soon
 *
 * Note: Since we use httpOnly cookies, we can't directly inspect the token.
 * This function estimates expiration based on when the session was last verified.
 *
 * @param lastVerified Timestamp when session was last verified (default: now)
 * @param expirationBuffer Buffer time in ms before considering token expired (default: 5 minutes)
 * @param tokenLifetime Estimated token lifetime in ms (default: 24 hours)
 * @returns True if token is likely expiring soon
 */
export function isTokenExpiringSoon(
  lastVerified: number = Date.now(),
  expirationBuffer: number = 5 * 60 * 1000, // 5 minutes
  tokenLifetime: number = 24 * 60 * 60 * 1000 // 24 hours
): boolean {
  const timeSinceVerification = Date.now() - lastVerified;
  const timeUntilExpiration = tokenLifetime - timeSinceVerification;

  return timeUntilExpiration <= expirationBuffer;
}

/**
 * Clear session completely
 *
 * Calls logout endpoint and clears any local state
 */
export async function clearSession(): Promise<void> {
  try {
    logger.info('Limpiando sesi?n');

    await postJson(`${config.apiUrl}/v1/auth/logout`, {}).catch((err) => {
      logger.warn('Error al limpiar cookie en servidor', { err });
    });

    logger.info('Sesi?n limpiada');
  } catch (error) {
    logger.error('Error al limpiar sesi?n', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
