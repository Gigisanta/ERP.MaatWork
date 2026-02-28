/**
 * Python Analytics Service HTTP Client
 *
 * AI_DECISION: Centralizar llamadas fetch al servicio Python
 * Justificación: Actualmente hay 11 archivos usando fetch() manualmente para comunicar
 *                con el servicio de analytics (localhost:3002). Esto causa:
 *                - Duplicación de lógica de timeout, headers, y error handling
 *                - Dificultad para mantener consistencia de configuración
 *                - Ausencia de retry automático o circuit breaker
 * Impacto: Cliente centralizado permite agregar retry, circuit breaker, logging estructurado,
 *                y mantenimiento simplificado en un solo lugar
 */

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:3002';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface PythonClientConfig {
  timeout?: number;
  signal?: AbortSignal;
}

interface RequestConfig extends PythonClientConfig {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
}

interface PythonClientResponse<T = unknown> {
  success: boolean;
  data: T;
  error?: string;
}

/**
 * Parsea respuesta JSON del servicio Python
 */
function parseResponse<T>(response: Response, data: unknown): PythonClientResponse<T> {
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    return parsed;
  } catch (error) {
    return {
      success: false,
      error: 'Failed to parse response',
      data: null as unknown as T,
    };
  }
}

/**
 * Crea un AbortController con timeout configurable
 */
function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController();

  setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return controller;
}

/**
 * Ejecuta una petición HTTP al servicio Python
 */
export async function pythonFetch<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<PythonClientResponse<T>> {
  const {
    timeout = 10000, // 10s default
    signal,
    method = 'GET',
    headers = {},
    body,
  } = config;

  const controller = createTimeoutController(timeout);
  const combinedSignal = signal ? AbortSignal.any([controller.signal, signal]) : controller.signal;

  try {
    const url = `${PYTHON_SERVICE_URL}${endpoint}`;

    const init: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: combinedSignal,
    };
    if (body !== undefined && body !== null) {
      init.body = JSON.stringify(body);
    }
    const response = await fetch(url, init);

    if (!response.ok) {
      // Manejo de errores HTTP comunes
      const errorText = await response.text();
      throw new Error(`Python service error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    return parseResponse<T>(response, data);
  } catch (error) {
    if (error instanceof Error) {
      // AbortError es esperado por timeout
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: `Request timeout after ${timeout}ms`,
          data: null as unknown as T,
        };
      }

      // Errores de conexión
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
        return {
          success: false,
          error: 'Python service unavailable - connection error',
          data: null as unknown as T,
        };
      }
    }

    // Otros errores
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null as unknown as T,
    };
  }
}

/**
 * Métodos de conveniencia para operaciones comunes
 */
export const pythonClient = {
  /**
   * GET request
   */
  async get<T>(endpoint: string, config?: RequestConfig): Promise<PythonClientResponse<T>> {
    return pythonFetch<T>(endpoint, { ...config, method: 'GET' });
  },

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<PythonClientResponse<T>> {
    return pythonFetch<T>(endpoint, { ...config, method: 'POST', body: data });
  },

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<PythonClientResponse<T>> {
    return pythonFetch<T>(endpoint, { ...config, method: 'PUT', body: data });
  },

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, config?: RequestConfig): Promise<PythonClientResponse<T>> {
    return pythonFetch<T>(endpoint, { ...config, method: 'DELETE' });
  },

  /**
   * POST request con abort signal explícito (para usar con AbortController existente)
   */
  async postWithSignal<T>(
    endpoint: string,
    data: unknown,
    signal: AbortSignal
  ): Promise<PythonClientResponse<T>> {
    return pythonFetch<T>(endpoint, { method: 'POST', body: data, signal });
  },
};

/**
 * Exportar URL base para uso en otros módulos si es necesario
 */
export { PYTHON_SERVICE_URL };
