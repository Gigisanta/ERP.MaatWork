/**
 * Utilidades para AUM Rows
 */

/**
 * Parsea valores numéricos de PostgreSQL
 *
 * AI_DECISION: Asegurar que valores cero se parsean como 0, no null
 * Justificación: Los valores cero son datos válidos y deben distinguirse de valores ausentes
 * Impacto: Los valores cero se mostrarán como "0,00" en lugar de "--"
 * Nota: PostgreSQL numeric(18,6) puede devolver valores como strings, especialmente cuando son exactamente 0
 */
export function parseNumeric(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    // Asegurar que 0 se retorna como 0, no null
    return isNaN(value) || !isFinite(value) ? null : value;
  }
  const strValue = String(value).trim();
  // Manejar valores vacíos y especiales
  if (strValue === '' || strValue === '-' || strValue === '--' || strValue === '—') {
    return null;
  }
  // Manejar explícitamente valores cero (incluyendo formatos con trailing zeros de PostgreSQL numeric)
  // PostgreSQL numeric(18,6) puede devolver "0.000000" o "0" como string
  const normalizedZero = strValue.replace(/^0+([.,]0+)?$/, '0');
  if (
    normalizedZero === '0' ||
    strValue === '0' ||
    strValue === '0.00' ||
    strValue === '0,00' ||
    strValue === '0.0' ||
    strValue === '0,0' ||
    strValue === '0.000000' ||
    strValue === '0,000000' ||
    /^0+([.,]0+)?$/.test(strValue)
  ) {
    return 0;
  }
  const parsed = parseFloat(strValue.replace(',', '.'));
  // Asegurar que 0 se retorna como 0, no null (por si parseFloat retorna 0)
  if (parsed === 0) return 0;
  return isNaN(parsed) || !isFinite(parsed) ? null : parsed;
}

/**
 * Constantes de timeout para queries
 */
export const QUERY_TIMEOUT_MS = 30000; // 30 seconds



























