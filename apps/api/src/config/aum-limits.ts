/**
 * Configuración centralizada de límites para el sistema AUM
 * AI_DECISION: Centralizar magic numbers para facilitar ajustes de performance
 * Justificación: Valores dispersos en el código dificultan mantenimiento
 * Impacto: Mejora configurabilidad y claridad
 */

export const AUM_LIMITS = {
  // File upload limits
  MAX_FILE_SIZE: 25 * 1024 * 1024,  // 25MB
  ALLOWED_MIME_TYPES: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel',  // .xls
    'text/csv'
  ],
  
  // Batch processing
  BATCH_INSERT_SIZE: 250,
  
  // Pagination
  MAX_ROWS_PER_PAGE: 200,
  DEFAULT_PAGE_SIZE: 50,
  PREVIEW_LIMIT: 500,
  
  // Matching thresholds
  SIMILARITY_THRESHOLD: 0.5,
  MAX_SIMILARITY_RESULTS: 5
} as const;

export type AumLimits = typeof AUM_LIMITS;

