/**
 * Error Response Utilities
 *
 * AI_DECISION: Centralizar generacion de respuestas de error
 * Justificacion: Evitar exponer detalles internos en produccion, mantener formato consistente
 * Impacto: Todas las rutas usan el mismo formato de error, mejora seguridad
 * Referencias: apps/api/src/utils/route-handler.ts, apps/api/src/routes/
 *
 * ## Uso
 *
 * ```typescript
 * import { createErrorResponse, getStatusCodeFromError } from '../utils/error-response';
 *
 * try {
 *   // ... logica
 * } catch (error) {
 *   const statusCode = getStatusCodeFromError(error);
 *   return res.status(statusCode).json(
 *     createErrorResponse({
 *       error,
 *       requestId: req.requestId,
 *       userMessage: 'Failed to process request',
 *     })
 *   );
 * }
 * ```
 *
 * ## Formato de Respuesta
 *
 * En produccion:
 * ```json
 * {
 *   "error": "Failed to process request",
 *   "requestId": "abc-123"
 * }
 * ```
 *
 * En desarrollo:
 * ```json
 * {
 *   "error": "Failed to process request",
 *   "requestId": "abc-123",
 *   "message": "Cannot read property 'id' of undefined",
 *   "stack": "Error: Cannot read property...",
 *   "context": { "userId": "..." }
 * }
 * ```
 */

// ==========================================================
// Types
// ==========================================================

/**
 * Opciones para crear una respuesta de error
 */
export interface ErrorResponseOptions {
  /** El error capturado (puede ser Error, string, o cualquier valor) */
  error: unknown;
  /** ID de la request para trazabilidad (de req.requestId) */
  // AI_DECISION: Permitir explícitamente undefined para exactOptionalPropertyTypes
  // Justificación: Con exactOptionalPropertyTypes: true, debemos ser explícitos sobre undefined
  // Impacto: Permite pasar req.requestId directamente sin errores de tipo
  requestId?: string | undefined;
  /** Mensaje amigable para el usuario (no expone detalles internos) */
  userMessage?: string;
  /** Contexto adicional para debugging (solo visible en desarrollo) */
  context?: Record<string, unknown>;
}

/**
 * Respuesta de error en produccion (sin detalles internos)
 */
export interface ProductionErrorResponse {
  error: string;
  requestId?: string;
}

/**
 * Respuesta de error en desarrollo (con detalles para debugging)
 */
export interface DevelopmentErrorResponse extends ProductionErrorResponse {
  message?: string;
  stack?: string;
  context?: Record<string, unknown>;
}

/**
 * Union type para respuesta de error
 */
export type ErrorResponse = ProductionErrorResponse | DevelopmentErrorResponse;

/**
 * Codigos HTTP de error comunes
 */
export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatusCode = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

// ==========================================================
// Functions
// ==========================================================

/**
 * Crea una respuesta de error consistente y segura
 *
 * - En produccion: Solo incluye mensaje de usuario y requestId
 * - En desarrollo: Incluye mensaje de error, stack trace y contexto
 *
 * @param options - Opciones para generar la respuesta
 * @returns Objeto de respuesta de error formateado
 *
 * @example
 * ```typescript
 * // Uso basico
 * const response = createErrorResponse({
 *   error: new Error('Database connection failed'),
 *   requestId: req.requestId,
 *   userMessage: 'Unable to process your request',
 * });
 * res.status(500).json(response);
 * ```
 *
 * @example
 * ```typescript
 * // Con contexto adicional para debugging
 * const response = createErrorResponse({
 *   error,
 *   requestId: req.requestId,
 *   userMessage: 'Failed to create contact',
 *   context: {
 *     userId: req.user?.id,
 *     contactData: req.body,
 *   },
 * });
 * ```
 */
export function createErrorResponse(options: ErrorResponseOptions): ErrorResponse {
  const { error, requestId, userMessage, context } = options;
  const isProduction = process.env.NODE_ENV === 'production';

  // AI_DECISION: Usar mensaje del error directamente si es HttpError (tiene statusCode)
  // Justificación: HttpError ya contiene mensajes seguros para el usuario, no necesitan ser sobrescritos
  // Impacto: Los errores HTTP (404, 400, etc.) muestran su mensaje original en lugar de un mensaje genérico
  let errorMessage = userMessage || 'Internal server error';
  if (
    error &&
    typeof error === 'object' &&
    'statusCode' in error &&
    typeof (error as { statusCode: unknown }).statusCode === 'number' &&
    error instanceof Error
  ) {
    // Es un HttpError o error similar con statusCode - usar su mensaje
    errorMessage = error.message || errorMessage;
  }

  // Respuesta base (segura para produccion)
  // AI_DECISION: Manejar requestId explícitamente para exactOptionalPropertyTypes
  // Justificación: Con exactOptionalPropertyTypes: true, debemos manejar undefined explícitamente
  // Impacto: Cumple con las reglas estrictas de TypeScript
  const response: Record<string, unknown> = {
    error: errorMessage,
  };

  // Solo incluir requestId si está definido
  if (requestId !== undefined) {
    response.requestId = requestId;
  }

  // Solo incluir detalles en desarrollo
  if (!isProduction && error instanceof Error) {
    response.message = error.message;
    response.stack = error.stack;
    if (context) {
      response.context = context;
    }
  }

  // AI_DECISION: Cast explícito a través de unknown para satisfacer exactOptionalPropertyTypes
  // Justificación: TypeScript necesita cast explícito cuando los tipos no se superponen completamente
  // Impacto: Cumple con las reglas estrictas de TypeScript
  return response as unknown as ErrorResponse;
}

/**
 * Determina el codigo de estado HTTP apropiado basado en el error
 *
 * Analiza el mensaje del error para inferir el codigo:
 * - "not found" -> 404
 * - "unauthorized" -> 401
 * - "forbidden" -> 403
 * - "validation" o "invalid" -> 400
 * - Otros -> 500
 *
 * @param error - El error a analizar
 * @returns Codigo de estado HTTP apropiado
 *
 * @example
 * ```typescript
 * const error = new Error('Contact not found');
 * const statusCode = getStatusCodeFromError(error); // 404
 * ```
 *
 * @example
 * ```typescript
 * const error = new Error('Validation failed: email is required');
 * const statusCode = getStatusCodeFromError(error); // 400
 * ```
 *
 * @example
 * ```typescript
 * // Para errores custom con statusCode
 * class HttpError extends Error {
 *   constructor(public statusCode: number, message: string) {
 *     super(message);
 *   }
 * }
 * const error = new HttpError(403, 'Access denied');
 * const statusCode = getStatusCodeFromError(error); // 403
 * ```
 */
export function getStatusCodeFromError(error: unknown): number {
  // Soportar errores con statusCode explicito
  if (
    error &&
    typeof error === 'object' &&
    'statusCode' in error &&
    typeof (error as { statusCode: unknown }).statusCode === 'number'
  ) {
    return (error as { statusCode: number }).statusCode;
  }

  // Inferir desde mensaje del error
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('not found')) return HTTP_STATUS.NOT_FOUND;
    if (message.includes('unauthorized') || message.includes('unauthenticated')) {
      return HTTP_STATUS.UNAUTHORIZED;
    }
    if (message.includes('forbidden') || message.includes('permission denied')) {
      return HTTP_STATUS.FORBIDDEN;
    }
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required')
    ) {
      return HTTP_STATUS.BAD_REQUEST;
    }
    if (message.includes('conflict') || message.includes('already exists')) {
      return HTTP_STATUS.CONFLICT;
    }
    if (message.includes('rate limit') || message.includes('too many')) {
      return HTTP_STATUS.TOO_MANY_REQUESTS;
    }
  }

  return HTTP_STATUS.INTERNAL_SERVER_ERROR;
}

/**
 * Crea una respuesta de error de validacion con detalles de campos
 *
 * @param validationErrors - Array de errores de validacion por campo
 * @param requestId - ID de la request para trazabilidad
 * @returns Respuesta de error formateada para errores de validacion
 *
 * @example
 * ```typescript
 * const errors = [
 *   { field: 'email', message: 'Invalid email format' },
 *   { field: 'name', message: 'Name is required' },
 * ];
 * const response = createValidationErrorResponse(errors, req.requestId);
 * res.status(400).json(response);
 * ```
 */
export function createValidationErrorResponse(
  validationErrors: Array<{ field: string; message: string }>,
  requestId?: string
): {
  error: string;
  requestId?: string;
  details: Array<{ field: string; message: string }>;
} {
  // AI_DECISION: Manejar requestId explícitamente para exactOptionalPropertyTypes
  // Justificación: Con exactOptionalPropertyTypes: true, debemos construir el objeto condicionalmente
  // Impacto: Cumple con las reglas estrictas de TypeScript
  const response: {
    error: string;
    requestId?: string;
    details: Array<{ field: string; message: string }>;
  } = {
    error: 'Validation error',
    details: validationErrors,
  };

  // Solo incluir requestId si está definido
  if (requestId !== undefined) {
    response.requestId = requestId;
  }

  return response;
}

/**
 * Verifica si un error es de un tipo HTTP especifico
 *
 * @param error - El error a verificar
 * @param statusCode - El codigo HTTP a comparar
 * @returns true si el error corresponde al codigo especificado
 *
 * @example
 * ```typescript
 * if (isErrorOfType(error, 404)) {
 *   // Manejar error de recurso no encontrado
 * }
 * ```
 */
export function isErrorOfType(error: unknown, statusCode: number): boolean {
  return getStatusCodeFromError(error) === statusCode;
}

/**
 * Helpers para verificar tipos comunes de errores
 */
export const isNotFoundError = (error: unknown): boolean =>
  isErrorOfType(error, HTTP_STATUS.NOT_FOUND);

export const isUnauthorizedError = (error: unknown): boolean =>
  isErrorOfType(error, HTTP_STATUS.UNAUTHORIZED);

export const isForbiddenError = (error: unknown): boolean =>
  isErrorOfType(error, HTTP_STATUS.FORBIDDEN);

export const isValidationError = (error: unknown): boolean =>
  isErrorOfType(error, HTTP_STATUS.BAD_REQUEST);

export const isConflictError = (error: unknown): boolean =>
  isErrorOfType(error, HTTP_STATUS.CONFLICT);

/**
 * Helper para crear ErrorResponseOptions con requestId manejado correctamente
 *
 * AI_DECISION: Helper para manejar requestId con exactOptionalPropertyTypes
 * Justificación: Simplifica el uso de createErrorResponse cuando requestId puede ser undefined
 * Impacto: Evita errores de tipo y reduce código repetitivo
 *
 * @param options - Opciones para generar la respuesta (sin requestId)
 * @param requestId - ID de la request (puede ser undefined)
 * @returns ErrorResponseOptions con requestId manejado correctamente
 *
 * @example
 * ```typescript
 * const response = createErrorResponseWithRequestId(
 *   { error, userMessage: 'Failed to process' },
 *   req.requestId
 * );
 * ```
 */
export function createErrorResponseOptions(
  options: Omit<ErrorResponseOptions, 'requestId'>,
  requestId?: string | undefined
): ErrorResponseOptions {
  const result: ErrorResponseOptions = {
    ...options,
  };
  if (requestId !== undefined) {
    result.requestId = requestId;
  }
  return result;
}
