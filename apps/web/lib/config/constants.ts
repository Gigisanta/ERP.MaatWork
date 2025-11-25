/**
 * Constantes centralizadas para UI y frontend
 * 
 * AI_DECISION: Centralizar magic numbers y constantes de UI
 * Justificación: Evita valores dispersos, facilita ajustes y mantenimiento
 * Impacto: Mejor consistencia y mantenibilidad en toda la aplicación
 */

/**
 * Límites de paginación en UI
 */
export const PAGINATION = {
  // Tamaño de página por defecto
  DEFAULT_PAGE_SIZE: 50,
  
  // Tamaño mínimo de página
  MIN_PAGE_SIZE: 10,
  
  // Tamaño máximo de página
  MAX_PAGE_SIZE: 200,
  
  // Opciones de tamaño de página disponibles
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100, 200] as const,
  
  // Número máximo de items para mostrar sin paginación
  MAX_ITEMS_WITHOUT_PAGINATION: 100,
} as const;

/**
 * Delays y timeouts para UI
 */
export const UI_DELAYS = {
  // Delay para debounce de búsqueda (ms)
  SEARCH_DEBOUNCE: 300,
  
  // Delay para debounce de inputs de formulario (ms)
  INPUT_DEBOUNCE: 500,
  
  // Delay para auto-save (ms)
  AUTO_SAVE_DELAY: 2000,
  
  // Timeout para mostrar mensajes de éxito (ms)
  SUCCESS_MESSAGE_TIMEOUT: 3000,
  
  // Timeout para mostrar mensajes de error (ms)
  ERROR_MESSAGE_TIMEOUT: 5000,
  
  // Delay para animaciones de transición (ms)
  TRANSITION_DELAY: 200,
  
  // Delay para mostrar tooltips (ms)
  TOOLTIP_DELAY: 500,
  
  // Delay para mostrar loading states (ms) - evitar flash de contenido
  LOADING_STATE_DELAY: 100,
} as const;

/**
 * Límites de UI
 */
export const UI_LIMITS = {
  // Número máximo de items a mostrar en dropdowns sin búsqueda
  MAX_DROPDOWN_ITEMS: 100,
  
  // Número máximo de caracteres para preview de texto
  MAX_TEXT_PREVIEW_LENGTH: 150,
  
  // Número máximo de tags a mostrar antes de "y X más"
  MAX_VISIBLE_TAGS: 5,
  
  // Número máximo de items en listas compactas
  MAX_COMPACT_LIST_ITEMS: 10,
  
  // Longitud máxima de nombres de archivo a mostrar
  MAX_FILENAME_DISPLAY_LENGTH: 30,
  
  // Número máximo de items en chips/badges antes de truncar
  MAX_CHIP_ITEMS: 10,
} as const;

/**
 * Tamaños de archivo para UI
 */
export const FILE_SIZE_LIMITS = {
  // Tamaño máximo de archivo para upload (bytes)
  MAX_UPLOAD_SIZE: 25 * 1024 * 1024, // 25MB
  
  // Tamaño máximo para preview de imágenes (bytes)
  MAX_IMAGE_PREVIEW_SIZE: 5 * 1024 * 1024, // 5MB
  
  // Tamaño máximo para exportación sin confirmación (bytes)
  MAX_EXPORT_SIZE_WITHOUT_CONFIRM: 10 * 1024 * 1024, // 10MB
} as const;

/**
 * Límites de validación en formularios
 */
export const FORM_LIMITS = {
  // Longitud mínima de contraseña
  MIN_PASSWORD_LENGTH: 8,
  
  // Longitud máxima de contraseña
  MAX_PASSWORD_LENGTH: 128,
  
  // Longitud máxima de nombres
  MAX_NAME_LENGTH: 200,
  
  // Longitud máxima de descripciones
  MAX_DESCRIPTION_LENGTH: 2000,
  
  // Longitud máxima de emails
  MAX_EMAIL_LENGTH: 255,
  
  // Longitud máxima de URLs
  MAX_URL_LENGTH: 500,
  
  // Longitud máxima de teléfonos
  MAX_PHONE_LENGTH: 50,
  
  // Número máximo de items en arrays de formulario
  MAX_ARRAY_ITEMS: 100,
} as const;

/**
 * Configuración de cache para SWR
 */
export const CACHE_CONFIG = {
  // Tiempo de deduplicación de requests (ms)
  DEDUPING_INTERVAL: 10000, // 10s
  
  // Intervalo de revalidación en foco (ms)
  FOCUS_THROTTLE_INTERVAL: 60000, // 1min
  
  // Tiempo de cache para datos que cambian poco (ms)
  STALE_TIME_LONG: 300000, // 5min
  
  // Tiempo de cache para datos que cambian frecuentemente (ms)
  STALE_TIME_SHORT: 30000, // 30s
} as const;

/**
 * Configuración de retry para operaciones
 */
export const RETRY_CONFIG = {
  // Número máximo de reintentos
  MAX_RETRIES: 3,
  
  // Delay inicial para retry (ms)
  INITIAL_RETRY_DELAY: 1000,
  
  // Factor de multiplicación para exponential backoff
  BACKOFF_FACTOR: 2,
  
  // Delay máximo entre reintentos (ms)
  MAX_RETRY_DELAY: 10000,
} as const;

/**
 * Helpers para formateo
 */
export const FORMAT_HELPERS = {
  // Formato de fecha corta
  DATE_FORMAT_SHORT: 'DD/MM/YYYY',
  
  // Formato de fecha larga
  DATE_FORMAT_LONG: 'DD/MM/YYYY HH:mm',
  
  // Formato de moneda
  CURRENCY_FORMAT: 'es-AR',
  
  // Decimales para porcentajes
  PERCENTAGE_DECIMALS: 2,
  
  // Decimales para montos
  AMOUNT_DECIMALS: 2,
} as const;

