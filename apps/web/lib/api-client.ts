/**
 * Cliente API centralizado
 * 
 * AI_DECISION: Abstracción centralizada de fetch
 * Justificación: Elimina duplicación, manejo consistente de errores, retry logic
 * Impacto: 15+ bloques de código duplicado eliminados
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
  private tokenKey = 'token';
  private refreshTokenKey = 'refreshToken';

  constructor(configOverride?: Partial<RequestConfig>) {
    this.config = {
      baseUrl: config.apiUrl,
      timeout: config.apiTimeout,
      retries: 1,
      ...configOverride,
    };
  }

  /**
   * Obtener token de autenticación
   */
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Guardar token
   */
  private setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.tokenKey, token);
  }

  /**
   * Eliminar token
   */
  private clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
  }

  /**
   * Construir headers
   */
  private buildHeaders(options: RequestOptions = {}): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };

    // Agregar token si se requiere auth (default: true)
    const requireAuth = options.requireAuth !== false;
    if (requireAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

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

        // Si es 401, intentar refresh token (solo una vez)
        if (response.status === 401 && attempt === 0) {
          const refreshed = await this.tryRefreshToken();
          if (refreshed) {
            continue; // Retry con nuevo token
          } else {
            // No se pudo refrescar, limpiar y retornar error
            this.clearToken();
            throw await createApiErrorFromResponse(response);
          }
        }

        // Si no es exitoso, throw error
        if (!response.ok) {
          throw await createApiErrorFromResponse(response);
        }

        // Parse response
        const data = await response.json();
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
   * Intentar refresh token
   */
  private async tryRefreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem(this.refreshTokenKey);
      if (!refreshToken) return false;

      const response = await fetch(`${this.config.baseUrl}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      if (data.success && data.data?.token) {
        this.setToken(data.data.token);
        return true;
      }

      return false;
    } catch {
      return false;
    }
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
      ...(body && { body: JSON.stringify(body) }),
    };
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
      ...(body && { body: JSON.stringify(body) }),
    };
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
      ...(body && { body: JSON.stringify(body) }),
    };
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
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: UserApiResponse }>> {
    const response = await this.post<{ token: string; refreshToken?: string; user: UserApiResponse }>(
      '/v1/auth/login',
      { email, password },
      { requireAuth: false }
    );

    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
      if (response.data.refreshToken) {
        localStorage.setItem(this.refreshTokenKey, response.data.refreshToken);
      }
    }

    return response;
  }

  /**
   * Logout helper
   */
  logout(): void {
    this.clearToken();
  }
}

// Instancia singleton
export const apiClient = new ApiClient();

// Re-export class and types
export { ApiError, ApiClient };
export type { ApiResponse };

