/**
 * API Client
 *
 * Main API client using modular components for:
 * - Request building (headers, body serialization)
 * - Retry logic with exponential backoff
 * - Auth management (token refresh)
 *
 * AI_DECISION: Migración a cookies httpOnly exclusivas
 * Justificación: Más seguro (inmune a XSS), simplifica código (sin dual storage)
 * Impacto: Breaking change - requiere re-login de usuarios activos
 *
 * AI_DECISION: Unificación con fetchWithLogging
 * Justificación: Eliminar duplicación de código y garantizar logging/requestId consistentes
 * Impacto: Menor superficie de errores, observabilidad mejorada
 */

import type { ApiResponse, UserApiResponse } from '@/types';
import { ApiError, createApiErrorFromResponse } from '../api-error';
import { config as appConfig } from '../config';
import { buildHeaders, serializeBody, buildUrl } from './request-builder';
import { shouldRetry, calculateRetryDelay, delay } from './retry-handler';
import { AuthManager } from './auth-manager';
import type { RequestOptions, RequestConfig } from './types';
import { fetchWithLogging } from '../fetch-client';

export class ApiClient {
  private config: RequestConfig;
  private authManager: AuthManager;

  constructor(configOverride?: Partial<RequestConfig>) {
    this.config = {
      baseUrl: appConfig.apiUrl,
      timeout: appConfig.apiTimeout,
      retries: 2, // AI_DECISION: 2 retries = 3 total attempts for better resilience
      ...configOverride,
    };

    // Use fetchWithLogging internally within authManager as well
    this.authManager = new AuthManager(this.config, this.fetchWrapper.bind(this));
  }

  /**
   * Internal wrapper to adapt fetchWithLogging signature to AuthManager expectations
   */
  private async fetchWrapper(url: string, options: RequestInit = {}): Promise<Response> {
    const requestOptions = options as RequestOptions;
    return fetchWithLogging(url, {
      ...options,
      timeout: requestOptions.timeout || this.config.timeout,
      // If requestId is in headers, extract it to pass explicitly to logging wrapper
      // otherwise fetchWithLogging will generate one
      requestId:
        (options.headers as Record<string, string>)?.['X-Request-ID'] || requestOptions.requestId,
    });
  }

  /**
   * Request with retry logic
   */
  private async requestWithRetry<T>(
    url: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const maxRetries = options.retries ?? this.config.retries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const headers = buildHeaders(options);

        // Use standard fetchWithLogging wrapper
        const response = await fetchWithLogging(url, {
          ...options,
          headers,
          timeout: options.timeout || this.config.timeout,
          requestId: options.requestId,
        });

        // Handle non-successful responses
        if (!response.ok) {
          const error = await createApiErrorFromResponse(response);

          // Handle 401/403 authentication errors
          if (response.status === 401 || response.status === 403) {
            console.log('[ApiClient] Recibido error de autenticación', {
              status: response.status,
              url,
              attempt,
              isRefreshInProgress: this.authManager.isRefreshInProgress,
              timestamp: new Date().toISOString()
            });

            // Try to refresh token on 401 (only on first attempt)
            if (response.status === 401 && !this.authManager.isRefreshInProgress && attempt === 0) {
              console.log('[ApiClient] Intentando refrescar token...');
              try {
                const refreshed = await this.authManager.handle401();
                if (refreshed) {
                  console.log('[ApiClient] Token refrescado exitosamente, reintentando request');
                  // Emit event to notify AuthContext of successful refresh
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('auth:token-refreshed'));
                  }
                  // Retry original request after successful refresh
                  return this.requestWithRetry<T>(url, { ...options, retries: 0 });
                } else {
                  console.log('[ApiClient] Refresh falló, emitiendo evento de sesión expirada');
                }
              } catch (refreshError) {
                console.error('[ApiClient] Error durante refresh, emitiendo evento de sesión expirada', {
                  error: refreshError instanceof Error ? refreshError.message : String(refreshError),
                  url,
                  timestamp: new Date().toISOString()
                });
                // Refresh failed, emit auth error event
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(
                    new CustomEvent('auth:session-expired', {
                      detail: {
                        error:
                          refreshError instanceof Error
                            ? refreshError.message
                            : String(refreshError),
                      },
                    })
                  );
                }
                throw error;
              }
            }

            // 403 or 401 after refresh failed - emit session expired event
            console.error('[ApiClient] Emitiendo evento auth:session-expired', {
              status: response.status,
              url,
              message: response.status === 403 ? 'Forbidden' : 'Unauthorized',
              timestamp: new Date().toISOString()
            });
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('auth:session-expired', {
                  detail: {
                    status: response.status,
                    message: response.status === 403 ? 'Forbidden' : 'Unauthorized',
                  },
                })
              );
            }
          }

          // Extract Retry-After header for 429
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            if (retryAfter) {
              (error as ApiError & { retryAfter?: string }).retryAfter = retryAfter;
            }
          }

          throw error;
        }

        // Parse and normalize response
        return await this.normalizeResponse<T>(response);
      } catch (error) {
        lastError = error as Error;

        // If last attempt or non-retryable error, throw
        if (attempt === maxRetries || (error instanceof ApiError && !shouldRetry(error))) {
          throw error;
        }

        // Calculate and wait for backoff delay
        if (error instanceof ApiError) {
          const retryAfter = (error as ApiError & { retryAfter?: string }).retryAfter;
          const delayMs = calculateRetryDelay(error, attempt, retryAfter);
          await delay(delayMs);
        } else {
          await delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError || new ApiError('Request failed after retries', 500);
  }

  /**
   * Normalize backend response to ApiResponse<T>
   */
  private async normalizeResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const data = await response.json();

    // Normalize responses that use { ok: boolean } instead of { success }
    if (data && typeof data === 'object' && !('success' in data) && 'ok' in data) {
      const ok = Boolean((data as { ok: boolean }).ok);
      const normalized: ApiResponse<T> = {
        success: ok,
        data: data as T,
      };
      if (!ok && (data as { error?: string }).error) {
        normalized.error = (data as { error: string }).error;
      }
      return normalized;
    }

    return data as ApiResponse<T>;
  }

  // HTTP Methods

  async get<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.requestWithRetry<T>(buildUrl(this.config.baseUrl, endpoint), {
      ...options,
      method: 'GET',
    });
  }

  async post<T = unknown>(
    endpoint: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const serializedBody = serializeBody(body);
    return this.requestWithRetry<T>(buildUrl(this.config.baseUrl, endpoint), {
      ...options,
      method: 'POST',
      ...(serializedBody !== null && { body: serializedBody }),
    });
  }

  async put<T = unknown>(
    endpoint: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const serializedBody = serializeBody(body);
    return this.requestWithRetry<T>(buildUrl(this.config.baseUrl, endpoint), {
      ...options,
      method: 'PUT',
      ...(serializedBody !== null && { body: serializedBody }),
    });
  }

  async patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const serializedBody = serializeBody(body);
    return this.requestWithRetry<T>(buildUrl(this.config.baseUrl, endpoint), {
      ...options,
      method: 'PATCH',
      ...(serializedBody !== null && { body: serializedBody }),
    });
  }

  async delete<T = unknown>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.requestWithRetry<T>(buildUrl(this.config.baseUrl, endpoint), {
      ...options,
      method: 'DELETE',
    });
  }

  // Auth Helpers

  async login(email: string, password: string): Promise<ApiResponse<{ user: UserApiResponse }>> {
    return this.post<{ user: UserApiResponse }>(
      '/v1/auth/login',
      { identifier: email, password },
      { requireAuth: false }
    );
  }

  async logout(): Promise<void> {
    await this.post('/v1/auth/logout', {});
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
