import {
  parseFechaDDMMYYYY,
  formatDateDDMMYYYY,
  formatISODate,
} from '@maatwork/utils';

export {
  parseFechaDDMMYYYY,
  
  
};

/**
 * Parse a date string in YYYY-MM-DD format (ISO date) to a Date object
 */
function parseISODate(dateStr: string | null | undefined): Date | null {
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
 * Check if a date string is valid in DD/MM/YYYY format
 */
function isValidFechaDDMMYYYY(fechaStr: string | null | undefined): boolean {
  return parseFechaDDMMYYYY(fechaStr) !== null;
}

/**
 * Check if a date string is valid in YYYY-MM-DD format
 */
function isValidISODate(dateStr: string | null | undefined): boolean {
  return parseISODate(dateStr) !== null;
}
