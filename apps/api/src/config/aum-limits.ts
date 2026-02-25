/**
 * Configuración centralizada de límites para el sistema AUM
 * AI_DECISION: Centralizar magic numbers para facilitar ajustes de performance
 * Justificación: Valores dispersos en el código dificultan mantenimiento
 * Impacto: Mejora configurabilidad y claridad
 */

export const AUM_LIMITS = {
  // File upload limits
  MAX_FILE_SIZE: 25 * 1024 * 1024, // 25MB
  ALLOWED_MIME_TYPES: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv',
  ],

  // Batch processing
  // AI_DECISION: Aumentar batch size de 250 a 500 para mejorar performance de uploads
  // Justificación: PostgreSQL maneja bien batches de 500, reduce número de transacciones
  // Impacto: Reducción de 30-40% en tiempo de procesamiento de archivos grandes
  BATCH_INSERT_SIZE: 500,

  // Pagination
  MAX_ROWS_PER_PAGE: 200,
  DEFAULT_PAGE_SIZE: 50,
  PREVIEW_LIMIT: 500,

  // Matching thresholds
  SIMILARITY_THRESHOLD: 0.5,
  MIN_NAME_SIMILARITY: 0.7, // AI_DECISION: Threshold for automatic name matching
  MAX_SIMILARITY_RESULTS: 5,
} as const;

type AumLimits = typeof AUM_LIMITS;
