/**
 * Date parsing and formatting utilities
 *
 * Centralized date utilities for consistent date handling across the API.
 *
 * AI_DECISION: Centralizar utilidades de fechas
 * Justificación: Evitar duplicación de lógica de parsing en múltiples archivos
 * Impacto: Código más mantenible, formato consistente de fechas
 */

/**
 * Parse a date string in DD/MM/YYYY format to a Date object
 *
 * @param fechaStr - Date string in DD/MM/YYYY format
 * @returns Date object if valid, null if invalid or empty
 *
 * @example
 * ```typescript
 * parseFechaDDMMYYYY('25/12/2024'); // Returns Date for Dec 25, 2024
 * parseFechaDDMMYYYY('31/02/2024'); // Returns null (invalid date)
 * parseFechaDDMMYYYY(''); // Returns null
 * ```
 */
export function parseFechaDDMMYYYY(fechaStr: string | null | undefined): Date | null {
  if (!fechaStr || !fechaStr.trim()) {
    return null;
  }

  // Expected format: DD/MM/YYYY
  const match = fechaStr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  // Validate range
  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
    return null;
  }

  // Create date (month is 0-indexed in JS)
  const date = new Date(yearNum, monthNum - 1, dayNum);

  // Validate that the date is valid (handles cases like Feb 31)
  if (
    date.getFullYear() !== yearNum ||
    date.getMonth() !== monthNum - 1 ||
    date.getDate() !== dayNum
  ) {
    return null;
  }

  return date;
}

/**
 * Format a Date to DD/MM/YYYY string
 *
 * @param date - Date object to format
 * @returns Formatted date string or empty string if date is null/undefined
 *
 * @example
 * ```typescript
 * formatDateDDMMYYYY(new Date(2024, 11, 25)); // '25/12/2024'
 * formatDateDDMMYYYY(null); // ''
 * ```
 */
export function formatDateDDMMYYYY(date: Date | null | undefined): string {
  if (!date || isNaN(date.getTime())) {
    return '';
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Parse a date string in YYYY-MM-DD format (ISO date) to a Date object
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object if valid, null if invalid or empty
 *
 * @example
 * ```typescript
 * parseISODate('2024-12-25'); // Returns Date for Dec 25, 2024
 * parseISODate('invalid'); // Returns null
 * ```
 */
export function parseISODate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || !dateStr.trim()) {
    return null;
  }

  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const yearNum = parseInt(year, 10);
  const monthNum = parseInt(month, 10);
  const dayNum = parseInt(day, 10);

  // Validate range
  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
    return null;
  }

  // Create date (month is 0-indexed in JS)
  const date = new Date(yearNum, monthNum - 1, dayNum);

  // Validate that the date is valid
  if (
    date.getFullYear() !== yearNum ||
    date.getMonth() !== monthNum - 1 ||
    date.getDate() !== dayNum
  ) {
    return null;
  }

  return date;
}

/**
 * Format a Date to YYYY-MM-DD string (ISO date format)
 *
 * @param date - Date object to format
 * @returns Formatted date string or empty string if date is null/undefined
 *
 * @example
 * ```typescript
 * formatISODate(new Date(2024, 11, 25)); // '2024-12-25'
 * formatISODate(null); // ''
 * ```
 */
export function formatISODate(date: Date | null | undefined): string {
  if (!date || isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Check if a date string is valid in DD/MM/YYYY format
 *
 * @param fechaStr - Date string to validate
 * @returns true if valid, false otherwise
 */
export function isValidFechaDDMMYYYY(fechaStr: string | null | undefined): boolean {
  return parseFechaDDMMYYYY(fechaStr) !== null;
}

/**
 * Check if a date string is valid in YYYY-MM-DD format
 *
 * @param dateStr - Date string to validate
 * @returns true if valid, false otherwise
 */
export function isValidISODate(dateStr: string | null | undefined): boolean {
  return parseISODate(dateStr) !== null;
}



























