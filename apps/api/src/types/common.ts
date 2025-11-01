/**
 * Tipos comunes compartidos
 * Centralizados para evitar duplicidad según patrones de arquitectura
 */

/**
 * Error con mensaje para manejo de excepciones
 */
export type ErrorWithMessage = {
  message?: string;
  code?: string;
  [key: string]: unknown;
};

/**
 * Opciones de configuración para Pino logger
 */
export type PinoLoggerOptions = {
  level: string;
  transport?: {
    target: string;
    options: {
      colorize: boolean;
      translateTime: string;
      singleLine: boolean;
      ignore: string;
      errorLikeObjectKeys: string[];
      messageFormat: string;
      errorProps: string;
    };
  };
};

/**
 * Opciones de configuración para Helmet
 */
export type HelmetOptions = {
  crossOriginResourcePolicy: { policy: 'cross-origin' };
  crossOriginEmbedderPolicy: boolean;
  contentSecurityPolicy?: boolean;
  [key: string]: unknown;
};

