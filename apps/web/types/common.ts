/**
 * Tipos comunes compartidos en toda la aplicación
 * 
 * AI_DECISION: Separar tipos por dominio en archivos pequeños
 * Justificación: Mejor mantenibilidad, imports más claros, evita archivos gigantes
 * Impacto: Código más organizado y escalable
 */

/**
 * Respuesta estándar de la API
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
 * Paginación
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Respuesta con paginación
 */
export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: Pagination;
}

/**
 * Opciones de filtrado comunes
 */
export interface FilterOptions {
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
export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

/**
 * Estado de carga
 */
export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

