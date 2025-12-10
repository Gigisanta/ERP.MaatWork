/**
 * Wrapper de fetch con logging estructurado y correlación de request IDs
 * Reemplaza fetch nativo para incluir X-Request-ID automáticamente
 * REGLA CURSOR: Mantener propagación de X-Request-ID, no alterar estructura de logging, preservar correlación
 *
 * AI_DECISION: Mantener fetch directo en lugar de usar apiClient
 * Justificación: Este archivo ES un wrapper de fetch que agrega funcionalidad específica:
 *                 - Logging estructurado con correlación de request IDs
 *                 - Propagación automática de X-Request-ID header
 *                 - Timeout configurable con logging de errores
 *                 Si usáramos apiClient aquí, crearíamos una dependencia circular ya que
 *                 apiClient podría usar este wrapper. Este wrapper es la capa base de logging.
 * Impacto: Mantiene separación de responsabilidades - este wrapper es para logging,
 *          apiClient es para retry logic y manejo de autenticación
 */

import { logger } from './logger';

export interface FetchOptions extends RequestInit {
  skipLogging?: boolean;
  requestId?: string;
  timeout?: number; // Timeout en milisegundos (por defecto: 30000)
}

/**
 * Genera un request ID único para correlación con el backend
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Wrapper de fetch con logging automático y correlación
 * AI_DECISION: Agregar timeout por defecto para prevenir requests colgadas
 * Justificación: Previene que el frontend se quede esperando indefinidamente
 * Impacto: Todas las requests tienen timeout de 30s por defecto
 */
export async function fetchWithLogging(
  url: string | URL,
  options: FetchOptions = {}
): Promise<Response> {
  const { skipLogging = false, requestId = generateRequestId(), ...fetchOptions } = options;

  const startTime = Date.now();
  const method = fetchOptions.method || 'GET';
  const fullUrl = typeof url === 'string' ? url : url.toString();

  // Agregar X-Request-ID a los headers
  const headers = new Headers(fetchOptions.headers);
  headers.set('X-Request-ID', requestId);

  // Log del request
  if (!skipLogging) {
    logger.logRequest(method, fullUrl, requestId, {
      headers: Object.fromEntries(headers.entries()),
      body: fetchOptions.body ? '[BODY]' : undefined,
    });
  }

  // Timeout por defecto de 30 segundos para prevenir requests colgadas
  const timeout = options.timeout ?? 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(fullUrl, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
      credentials: 'include', // NUEVO: Incluir cookies en todas las requests
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    // Log de la respuesta
    if (!skipLogging) {
      logger.logResponse(method, fullUrl, response.status, duration, requestId, {
        responseHeaders: Object.fromEntries(response.headers.entries()),
      });
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    // Convertir AbortError en timeout error más descriptivo
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new Error(`Request timeout after ${timeout}ms`);

      if (!skipLogging) {
        logger.logNetworkError(method, fullUrl, timeoutError, requestId, { duration, timeout });
      }

      throw timeoutError;
    }

    // Para otros errores, loguear y relanzar
    if (!skipLogging) {
      logger.logNetworkError(method, fullUrl, error as Error, requestId, { duration });
    }

    throw error;
  }
}

/**
 * Helper para requests JSON con logging automático
 */
export async function fetchJson<T = unknown>(
  url: string | URL,
  options: FetchOptions = {}
): Promise<T> {
  const response = await fetchWithLogging(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    type ErrorResponse = {
      message?: string;
      error?: string;
    };

    let errorData: ErrorResponse;

    try {
      errorData = JSON.parse(errorText) as ErrorResponse;
    } catch {
      errorData = { message: errorText };
    }

    throw new Error(
      errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Helper para requests POST con JSON
 */
export async function postJson<T = unknown>(
  url: string | URL,
  data: unknown,
  options: Omit<FetchOptions, 'method' | 'body'> = {}
): Promise<T> {
  return fetchJson<T>(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Helper para requests PUT con JSON
 */
export async function putJson<T = unknown>(
  url: string | URL,
  data: unknown,
  options: Omit<FetchOptions, 'method' | 'body'> = {}
): Promise<T> {
  return fetchJson<T>(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Helper para requests DELETE
 */
export async function deleteJson<T = unknown>(
  url: string | URL,
  options: Omit<FetchOptions, 'method'> = {}
): Promise<T> {
  return fetchJson<T>(url, {
    ...options,
    method: 'DELETE',
  });
}

/**
 * Helper para requests GET con query parameters
 */
export async function getJson<T = unknown>(
  url: string | URL,
  params?: Record<string, string | number | boolean>,
  options: Omit<FetchOptions, 'method'> = {}
): Promise<T> {
  let fullUrl = typeof url === 'string' ? url : url.toString();

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    fullUrl += `?${searchParams.toString()}`;
  }

  return fetchJson<T>(fullUrl, {
    ...options,
    method: 'GET',
  });
}
