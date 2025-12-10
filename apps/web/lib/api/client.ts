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
 */

import type { ApiResponse, UserApiResponse } from '@/types';
import { ApiError, createApiErrorFromResponse } from '../api-error';
import { config as appConfig } from '../config';
import { buildHeaders, serializeBody, buildUrl } from './request-builder';
import { shouldRetry, calculateRetryDelay, delay } from './retry-handler';
import { AuthManager } from './auth-manager';
import type { RequestOptions, RequestConfig } from './types';

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

    this.authManager = new AuthManager(this.config, this.fetchWithTimeout.bind(this));
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const timeout = (options as RequestOptions).timeout || this.config.timeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        credentials: 'include', // Include cookies in all requests
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('Request timeout', 504, {
          details: `Request took longer than ${timeout}ms`,
        });
      }

      throw error;
    }
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
        const response = await this.fetchWithTimeout(url, {
          ...options,
          headers,
        });

        // Handle non-successful responses
        if (!response.ok) {
          const error = await createApiErrorFromResponse(response);

          // Handle 401 with automatic token refresh (only on first attempt)
          if (response.status === 401 && !this.authManager.isRefreshInProgress && attempt === 0) {
            try {
              await this.authManager.handle401();
              // Retry original request after successful refresh
              return this.requestWithRetry<T>(url, { ...options, retries: 0 });
            } catch {
              throw error;
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
