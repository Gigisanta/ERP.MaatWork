import { describe, it, expect } from 'vitest';
import { formatDateDDMMYYYY, formatISODate, formatDateShort } from './date';

describe('utils/date', () => {
  describe('formatDateDDMMYYYY', () => {
    it('should format dates correctly to DD/MM/YYYY', () => {
      const date = new Date('2024-01-18T12:00:00Z');
      expect(typeof formatDateDDMMYYYY(date)).toBe('string');
      expect(formatDateDDMMYYYY(date)).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });

    it('should return empty string for null/undefined', () => {
      expect(formatDateDDMMYYYY(null)).toBe('');
      expect(formatDateDDMMYYYY(undefined)).toBe('');
    });
  });

  describe('formatISODate', () => {
    it('should format dates to YYYY-MM-DD', () => {
      const date = new Date('2024-01-18T12:00:00Z');
      expect(formatISODate(date)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('formatDateShort', () => {
    it('should format dates to short format', () => {
      const date = new Date('2024-01-18T12:00:00Z');
      expect(typeof formatDateShort(date)).toBe('string');
    });
  });
});
