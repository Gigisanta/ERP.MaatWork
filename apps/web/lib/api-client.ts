/**
 * Cliente API centralizado
 * 
 * AI_DECISION: Migración a cookies httpOnly exclusivas
 * Justificación: Más seguro (inmune a XSS), simplifica código (sin dual storage)
 * Impacto: Breaking change - requiere re-login de usuarios activos
 */

import type { ApiResponse, UserApiResponse } from '@/types';
import { ApiError, createApiErrorFromResponse } from './api-error';
import { config } from './config';

interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  requireAuth?: boolean;
}

interface RequestConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}

class ApiClient {
  private config: RequestConfig;

  constructor(configOverride?: Partial<RequestConfig>) {
    this.config = {
      baseUrl: config.apiUrl,
      timeout: config.apiTimeout,
      retries: 1,
      ...configOverride,
    };
  }

  /**
   * Construir headers
   */
  private buildHeaders(options: RequestOptions = {}): HeadersInit {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers as Record<string, string> | undefined),
    };

    // ELIMINADO: Authorization header Bearer token
    // Autenticación ahora es exclusivamente vía cookies httpOnly

    return headers;
  }

  /**
   * Fetch con timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestOptions = {}
  ): Promise<Response> {
    const timeout = options.timeout || this.config.timeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        credentials: 'include',  // NUEVO: Incluir cookies en todas las requests
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(504, 'Request timeout', {
          details: `Request took longer than ${timeout}ms`,
        });
      }

      throw error;
    }
  }

  /**
   * Request con retry logic
   */
  private async requestWithRetry<T>(
    url: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const maxRetries = options.retries ?? this.config.retries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const headers = this.buildHeaders(options);
        const response = await this.fetchWithTimeout(url, {
          ...options,
          headers,
        });

        // Si no es exitoso, throw error
        if (!response.ok) {
          throw await createApiErrorFromResponse(response);
        }

        // Parse response and normalize to ApiResponse<T>
        const data = await response.json();
        // Normalize backend responses that use { ok: boolean, ... } instead of { success }
        if (data && typeof data === 'object' && !('success' in data) && 'ok' in data) {
          const ok = Boolean((data as any).ok);
          const normalized: ApiResponse<T> = {
            success: ok,
            data: data as T,
          };
          // Propagate error message if present
          if (!ok && (data as any).error) {
            normalized.error = (data as any).error as string;
          }
          return normalized;
        }
        return data as ApiResponse<T>;

      } catch (error) {
        lastError = error as Error;

        // Si es el último intento o es error que no debemos reintentar, throw
        if (
          attempt === maxRetries ||
          error instanceof ApiError && !this.shouldRetry(error)
        ) {
          throw error;
        }

        // Esperar antes de reintentar (backoff exponencial)
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }

    throw lastError || new ApiError(500, 'Request failed after retries');
  }

  /**
   * Determinar si se debe reintentar
   */
  private shouldRetry(error: ApiError): boolean {
    // Solo reintentar errores del servidor o timeout
    return error.status >= 500 || error.status === 504;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * GET request
   */
  async get<T = unknown>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    return this.requestWithRetry<T>(url, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    endpoint: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const requestOptions: RequestOptions = {
      ...options,
      method: 'POST',
    };
    if (body !== undefined) {
      if (typeof FormData !== 'undefined' && body instanceof FormData) {
        requestOptions.body = body as BodyInit;
      } else {
        requestOptions.body = JSON.stringify(body);
      }
    }
    return this.requestWithRetry<T>(url, requestOptions);
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    endpoint: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const requestOptions: RequestOptions = {
      ...options,
      method: 'PUT',
    };
    if (body !== undefined) {
      if (typeof FormData !== 'undefined' && body instanceof FormData) {
        requestOptions.body = body as BodyInit;
      } else {
        requestOptions.body = JSON.stringify(body);
      }
    }
    return this.requestWithRetry<T>(url, requestOptions);
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const requestOptions: RequestOptions = {
      ...options,
      method: 'PATCH',
    };
    if (body !== undefined) {
      if (typeof FormData !== 'undefined' && body instanceof FormData) {
        requestOptions.body = body as BodyInit;
      } else {
        requestOptions.body = JSON.stringify(body);
      }
    }
    return this.requestWithRetry<T>(url, requestOptions);
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    return this.requestWithRetry<T>(url, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * Login helper
   */
  async login(email: string, password: string): Promise<ApiResponse<{ user: UserApiResponse }>> {
    const response = await this.post<{ user: UserApiResponse }>(
      '/v1/auth/login',
      { identifier: email, password },
      { requireAuth: false }
    );

    // Cookie ya establecida por backend, solo retornar response
    return response;
  }

  /**
   * Logout helper
   */
  async logout(): Promise<void> {
    await this.post('/v1/auth/logout', {});
  }
}

// Instancia singleton
export const apiClient = new ApiClient();

// Re-export class and types
export { ApiError, ApiClient };
export type { ApiResponse };

