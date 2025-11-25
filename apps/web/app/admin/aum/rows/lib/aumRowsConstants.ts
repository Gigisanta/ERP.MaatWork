/**
 * AUM Rows Configuration Constants
 * 
 * AI_DECISION: Centralizar magic numbers para facilitar ajustes
 * Justificación: Valores dispersos dificultan mantenimiento y ajustes de performance
 * Impacto: Mejora configurabilidad y claridad del código
 */

export const AUM_ROWS_CONFIG = {
  // Debounce and timing
  DEBOUNCE_MS: 300,
  RETRY_BASE_DELAY: 1000,
  RETRY_MAX: 5,
  UPLOAD_WAIT_DELAY: 100,

  // Pagination
  PAGINATION_DEFAULT_LIMIT: 50,
  PAGINATION_DEFAULT_OFFSET: 0,

  // Virtualizer settings
  VIRTUALIZER: {
    ESTIMATE_SIZE: 60,
    OVERSCAN: 5,
    CONTAINER_HEIGHT: 600
  },

  // Column widths (in pixels)
  COLUMN_WIDTHS: {
    ACCOUNT: 128,
    ID_CUENTA: 96,
    HOLDER: 192,
    BROKER: 80,
    ADVISOR: 128,
    CONTACT: 192,
    STATUS: 96,
    AUM_DOLLARS: 112,
    BOLSA_ARG: 96,
    FONDOS_ARG: 96,
    BOLSA_BCI: 96,
    PESOS: 96,
    MEP: 96,
    CABLE: 96,
    CV7000: 96,
    FILE_DATE: 96,
    ACTIONS: 80
  }
} as const;

export type AumRowsConfig = typeof AUM_ROWS_CONFIG;

/**
 * Total table width based on column widths
 */
export const TOTAL_TABLE_WIDTH = Object.values(AUM_ROWS_CONFIG.COLUMN_WIDTHS)
  .reduce((sum, width) => sum + width, 0);

