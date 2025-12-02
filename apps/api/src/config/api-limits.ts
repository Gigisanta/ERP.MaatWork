/**
 * Configuración centralizada de límites de API
 *
 * AI_DECISION: Centralizar constantes de paginación, rate limits y otros límites
 * Justificación: Evita magic numbers dispersos en el código, facilita ajustes
 * Impacto: Mejor mantenibilidad y consistencia en toda la API
 */

/**
 * Límites de paginación
 */
export const PAGINATION_LIMITS = {
  // Tamaño mínimo de página
  MIN_PAGE_SIZE: 1,

  // Tamaño máximo de página por defecto
  DEFAULT_PAGE_SIZE: 50,

  // Tamaño máximo permitido de página
  MAX_PAGE_SIZE: 500,

  // Límite para operaciones de búsqueda/listado rápido
  QUICK_SEARCH_LIMIT: 20,

  // Límite para operaciones de exportación
  EXPORT_LIMIT: 10000,
} as const;

/**
 * Rate limiting
 */
export const RATE_LIMITS = {
  // Requests por minuto para endpoints públicos
  PUBLIC_REQUESTS_PER_MINUTE: 60,

  // Requests por minuto para endpoints autenticados
  AUTHENTICATED_REQUESTS_PER_MINUTE: 300,

  // Requests por minuto para operaciones pesadas (analytics, reports)
  HEAVY_OPERATIONS_PER_MINUTE: 10,

  // Window de tiempo para rate limiting (ms)
  WINDOW_MS: 60000, // 1 minuto
} as const;

/**
 * Timeouts para operaciones de API
 */
export const API_TIMEOUTS = {
  // Timeout para operaciones simples (GET, POST básico)
  SIMPLE_OPERATION: 10000, // 10s

  // Timeout para operaciones de búsqueda
  SEARCH_OPERATION: 15000, // 15s

  // Timeout para operaciones de creación/actualización
  WRITE_OPERATION: 20000, // 20s

  // Timeout para operaciones pesadas (analytics, reports)
  HEAVY_OPERATION: 60000, // 60s

  // Timeout para operaciones de exportación
  EXPORT_OPERATION: 300000, // 5min
} as const;

/**
 * Límites de tamaño de payload
 */
export const PAYLOAD_LIMITS = {
  // Tamaño máximo de body en requests (bytes)
  MAX_BODY_SIZE: 10 * 1024 * 1024, // 10MB

  // Tamaño máximo de query string
  MAX_QUERY_STRING_LENGTH: 2048,

  // Número máximo de items en arrays de request
  MAX_ARRAY_ITEMS: 1000,

  // Longitud máxima de strings en requests
  MAX_STRING_LENGTH: 10000,
} as const;

/**
 * Límites de validación
 */
export const VALIDATION_LIMITS = {
  // Longitud mínima de nombres/títulos
  MIN_NAME_LENGTH: 1,

  // Longitud máxima de nombres/títulos
  MAX_NAME_LENGTH: 200,

  // Longitud máxima de descripciones
  MAX_DESCRIPTION_LENGTH: 2000,

  // Longitud máxima de emails
  MAX_EMAIL_LENGTH: 255,

  // Longitud máxima de URLs
  MAX_URL_LENGTH: 500,

  // Longitud máxima de teléfonos
  MAX_PHONE_LENGTH: 50,

  // Longitud máxima de DNI
  MAX_DNI_LENGTH: 50,
} as const;

/**
 * Límites de retry
 */
export const RETRY_LIMITS = {
  // Número máximo de reintentos para operaciones transitorias
  MAX_RETRIES: 3,

  // Delay inicial para retry (ms)
  INITIAL_RETRY_DELAY: 1000, // 1s

  // Factor de multiplicación para exponential backoff
  RETRY_BACKOFF_FACTOR: 2,

  // Delay máximo entre reintentos (ms)
  MAX_RETRY_DELAY: 10000, // 10s
} as const;

/**
 * Límites de errores y respuestas
 */
export const ERROR_LIMITS = {
  // Número máximo de errores a incluir en respuestas
  MAX_ERRORS_IN_RESPONSE: 3,

  // Número máximo de errores consecutivos antes de desactivar feature
  MAX_CONSECUTIVE_ERRORS: 3,
} as const;

/**
 * Helper para validar tamaño de página
 */
export function validatePageSize(pageSize: number): number {
  if (pageSize < PAGINATION_LIMITS.MIN_PAGE_SIZE) {
    return PAGINATION_LIMITS.MIN_PAGE_SIZE;
  }
  if (pageSize > PAGINATION_LIMITS.MAX_PAGE_SIZE) {
    return PAGINATION_LIMITS.MAX_PAGE_SIZE;
  }
  return pageSize;
}

/**
 * Helper para calcular offset desde página y tamaño
 */
export function calculateOffset(page: number, pageSize: number): number {
  const validPage = Math.max(1, page);
  const validPageSize = validatePageSize(pageSize);
  return (validPage - 1) * validPageSize;
}
