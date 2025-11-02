/**
 * Tipos comunes compartidos
 * Centralizados para evitar duplicidad según patrones de arquitectura
 */

// ==========================================================
// Tipos Base - Entidades comunes
// ==========================================================

/**
 * Entidad base con identificador único
 */
export interface BaseEntity {
  id: string;
}

/**
 * Entidad con timestamps estándar
 */
export interface TimestampedEntity extends BaseEntity {
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Entidad con timestamps opcionales
 */
export interface TimestampedEntityOptional extends BaseEntity {
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ==========================================================
// Utility Types - Patrones comunes
// ==========================================================

/**
 * Utility type para crear tipos de Request a partir de entidades
 * Omite campos automáticos y hace opcionales los campos opcionales
 */
export type CreateRequest<T extends BaseEntity> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'version'> & {
  [K in keyof T]?: T[K] extends string | number | boolean | null | undefined
    ? T[K]
    : T[K] extends Date
    ? string | Date
    : T[K];
};

/**
 * Utility type para actualizar entidades
 * Hace todos los campos opcionales excepto los que se deben mantener requeridos
 */
export type UpdateRequest<T extends BaseEntity> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

// ==========================================================
// Tipos de Error y Configuración
// ==========================================================

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
