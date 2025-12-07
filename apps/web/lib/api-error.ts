/**
 * Custom API Error class
 * 
 * AI_DECISION: Clase de error custom para manejo consistente
 * Justificación: Permite distinguir errores de API de otros errores
 * Impacto: Mejor debugging y manejo de errores
 */

/**
 * Actionable error message with suggested action
 */
export interface ActionableMessage {
  /** User-friendly error message */
  message: string;
  /** Suggested action for the user */
  action: string;
  /** Action type for UI rendering */
  actionType: 'retry' | 'login' | 'contact_support' | 'fix_input' | 'refresh' | 'none';
  /** Whether the error is likely recoverable with a retry */
  isRetryable: boolean;
  /** Suggested button text */
  buttonText?: string;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly details?: string | string[] | Record<string, unknown>[] | undefined;
  public readonly timestamp?: string;
  public readonly requestId?: string;

  constructor(
    message: string,
    status: number,
    options?: {
      statusText?: string;
      details?: string | string[] | Record<string, unknown>[] | undefined;
      timestamp?: string;
      requestId?: string;
    }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = options?.statusText || this.getDefaultStatusText(status);
    this.details = options?.details;
    this.timestamp = options?.timestamp || new Date().toISOString();
    if (options?.requestId !== undefined) {
      this.requestId = options.requestId;
    }

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
   * Determinar si el error es por rate limiting
   */
  get isRateLimitError(): boolean {
    return this.status === 429;
  }

  /**
   * Determinar si el error es de red/timeout
   */
  get isNetworkError(): boolean {
    return this.status === 0 || this.status === 504;
  }

  /**
   * Determinar si el recurso no fue encontrado
   */
  get isNotFoundError(): boolean {
    return this.status === 404;
  }

  /**
   * Determinar si es un conflicto (ej: recurso ya existe)
   */
  get isConflictError(): boolean {
    return this.status === 409;
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

    if (this.isRateLimitError) {
      return 'Demasiadas solicitudes. Por favor, espera un momento antes de intentar nuevamente.';
    }

    if (this.isNetworkError) {
      return 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.';
    }

    if (this.isNotFoundError) {
      return 'El recurso solicitado no fue encontrado.';
    }

    if (this.isConflictError) {
      return 'El recurso ya existe o hay un conflicto con los datos actuales.';
    }

    if (this.isServerError) {
      return 'Error en el servidor. Por favor, intenta nuevamente más tarde.';
    }

    return this.message || 'Ha ocurrido un error inesperado.';
  }

  /**
   * AI_DECISION: Obtener mensaje con acción sugerida
   * Justificación: Proporciona al usuario no solo qué pasó sino qué puede hacer
   * Impacto: Mejor UX, usuarios pueden resolver problemas más fácilmente
   */
  getActionableMessage(): ActionableMessage {
    if (this.isAuthError) {
      return {
        message: 'Tu sesión ha expirado.',
        action: 'Inicia sesión nuevamente para continuar.',
        actionType: 'login',
        isRetryable: false,
        buttonText: 'Iniciar sesión',
      };
    }

    if (this.isForbiddenError) {
      return {
        message: 'No tienes permisos para esta acción.',
        action: 'Contacta a un administrador si crees que deberías tener acceso.',
        actionType: 'contact_support',
        isRetryable: false,
        buttonText: 'Contactar soporte',
      };
    }

    if (this.isValidationError) {
      return {
        message: this.message || 'Los datos proporcionados no son válidos.',
        action: 'Revisa los campos marcados y corrige los errores.',
        actionType: 'fix_input',
        isRetryable: false,
      };
    }

    if (this.isRateLimitError) {
      return {
        message: 'Has realizado demasiadas solicitudes.',
        action: 'Espera un momento antes de intentar nuevamente.',
        actionType: 'retry',
        isRetryable: true,
        buttonText: 'Reintentar',
      };
    }

    if (this.isNetworkError) {
      return {
        message: 'Error de conexión.',
        action: 'Verifica tu conexión a internet e intenta nuevamente.',
        actionType: 'retry',
        isRetryable: true,
        buttonText: 'Reintentar',
      };
    }

    if (this.isNotFoundError) {
      return {
        message: 'El recurso no fue encontrado.',
        action: 'El elemento puede haber sido eliminado o movido.',
        actionType: 'refresh',
        isRetryable: false,
        buttonText: 'Actualizar página',
      };
    }

    if (this.isConflictError) {
      return {
        message: 'Conflicto con los datos actuales.',
        action: 'El recurso puede haber sido modificado. Recarga la página para ver los cambios más recientes.',
        actionType: 'refresh',
        isRetryable: false,
        buttonText: 'Recargar',
      };
    }

    if (this.isServerError) {
      return {
        message: 'Error en el servidor.',
        action: 'Estamos trabajando para solucionarlo. Por favor, intenta nuevamente en unos minutos.',
        actionType: 'retry',
        isRetryable: true,
        buttonText: 'Reintentar',
      };
    }

    return {
      message: this.message || 'Ha ocurrido un error inesperado.',
      action: 'Si el problema persiste, contacta al soporte técnico.',
      actionType: 'none',
      isRetryable: false,
    };
  }

  /**
   * Obtener detalles de validación formateados
   */
  getValidationDetails(): Array<{ field: string; message: string }> {
    if (!this.details) return [];

    if (Array.isArray(this.details)) {
      return this.details
        .filter((d): d is Record<string, unknown> => typeof d === 'object' && d !== null)
        .map((detail) => ({
          field: String(detail.path || detail.field || ''),
          message: String(detail.message || ''),
        }))
        .filter((d) => d.field || d.message);
    }

    return [];
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
      requestId: this.requestId,
      stack: this.stack,
    };
  }
}

/**
 * Crear ApiError desde Response
 */
export async function createApiErrorFromResponse(response: Response): Promise<ApiError> {
  type ErrorResponse = {
    error?: string;
    message?: string;
    details?: string | string[] | Record<string, unknown>[];
    timestamp?: string;
    requestId?: string;
  };
  
  let errorData: ErrorResponse;
  
  try {
    errorData = await response.json() as ErrorResponse;
  } catch {
    // Si no es JSON, usar texto
    const textData = await response.text();
    errorData = { error: textData };
  }

  const options: {
    statusText?: string;
    details?: string | string[] | Record<string, unknown>[];
    timestamp?: string;
    requestId?: string;
  } = {
    statusText: response.statusText,
  };
  if (errorData.details) {
    options.details = errorData.details;
  }
  if (errorData.timestamp) {
    options.timestamp = errorData.timestamp;
  }
  if (errorData.requestId) {
    options.requestId = errorData.requestId;
  }
  return new ApiError(
    errorData.error || errorData.message || response.statusText,
    response.status,
    options
  );
}

/**
 * Check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Get a user-friendly message from any error type
 */
export function getUserErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.userMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Ha ocurrido un error inesperado.';
}

/**
 * Get actionable message from any error type
 */
export function getActionableErrorMessage(error: unknown): ActionableMessage {
  if (error instanceof ApiError) {
    return error.getActionableMessage();
  }

  // Network error (fetch failed)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      message: 'Error de conexión.',
      action: 'Verifica tu conexión a internet e intenta nuevamente.',
      actionType: 'retry',
      isRetryable: true,
      buttonText: 'Reintentar',
    };
  }

  // Generic error
  return {
    message: error instanceof Error ? error.message : 'Ha ocurrido un error inesperado.',
    action: 'Si el problema persiste, contacta al soporte técnico.',
    actionType: 'none',
    isRetryable: false,
  };
}

