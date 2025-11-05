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
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(configOverride?: Partial<RequestConfig>) {
    this.config = {
      baseUrl: config.apiUrl,
      timeout: config.apiTimeout,
      retries: 2, // AI_DECISION: Aumentar retries por defecto de 1 a 2 (3 intentos totales)
      // Justificación: Mejor resiliencia ante errores transitorios de red
      // Impacto: Más intentos antes de fallar, mejor UX en condiciones de red inestable
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

        // Si no es exitoso, manejar según código de estado
        if (!response.ok) {
          const error = await createApiErrorFromResponse(response);
          
          // AI_DECISION: Manejar 401 con refresh token automático
          // Justificación: Mejora UX, evita deslogueos por tokens expirados
          // Solo un refresh por request para evitar loops infinitos
          // Impacto: Sesiones más largas sin interrupciones
          if (response.status === 401 && !this.isRefreshing && attempt === 0) {
            // Solo intentar refresh en el primer intento
            try {
              return await this.handle401AuthError<T>(url, options);
            } catch (refreshError) {
              // Si el refresh falla, lanzar el error original
              throw error;
            }
          }
          
          // AI_DECISION: Extraer Retry-After header para 429
          // Justificación: Permite respetar el tiempo de espera especificado por el servidor
          // Impacto: Mejor manejo de rate limits, evita reintentos prematuros
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            if (retryAfter) {
              // Agregar Retry-After a details para uso en backoff
              (error as any).retryAfter = retryAfter;
            }
          }
          
          throw error;
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

        // AI_DECISION: Mejorar backoff para 429 usando Retry-After header
        // Justificación: Rate limiting puede especificar tiempo de espera exacto
        // Impacto: Respeta límites del servidor, evita reintentos innecesarios
        let delayMs: number;
        if (error instanceof ApiError && error.status === 429) {
          // Intentar usar Retry-After header si está presente (guardado en error.retryAfter)
          const retryAfter = (error as any).retryAfter;
          if (retryAfter) {
            const retryAfterSeconds = parseInt(retryAfter, 10);
            if (!isNaN(retryAfterSeconds) && retryAfterSeconds > 0) {
              delayMs = retryAfterSeconds * 1000; // Convertir segundos a ms
            } else {
              // Si Retry-After es una fecha HTTP, calcular diferencia
              const retryAfterDate = new Date(retryAfter);
              if (!isNaN(retryAfterDate.getTime())) {
                const now = Date.now();
                const retryTime = retryAfterDate.getTime();
                delayMs = Math.max(0, retryTime - now);
              } else {
                // Fallback a exponential backoff con jitter
                const baseDelay = Math.pow(2, attempt) * 1000;
                const jitter = Math.random() * 1000;
                delayMs = baseDelay + jitter;
              }
            }
          } else {
            // Exponential backoff con jitter para evitar thundering herd
            const baseDelay = Math.pow(2, attempt) * 1000;
            const jitter = Math.random() * 1000; // 0-1 segundo de jitter
            delayMs = baseDelay + jitter;
          }
        } else {
          // Exponential backoff estándar para otros errores
          delayMs = Math.pow(2, attempt) * 1000;
        }

        await this.delay(delayMs);
      }
    }

    throw lastError || new ApiError(500, 'Request failed after retries');
  }

  /**
   * Determinar si se debe reintentar
   */
  private shouldRetry(error: ApiError): boolean {
    // AI_DECISION: Agregar retry para 429 (Too Many Requests)
    // Justificación: Rate limiting puede ser temporal, retry con backoff apropiado
    // Impacto: Mejor manejo de rate limits, menos errores visibles al usuario
    return error.status >= 500 || error.status === 504 || error.status === 429;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Intentar refresh token automáticamente
   * 
   * AI_DECISION: Implementar refresh token automático para 401
   * Justificación: Mejora UX, evita que usuarios sean deslogueados por tokens expirados
   * Impacto: Sesiones más largas sin interrupciones, mejor experiencia
   * 
   * Nota: Actualmente no hay endpoint de refresh, pero la lógica está preparada
   * Cuando se agregue /v1/auth/refresh, esta función lo usará automáticamente
   */
  private async refreshToken(): Promise<boolean> {
    // Si ya hay un refresh en progreso, esperar a que termine
    if (this.isRefreshing && this.refreshPromise) {
      return await this.refreshPromise;
    }

    // Prevenir múltiples refreshes simultáneos
    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        // Intentar llamar a endpoint de refresh (si existe)
        // Por ahora, como no hay endpoint, retornar false
        // Cuando se agregue /v1/auth/refresh, descomentar:
        /*
        const response = await this.fetchWithTimeout(`${this.config.baseUrl}/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include'
        });

        if (response.ok) {
          // Cookie actualizada automáticamente por el servidor
          return true;
        }
        */

        // Por ahora, no hay endpoint de refresh, retornar false
        return false;
      } catch (error) {
        // Si falla el refresh, retornar false
        return false;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return await this.refreshPromise;
  }

  /**
   * Manejar error 401 intentando refresh token
   */
  private async handle401AuthError<T>(
    url: string,
    options: RequestOptions
  ): Promise<ApiResponse<T>> {
    // Intentar refresh token
    const refreshed = await this.refreshToken();
    
    if (!refreshed) {
      // Si no se pudo refrescar, lanzar error de autenticación
      throw new ApiError(401, 'Session expired');
    }

    // Retry request original después de refresh exitoso
    return this.requestWithRetry<T>(url, {
      ...options,
      retries: 0 // No retry adicional después de refresh
    });
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

