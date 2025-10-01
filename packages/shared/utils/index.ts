// Shared utility functions

export const formatCurrency = (value: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(value);
};

export const assert = (condition: any, message: string): asserts condition => {
  if (!condition) throw new Error(message);
};

export const safeParseNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
};

