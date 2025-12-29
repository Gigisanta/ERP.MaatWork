/**
 * Tipos comunes compartidos
 *
 * AI_DECISION: Re-exportar tipos base desde @maatwork/types/common para eliminar duplicación
 * Justificación: Tipos base consolidados en un solo lugar, evita divergencia entre frontend y backend
 * Impacto: Un solo lugar para tipos base, cambios se propagan automáticamente
 *
 * Tipos específicos del backend (PinoLoggerOptions, HelmetOptions, ErrorWithMessage) se mantienen aquí
 * porque son específicos del backend y no se usan en frontend.
 */

// ==========================================================
// Tipos Base - Re-exportados desde @maatwork/types
// ==========================================================

;

// ==========================================================
// Tipos de Error y Configuración
// ==========================================================

/**
 * Error con mensaje para manejo de excepciones
 */
type ErrorWithMessage = {
  message?: string;
  code?: string;
  [key: string]: unknown;
};

/**
 * Opciones de configuración para Pino logger
 */
export type PinoLoggerOptions = {
  level: string;
  base?: {
    hostname?: string;
  };
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
  contentSecurityPolicy?: boolean | { directives: Record<string, string | string[]> };
  [key: string]: unknown;
};

import type { AuthUser } from '../auth/types';

// ==========================================================
// Extensiones de Tipos Globales
// ==========================================================

/**
 * AI_DECISION: Extender Express.Request para incluir requestId, contactId y user tipados
 * Justificación: Elimina necesidad de casts (req as any).requestId, (req as any).contactId y (req as any).user
 * Impacto: Type safety mejorado, código más limpio, menos errores en runtime
 */
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      contactId?: string; // Establecido por requireContactAccess middleware
      user?: AuthUser;
    }
  }
}
