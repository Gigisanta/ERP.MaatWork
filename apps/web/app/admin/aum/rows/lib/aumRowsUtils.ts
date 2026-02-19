/**
 * AUM Rows Utility Functions
 *
 * AI_DECISION: Extraer funciones puras para mejor testability
 * Justificación: Funciones puras son fáciles de testear y reutilizar
 * Impacto: Mejor cobertura de tests y código más mantenible
 */

/**
 * Format number with locale-specific formatting
 * AI_DECISION: Mostrar "0,00" para valores cero en lugar de "--"
 * Justificación: Los valores cero son datos válidos y deben distinguirse de valores ausentes
 * Impacto: Mejor representación de datos financieros donde cero es un valor significativo
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--';
  // Asegurar que 0 se muestra como "0,00" y no como "--"
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format currency with AR locale
 */
/**
 * Format currency with AR locale
 */
;

/**
 * Build column widths for table based on config
 */
function buildColumnWidths(config: Record<string, number>): string {
  return Object.values(config)
    .map((width) => `${width}px`)
    .join(' ');
}

/**
 * Parse error message from various error types
 */
export function parseErrorMessage(error: unknown): string {
  if (!error) return 'An unknown error occurred';

  if (typeof error === 'string') return error;

  if (error instanceof Error) return error.message;

  if (typeof error === 'object') {
    // Try to extract message from common error shapes
    const errorObj = error as Record<string, unknown>;
    if (errorObj.message && typeof errorObj.message === 'string') {
      return errorObj.message;
    }
    if (errorObj.error && typeof errorObj.error === 'string') {
      return errorObj.error;
    }
    if (errorObj.details && typeof errorObj.details === 'string') {
      return errorObj.details;
    }
  }

  return 'An unknown error occurred';
}

/**
 * Truncate string with ellipsis
 */
function truncate(str: string | null | undefined, maxLength: number): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}...`;
}

import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '@maatwork/utils';

/**
 * Format date to locale string
 */
function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '--';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '--';
  return formatDateDDMMYYYY(dateObj) || '--';
}

/**
 * Format date time to locale string
 */
function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '--';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '--';
  return formatDateTimeDDMMYYYY(dateObj) || '--';
}

/**
 * Calculate percentage
 */
function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Format match status for display
 */
function formatMatchStatus(status: 'matched' | 'ambiguous' | 'unmatched'): string {
  const statusMap = {
    matched: 'Matcheado',
    ambiguous: 'Ambiguo',
    unmatched: 'Sin Match',
  };
  return statusMap[status] || status;
}

/**
 * Get match status color
 */
function getMatchStatusColor(status: 'matched' | 'ambiguous' | 'unmatched'): string {
  const colorMap = {
    matched: 'text-green-600',
    ambiguous: 'text-yellow-600',
    unmatched: 'text-red-600',
  };
  return colorMap[status] || 'text-gray-600';
}
