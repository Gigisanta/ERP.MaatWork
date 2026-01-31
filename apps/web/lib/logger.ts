import { createLogger, toLogContext, toLogContextValue } from '@maatwork/logger';

export { toLogContext, toLogContextValue };

/**
 * Logger para la aplicación Web (Next.js)
 * Configurado para trabajar tanto en cliente como en servidor
 */
export const logger = createLogger({
  serviceName: 'web',
  // En el cliente, isProduction se determina por la variable de entorno de Next.js
  isProduction: process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_NODE_ENV === 'production',
});

/**
 * Helper para loguear errores con contexto adicional
 */
function logError(message: string, error: unknown, context?: Record<string, unknown>) {
  logger.error({
    err: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error,
    ...context
  }, message);
}
