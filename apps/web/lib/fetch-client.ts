/**
 * Wrapper de fetch con logging estructurado y correlación de request IDs
 * Reemplaza fetch nativo para incluir X-Request-ID automáticamente
 * REGLA CURSOR: Mantener propagación de X-Request-ID, no alterar estructura de logging, preservar correlación
 */

import { logger } from './logger';

export interface FetchOptions extends RequestInit {
  skipLogging?: boolean;
  requestId?: string;
}

/**
 * Genera un request ID único para correlación con el backend
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Wrapper de fetch con logging automático y correlación
 */
export async function fetchWithLogging(
  url: string | URL,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    skipLogging = false,
    requestId = generateRequestId(),
    ...fetchOptions
  } = options;

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
      body: fetchOptions.body ? '[BODY]' : undefined
    });
  }

  try {
    const response = await fetch(fullUrl, {
      ...fetchOptions,
      headers
    });

    const duration = Date.now() - startTime;

    // Log de la respuesta
    if (!skipLogging) {
      logger.logResponse(method, fullUrl, response.status, duration, requestId, {
        responseHeaders: Object.fromEntries(response.headers.entries())
      });
    }

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Log del error de red
    if (!skipLogging) {
      logger.logNetworkError(
        method,
        fullUrl,
        error as Error,
        requestId,
        { duration }
      );
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
      ...options.headers
    }
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
      errorData.message || errorData.error || 
      `HTTP ${response.status}: ${response.statusText}`
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
    body: JSON.stringify(data)
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
    body: JSON.stringify(data)
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
    method: 'DELETE'
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
    method: 'GET'
  });
}
