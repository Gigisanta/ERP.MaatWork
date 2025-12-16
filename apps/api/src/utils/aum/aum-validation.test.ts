/**
 * Tests para aum-validation schemas
 *
 * AI_DECISION: Tests unitarios para schemas Zod de validación AUM
 * Justificación: Validación crítica de inputs en endpoints AUM
 * Impacto: Prevenir errores de validación y datos inválidos
 */

import { describe, it, expect } from 'vitest';
import {
  aumFileIdParamsSchema,
  aumUploadQuerySchema,
  aumRowsAllQuerySchema,
  aumMatchRowBodySchema,
  aumMonthlyHistoryQuerySchema,
} from './aum-validation';

describe('aum-validation schemas', () => {
  describe('aumFileIdParamsSchema', () => {
    it('debería validar UUID válido', () => {
      const result = aumFileIdParamsSchema.safeParse({
        fileId: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fileId).toBe('123e4567-e89b-12d3-a456-426614174000');
      }
    });

    it('debería rechazar UUID inválido', () => {
      const result = aumFileIdParamsSchema.safeParse({
        fileId: 'invalid-uuid',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('aumUploadQuerySchema', () => {
    it('debería validar query válida', () => {
      const result = aumUploadQuerySchema.safeParse({
        reportMonth: '1',
        reportYear: '2024',
        broker: 'balanz',
      });

      expect(result.success).toBe(true);
    });

    it('debería validar query sin parámetros opcionales', () => {
      const result = aumUploadQuerySchema.safeParse({});

      expect(result.success).toBe(true);
    });

    it('debería rechazar reportMonth inválido', () => {
      const result = aumUploadQuerySchema.safeParse({
        reportMonth: 13,
      });

      expect(result.success).toBe(false);
    });

    it('debería rechazar reportYear inválido', () => {
      const result = aumUploadQuerySchema.safeParse({
        reportYear: 1999,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('aumRowsAllQuerySchema', () => {
    it('debería validar query con paginación', () => {
      const result = aumRowsAllQuerySchema.safeParse({
        limit: '50',
        offset: '0',
      });

      expect(result.success).toBe(true);
    });

    it('debería validar query con filtros', () => {
      const result = aumRowsAllQuerySchema.safeParse({
        broker: 'balanz',
        status: 'matched',
        fileId: '123e4567-e89b-12d3-a456-426614174000',
        preferredOnly: 'true',
        onlyUpdated: 'false',
        search: 'Juan',
      });

      expect(result.success).toBe(true);
    });

    it('debería validar query con reportMonth y reportYear', () => {
      const result = aumRowsAllQuerySchema.safeParse({
        reportMonth: '1',
        reportYear: '2024',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('aumMatchRowBodySchema', () => {
    it('debería validar body válido', () => {
      const result = aumMatchRowBodySchema.safeParse({
        rowId: '123e4567-e89b-12d3-a456-426614174000',
        matchedContactId: '123e4567-e89b-12d3-a456-426614174001',
        matchedUserId: '123e4567-e89b-12d3-a456-426614174002',
      });

      expect(result.success).toBe(true);
    });

    it('debería rechazar body inválido', () => {
      const result = aumMatchRowBodySchema.safeParse({
        rowId: 'invalid-uuid',
      });

      expect(result.success).toBe(false);
    });

    it('debería validar body con solo matchedContactId', () => {
      const result = aumMatchRowBodySchema.safeParse({
        rowId: '123e4567-e89b-12d3-a456-426614174000',
        matchedContactId: '123e4567-e89b-12d3-a456-426614174001',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('aumMonthlyHistoryQuerySchema', () => {
    it('debería validar query válida', () => {
      const result = aumMonthlyHistoryQuerySchema.safeParse({
        accountNumber: '12345',
        idCuenta: 'cuenta-123',
        fromMonth: 1,
        fromYear: 2024,
        toMonth: 12,
        toYear: 2024,
      });

      expect(result.success).toBe(true);
    });

    it('debería validar query mínima', () => {
      const result = aumMonthlyHistoryQuerySchema.safeParse({
        accountNumber: '12345',
      });

      expect(result.success).toBe(true);
    });

    it('debería aceptar query sin accountNumber ni idCuenta (ambos opcionales)', () => {
      // Note: El schema permite ambos opcionales, así que una query vacía es válida
      const result = aumMonthlyHistoryQuerySchema.safeParse({});

      expect(result.success).toBe(true);
    });
  });
});
