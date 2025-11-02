/**
 * Helper para generar respuestas de error consistentes
 * AI_DECISION: Evitar exponer detalles internos en producción
 * Justificación: Seguridad y consistencia con el patrón del proyecto
 * Impacto: Todas las rutas usan el mismo formato de error
 */

export interface ErrorResponseOptions {
  error: unknown;
  requestId?: string;
  userMessage?: string;
  context?: Record<string, unknown>;
}

export function createErrorResponse(options: ErrorResponseOptions) {
  const { error, requestId, userMessage, context } = options;
  const isProduction = process.env.NODE_ENV === 'production';
  
  const response: Record<string, unknown> = {
    error: userMessage || 'Internal server error',
    requestId
  };
  
  // Solo incluir detalles en desarrollo
  if (!isProduction && error instanceof Error) {
    response.message = error.message;
    response.stack = error.stack;
    if (context) {
      response.context = context;
    }
  }
  
  return response;
}

/**
 * Helper para determinar código de estado HTTP desde error
 */
export function getStatusCodeFromError(error: unknown): number {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('not found')) return 404;
    if (message.includes('unauthorized')) return 401;
    if (message.includes('forbidden')) return 403;
    if (message.includes('validation') || message.includes('invalid')) return 400;
  }
  return 500;
}

