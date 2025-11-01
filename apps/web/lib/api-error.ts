/**
 * Custom API Error class
 * 
 * AI_DECISION: Clase de error custom para manejo consistente
 * Justificación: Permite distinguir errores de API de otros errores
 * Impacto: Mejor debugging y manejo de errores
 */

export class ApiError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly details?: string | string[];
  public readonly timestamp?: string;

  constructor(
    status: number,
    message: string,
    options?: {
      statusText?: string;
      details?: string | string[];
      timestamp?: string;
    }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = options?.statusText || this.getDefaultStatusText(status);
    this.details = options?.details;
    this.timestamp = options?.timestamp || new Date().toISOString();

    // Mantener stack trace correcto
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  private getDefaultStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
    };

    return statusTexts[status] || 'Unknown Error';
  }

  /**
   * Determinar si el error es por autenticación
   */
  get isAuthError(): boolean {
    return this.status === 401;
  }

  /**
   * Determinar si el error es por permisos
   */
  get isForbiddenError(): boolean {
    return this.status === 403;
  }

  /**
   * Determinar si el error es por validación
   */
  get isValidationError(): boolean {
    return this.status === 400 || this.status === 422;
  }

  /**
   * Determinar si el error es del servidor
   */
  get isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Obtener mensaje amigable para el usuario
   */
  get userMessage(): string {
    if (this.isAuthError) {
      return 'Sesión expirada. Por favor, inicia sesión nuevamente.';
    }

    if (this.isForbiddenError) {
      return 'No tienes permisos para realizar esta acción.';
    }

    if (this.isValidationError) {
      return this.message || 'Los datos proporcionados no son válidos.';
    }

    if (this.isServerError) {
      return 'Error en el servidor. Por favor, intenta nuevamente más tarde.';
    }

    return this.message || 'Ha ocurrido un error inesperado.';
  }

  /**
   * Serializar para logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      statusText: this.statusText,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * Crear ApiError desde Response
 */
export async function createApiErrorFromResponse(response: Response): Promise<ApiError> {
  let errorData: any;
  
  try {
    errorData = await response.json();
  } catch {
    // Si no es JSON, usar texto
    errorData = { error: await response.text() };
  }

  return new ApiError(
    response.status,
    errorData.error || errorData.message || response.statusText,
    {
      statusText: response.statusText,
      details: errorData.details,
      timestamp: errorData.timestamp,
    }
  );
}

