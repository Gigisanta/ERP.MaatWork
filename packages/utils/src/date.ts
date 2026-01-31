/**
 * Date parsing and formatting utilities
 */

/**
 * Parse a date string in DD/MM/YYYY format to a Date object
 */
export function parseFechaDDMMYYYY(fechaStr: string | null | undefined): Date | null {
  if (!fechaStr || !fechaStr.trim()) {
    return null;
  }

  const match = fechaStr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
    return null;
  }

  const date = new Date(yearNum, monthNum - 1, dayNum);

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
 */
export function formatDateDDMMYYYY(dateInput: Date | string | null | undefined): string {
  if (!dateInput) {
    return '';
  }

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    return '';
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Format a Date to YYYY-MM-DD string (ISO date format)
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
 * Format a Date to DD/MM/YYYY HH:mm string
 */
export function formatDateTimeDDMMYYYY(dateInput: Date | string | null | undefined): string {
  if (!dateInput) {
    return '';
  }

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    return '';
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Format a Date to short string (e.g. "4 ene")
 */
export function formatDateShort(date: Date | string | null | undefined, locale = 'es-AR'): string {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';

  return dateObj.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });
}
