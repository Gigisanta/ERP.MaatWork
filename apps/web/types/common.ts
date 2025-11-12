/**
 * Tipos comunes compartidos en toda la aplicación
 * 
 * AI_DECISION: Separar tipos por dominio en archivos pequeños
 * Justificación: Mejor mantenibilidad, imports más claros, evita archivos gigantes
 * Impacto: Código más organizado y escalable
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
  createdAt: string;
  updatedAt: string;
}

/**
 * Entidad con timestamps opcionales (para casos de creación)
 */
export interface TimestampedEntityOptional extends BaseEntity {
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================================
// Utility Types - Patrones comunes
// ==========================================================

/**
 * Utility type para crear tipos de Request a partir de entidades
 * Omite campos automáticos (id, createdAt, updatedAt) y hace opcionales los campos opcionales
 */
export type CreateRequest<T extends BaseEntity> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'version'> & {
  // Hace opcionales todos los campos que son opcionales en el tipo original
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
export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: Pagination;
}

// ==========================================================
// Tipos de Soporte Común
// ==========================================================

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