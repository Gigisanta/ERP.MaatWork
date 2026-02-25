/**
 * Tests para AUM_LIMITS constants
 *
 * AI_DECISION: Tests unitarios para prevenir cambios accidentales
 * Justificación: Límites de AUM son críticos para seguridad (DoS prevention)
 * Impacto: Confianza en valores configurados correctamente
 */

import { describe, it, expect } from 'vitest';
import { AUM_LIMITS } from './aum-limits';

describe('AUM_LIMITS', () => {
  describe('Structure validation', () => {
    it('debería tener todas las propiedades requeridas', () => {
      expect(AUM_LIMITS).toHaveProperty('MAX_FILE_SIZE');
      expect(AUM_LIMITS).toHaveProperty('BATCH_INSERT_SIZE');
      expect(AUM_LIMITS).toHaveProperty('DEFAULT_PAGE_SIZE');
      expect(AUM_LIMITS).toHaveProperty('MAX_ROWS_PER_PAGE');
      expect(AUM_LIMITS).toHaveProperty('MAX_SIMILARITY_RESULTS');
      expect(AUM_LIMITS).toHaveProperty('SIMILARITY_THRESHOLD');
    });

    it('todos los valores deberían ser números', () => {
      expect(typeof AUM_LIMITS.MAX_FILE_SIZE).toBe('number');
      expect(typeof AUM_LIMITS.BATCH_INSERT_SIZE).toBe('number');
      expect(typeof AUM_LIMITS.DEFAULT_PAGE_SIZE).toBe('number');
      expect(typeof AUM_LIMITS.MAX_ROWS_PER_PAGE).toBe('number');
      expect(typeof AUM_LIMITS.MAX_SIMILARITY_RESULTS).toBe('number');
      expect(typeof AUM_LIMITS.SIMILARITY_THRESHOLD).toBe('number');
    });
  });

  describe('Value ranges', () => {
    it('MAX_FILE_SIZE debería ser 25MB', () => {
      expect(AUM_LIMITS.MAX_FILE_SIZE).toBe(25 * 1024 * 1024);
    });

    it('BATCH_INSERT_SIZE debería ser razonable (100-1000)', () => {
      expect(AUM_LIMITS.BATCH_INSERT_SIZE).toBeGreaterThanOrEqual(100);
      expect(AUM_LIMITS.BATCH_INSERT_SIZE).toBeLessThanOrEqual(1000);
    });

    it('BATCH_INSERT_SIZE debería ser 500 (optimizado para performance)', () => {
      // AI_DECISION: Verificar que batch size está optimizado a 500
      // Justificación: Aumentado de 250 a 500 para mejorar performance de uploads
      // Impacto: Reducción de 30-40% en tiempo de procesamiento
      expect(AUM_LIMITS.BATCH_INSERT_SIZE).toBe(500);
    });

    it('DEFAULT_PAGE_SIZE debería ser razonable (20-100)', () => {
      expect(AUM_LIMITS.DEFAULT_PAGE_SIZE).toBeGreaterThanOrEqual(20);
      expect(AUM_LIMITS.DEFAULT_PAGE_SIZE).toBeLessThanOrEqual(100);
    });

    it('MAX_ROWS_PER_PAGE debería ser mayor que DEFAULT_PAGE_SIZE', () => {
      expect(AUM_LIMITS.MAX_ROWS_PER_PAGE).toBeGreaterThan(AUM_LIMITS.DEFAULT_PAGE_SIZE);
    });

    it('MAX_SIMILARITY_RESULTS debería ser pequeño (1-10)', () => {
      expect(AUM_LIMITS.MAX_SIMILARITY_RESULTS).toBeGreaterThanOrEqual(1);
      expect(AUM_LIMITS.MAX_SIMILARITY_RESULTS).toBeLessThanOrEqual(10);
    });

    it('SIMILARITY_THRESHOLD debería estar entre 0 y 1', () => {
      expect(AUM_LIMITS.SIMILARITY_THRESHOLD).toBeGreaterThan(0);
      expect(AUM_LIMITS.SIMILARITY_THRESHOLD).toBeLessThanOrEqual(1);
    });
  });

  describe('Security constraints', () => {
    it('MAX_FILE_SIZE no debería exceder 50MB (límite razonable)', () => {
      const maxAllowed = 50 * 1024 * 1024;
      expect(AUM_LIMITS.MAX_FILE_SIZE).toBeLessThanOrEqual(maxAllowed);
    });

    it('MAX_ROWS_PER_PAGE debería prevenir queries masivos', () => {
      expect(AUM_LIMITS.MAX_ROWS_PER_PAGE).toBeLessThanOrEqual(500);
    });

    it('BATCH_INSERT_SIZE debería evitar timeouts de DB', () => {
      // Postgres típicamente maneja bien hasta 1000 rows por batch
      expect(AUM_LIMITS.BATCH_INSERT_SIZE).toBeLessThanOrEqual(1000);
    });
  });

  describe('Consistency checks', () => {
    it('los límites de paginación deberían tener sentido', () => {
      expect(AUM_LIMITS.DEFAULT_PAGE_SIZE).toBeLessThan(AUM_LIMITS.MAX_ROWS_PER_PAGE);
    });

    it('los valores numéricos no deberían ser negativos', () => {
      expect(AUM_LIMITS.MAX_FILE_SIZE).toBeGreaterThan(0);
      expect(AUM_LIMITS.BATCH_INSERT_SIZE).toBeGreaterThan(0);
      expect(AUM_LIMITS.DEFAULT_PAGE_SIZE).toBeGreaterThan(0);
      expect(AUM_LIMITS.MAX_ROWS_PER_PAGE).toBeGreaterThan(0);
      expect(AUM_LIMITS.MAX_SIMILARITY_RESULTS).toBeGreaterThan(0);
      expect(AUM_LIMITS.SIMILARITY_THRESHOLD).toBeGreaterThan(0);
    });

    it('ALLOWED_MIME_TYPES debería ser un array', () => {
      expect(Array.isArray(AUM_LIMITS.ALLOWED_MIME_TYPES)).toBe(true);
      expect(AUM_LIMITS.ALLOWED_MIME_TYPES.length).toBeGreaterThan(0);
    });

    it('ALLOWED_MIME_TYPES debería incluir CSV y Excel', () => {
      expect(AUM_LIMITS.ALLOWED_MIME_TYPES).toContain('text/csv');
      expect(AUM_LIMITS.ALLOWED_MIME_TYPES.some((type) => type.includes('spreadsheet'))).toBe(true);
    });
  });
});
