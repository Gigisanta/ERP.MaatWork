/**
 * Tipos comunes compartidos en toda la aplicación
 *
 * AI_DECISION: Re-exportar tipos base desde @maatwork/types/common para eliminar duplicación
 * Justificación: Tipos base consolidados en un solo lugar, evita divergencia entre frontend y backend
 * Impacto: Un solo lugar para tipos base, cambios se propagan automáticamente
 *
 * Tipos específicos del frontend (ApiResponse, Pagination, etc.) se mantienen aquí
 * porque tienen estructura diferente a los del backend.
 */

// ==========================================================
// Tipos Base - Re-exportados desde @maatwork/types
// ==========================================================

export type {
  BaseEntity,
  TimestampedEntity,
  CreateRequest,
  UpdateRequest,
} from '@maatwork/types/common';

/**
 * Tipo para respuestas de API con data genérica
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string | string[];
  timestamp?: string;
  count?: number;
}

/**
 * Respuesta con paginación
 */
export interface PaginatedResponse<T> extends Omit<ApiResponse<T[]>, 'data'> {
  data: T[];
  pagination: Pagination;
}

// ==========================================================
// Tipos de Soporte Común
// ==========================================================

/**
 * Paginación
 */
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Opciones de filtrado comunes
 */
interface FilterOptions {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Niveles de riesgo
 */
export type RiskLevel = 'conservative' | 'moderate' | 'aggressive';

/**
 * Tipos de activos
 */
export type AssetType = 'EQUITY' | 'ETF' | 'INDEX' | 'BOND' | 'COMMODITY' | 'CURRENCY' | 'CRYPTO';

/**
 * Monedas soportadas
 */
export type Currency = 'USD' | 'ARS' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'CNY';

/**
 * Períodos de tiempo
 */
export type TimePeriod = '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL';

/**
 * Toast notification variant
 */
type ToastVariant = 'success' | 'error' | 'warning' | 'info';

/**
 * Estado de carga
 */
interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

/**
 * Error de API con información estructurada
 */
export interface ApiError {
  message: string;
  status?: number;
  details?: string | string[];
  code?: string;
  response?: {
    status?: number;
    data?: {
      details?: string | string[];
      error?: string;
    };
  };
}

/**
 * Common API error with user-facing message
 */
export interface ApiErrorWithMessage {
  message?: string;
  userMessage?: string;
  error?: string;
}

/**
 * Respuesta de API que puede incluir hints o información adicional
 */
export interface ApiResponseWithHint<T = unknown> extends ApiResponse<T> {
  hint?: string;
  status?: number;
}

// ==========================================================
// Tipos Compartidos entre Dominios
// ==========================================================

/**
 * Componente base compartido entre Benchmark y Portfolio
 * Define la estructura común de componentes de instrumentos
 */
export interface ComponentBase {
  instrumentId?: string | null;
  instrumentSymbol: string;
  instrumentName?: string | null;
  targetWeight: number;
}
