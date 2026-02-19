import pino, { Logger, LoggerOptions } from 'pino';

export interface LoggerConfig {
  serviceName: string;
  level?: string;
  isProduction?: boolean;
}

/**
 * Crea una instancia de logger configurada para el entorno actual
 */
export interface ExtendedLogger extends Logger {
  updateUser: (id: string | null, role: string | null) => void;
  logRequest: (method: string, url: string, requestId: string, context?: Record<string, unknown>) => void;
  logResponse: (
    method: string,
    url: string,
    status: number,
    duration: number,
    requestId: string,
    context?: Record<string, unknown>
  ) => void;
  logNetworkError: (
    method: string,
    url: string,
    error: Error,
    requestId: string,
    context?: Record<string, unknown>
  ) => void;
}

/**
 * Crea una instancia de logger configurada para el entorno actual
 */
export function createLogger(config: LoggerConfig): ExtendedLogger {
  const isProduction = config.isProduction ?? process.env.NODE_ENV === 'production';
  const logLevel = config.level || process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

  const options: LoggerOptions = {
    level: logLevel,
    base: {
      service: config.serviceName,
      env: process.env.NODE_ENV,
    },
  };

  // En desarrollo usamos pino-pretty para logs legibles
  if (!isProduction) {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        singleLine: true,
        ignore: 'pid,hostname',
      },
    };
  }

  const baseLogger = pino(options);
  
  // Extend logger with updateUser capability
  let currentLogger = baseLogger;
  
  const proxy = new Proxy(baseLogger, {
    get(target, prop, receiver) {
      if (prop === 'updateUser') {
        return (userId: string | null, userRole: string | null) => {
          const newContext: Record<string, unknown> = {};
          if (userId) newContext.userId = userId;
          if (userRole) newContext.userRole = userRole;
          
          // Pino doesn't support updating base, so we create a child
          // and route following calls to it. 
          // Note: In a singleton scenario this works, but for complex 
          // branching it might be tricky. For this app's needs it's sufficient.
          currentLogger = baseLogger.child(newContext);
        };
      }
      
      if (prop === 'logRequest') {
        return (method: string, url: string, requestId: string, context?: Record<string, unknown>) => {
          currentLogger.info({ requestId, method, url, ...context }, `Request: ${method} ${url}`);
        };
      }
      
      if (prop === 'logResponse') {
        return (method: string, url: string, status: number, duration: number, requestId: string, context?: Record<string, unknown>) => {
          const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
          currentLogger[level]({ requestId, method, url, status, duration, ...context }, `Response: ${status} ${method} ${url} (${duration}ms)`);
        };
      }
      
      if (prop === 'logNetworkError') {
        return (method: string, url: string, error: Error, requestId: string, context?: Record<string, unknown>) => {
          currentLogger.error({
            requestId,
            method,
            url,
            error: {
              message: error.message,
              name: error.name,
              stack: error.stack,
            },
            ...context
          }, `Network Error: ${method} ${url}`);
        };
      }
      
      const value = Reflect.get(currentLogger, prop, receiver);
      if (typeof value === 'function') {
        return value.bind(currentLogger);
      }
      return value;
    }
  });

  return proxy as ExtendedLogger;
}

// Exportar tipo para comodidad
export type { Logger };

/**
 * Convierte un objeto a un formato compatible con el contexto de logs
 */
export function toLogContext(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object') return {};
  return data as Record<string, unknown>;
}

/**
 * Convierte un valor a un formato compatible con los valores de contexto de logs
 */
export function toLogContextValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      message: value.message,
      stack: value.stack,
      name: value.name,
    };
  }
  return value;
}
