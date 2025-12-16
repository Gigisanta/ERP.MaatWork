/**
 * Tests para batch-validation utils
 *
 * AI_DECISION: Tests unitarios para prevenir regresiones
 * Justificación: Validaciones críticas para seguridad (DoS prevention)
 * Impacto: Confianza en refactors futuros
 */

import { describe, it, expect } from 'vitest';
import {
  validateBatchIds,
  BATCH_LIMITS,
  sanitizeQueryParam,
  validatePeriod,
  validateLimit,
  validateOffset,
} from './batch-validation';

describe('validateBatchIds', () => {
  describe('Validaciones básicas', () => {
    it('debería rechazar parámetro vacío', () => {
      const result = validateBatchIds(undefined);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required parameter: ids');
    });

    it('debería rechazar string vacío', () => {
      const result = validateBatchIds('');
      expect(result.valid).toBe(false);
      // Un string vacío devuelve error de "Missing required parameter" antes de procesar
      expect(result.errors![0]).toContain('Missing required parameter');
    });

    it('debería rechazar solo comas', () => {
      const result = validateBatchIds(',,,');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Empty ID list provided');
    });
  });

  describe('Validación de UUIDs', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    const anotherValidUuid = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

    it('debería aceptar UUIDs válidos', () => {
      const result = validateBatchIds(`${validUuid},${anotherValidUuid}`);
      expect(result.valid).toBe(true);
      expect(result.ids).toEqual([validUuid, anotherValidUuid]);
      expect(result.errors).toBeUndefined();
    });

    it('debería rechazar IDs que no son UUIDs', () => {
      const result = validateBatchIds('invalid-id,another-bad-id');
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Invalid UUID format');
    });

    it('debería rechazar UUIDs malformados', () => {
      const result = validateBatchIds('550e8400-e29b-41d4-a716'); // UUID incompleto
      expect(result.valid).toBe(false);
    });

    it('debería aceptar IDs no-UUID cuando requireUuid es false', () => {
      const result = validateBatchIds('id1,id2,id3', { requireUuid: false });
      expect(result.valid).toBe(true);
      expect(result.ids).toEqual(['id1', 'id2', 'id3']);
    });
  });

  describe('Límites de cantidad', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';

    it('debería aceptar cantidad dentro del límite', () => {
      const ids = Array(10).fill(validUuid).join(',');
      const result = validateBatchIds(ids, { maxCount: 20 });
      expect(result.valid).toBe(true);
    });

    it('debería rechazar cantidad sobre el límite', () => {
      const ids = Array(101).fill(validUuid).join(',');
      const result = validateBatchIds(ids, { maxCount: 100 });
      expect(result.valid).toBe(false);
      expect(result.errors![0]).toContain('Too many IDs');
      expect(result.errors![0]).toContain('100 allowed');
    });

    it('debería usar límite por defecto (100)', () => {
      const ids = Array(101).fill(validUuid).join(',');
      const result = validateBatchIds(ids);
      expect(result.valid).toBe(false);
      expect(result.errors![0]).toContain('100 allowed');
    });

    it('debería respetar BATCH_LIMITS.MAX_PORTFOLIOS', () => {
      const ids = Array(BATCH_LIMITS.MAX_PORTFOLIOS + 1)
        .fill(validUuid)
        .join(',');
      const result = validateBatchIds(ids, { maxCount: BATCH_LIMITS.MAX_PORTFOLIOS });
      expect(result.valid).toBe(false);
    });
  });

  describe('Duplicados', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';

    it('debería eliminar duplicados', () => {
      const result = validateBatchIds(`${validUuid},${validUuid},${validUuid}`);
      expect(result.valid).toBe(true);
      expect(result.ids).toHaveLength(1);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('2 duplicate ID(s) removed');
    });

    it('debería contar duplicados correctamente', () => {
      const uuid1 = '550e8400-e29b-41d4-a716-446655440000';
      const uuid2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      const result = validateBatchIds(`${uuid1},${uuid2},${uuid1},${uuid2},${uuid1}`);
      expect(result.valid).toBe(true);
      expect(result.ids).toHaveLength(2);
      expect(result.errors![0]).toContain('3 duplicate ID(s) removed');
    });
  });

  describe('Espacios en blanco y formato', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';

    it('debería trimear espacios', () => {
      const result = validateBatchIds(`  ${validUuid}  ,  ${validUuid}  `);
      expect(result.ids).toHaveLength(1);
      expect(result.ids[0]).toBe(validUuid);
    });

    it('debería manejar múltiples comas', () => {
      const result = validateBatchIds(`${validUuid},,,,${validUuid}`);
      expect(result.ids).toHaveLength(1);
    });

    it('debería manejar espacios dentro de IDs', () => {
      const result = validateBatchIds('550e8400 e29b 41d4 a716 446655440000', {
        requireUuid: false,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('Field name personalizado', () => {
    it('debería usar field name en mensajes de error', () => {
      const result = validateBatchIds(undefined, { fieldName: 'portfolioIds' });
      expect(result.errors![0]).toContain('portfolioIds');
    });
  });
});

describe('sanitizeQueryParam', () => {
  it('debería retornar undefined si no hay valor', () => {
    expect(sanitizeQueryParam(undefined)).toBeUndefined();
    expect(sanitizeQueryParam(null)).toBeUndefined();
    expect(sanitizeQueryParam('')).toBeUndefined();
  });

  it('debería retornar default value si no hay valor', () => {
    expect(sanitizeQueryParam(undefined, { defaultValue: 'default' })).toBe('default');
    expect(sanitizeQueryParam('', { defaultValue: 'default' })).toBe('default');
  });

  it('debería convertir a string y trimear', () => {
    expect(sanitizeQueryParam('  value  ')).toBe('value');
    expect(sanitizeQueryParam(123)).toBe('123');
  });

  it('debería truncar a maxLength', () => {
    const result = sanitizeQueryParam('a'.repeat(150), { maxLength: 100 });
    expect(result).toHaveLength(100);
  });

  it('debería validar allowed values', () => {
    const result = sanitizeQueryParam('invalid', {
      allowedValues: ['valid1', 'valid2'],
      defaultValue: 'valid1',
    });
    expect(result).toBe('valid1');
  });

  it('debería aceptar valores permitidos', () => {
    const result = sanitizeQueryParam('valid1', {
      allowedValues: ['valid1', 'valid2'],
    });
    expect(result).toBe('valid1');
  });
});

describe('validatePeriod', () => {
  it('debería retornar período por defecto si no hay valor', () => {
    const result = validatePeriod(undefined);
    expect(result.valid).toBe(true);
    expect(result.period).toBe('1Y');
  });

  it('debería aceptar períodos válidos', () => {
    const validPeriods = ['1M', '3M', '6M', '1Y', 'YTD', 'ALL'];
    validPeriods.forEach((period) => {
      const result = validatePeriod(period);
      expect(result.valid).toBe(true);
      expect(result.period).toBe(period);
      expect(result.error).toBeUndefined();
    });
  });

  it('debería rechazar períodos inválidos', () => {
    const result = validatePeriod('6Y');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Invalid period');
    expect(result.period).toBe('1Y'); // default
  });

  it('debería ser case-insensitive', () => {
    const result = validatePeriod('1m');
    expect(result.valid).toBe(true);
    expect(result.period).toBe('1M');
  });

  it('debería trimear espacios', () => {
    const result = validatePeriod('  1Y  ');
    expect(result.valid).toBe(true);
    expect(result.period).toBe('1Y');
  });
});

describe('validateLimit', () => {
  it('debería retornar default si no hay valor', () => {
    expect(validateLimit(undefined)).toBe(20);
    expect(validateLimit(null)).toBe(20);
  });

  it('debería respetar custom default', () => {
    expect(validateLimit(undefined, { defaultValue: 50 })).toBe(50);
  });

  it('debería parsear números correctamente', () => {
    expect(validateLimit(10)).toBe(10);
    expect(validateLimit('25')).toBe(25);
  });

  it('debería aplicar límite mínimo', () => {
    expect(validateLimit(0)).toBe(1); // min default
    expect(validateLimit(-5)).toBe(1);
    expect(validateLimit(0, { min: 5 })).toBe(5);
  });

  it('debería aplicar límite máximo', () => {
    expect(validateLimit(200)).toBe(100); // max default
    expect(validateLimit(150, { max: 100 })).toBe(100);
  });

  it('debería manejar valores no numéricos', () => {
    expect(validateLimit('abc')).toBe(1); // min
    expect(validateLimit('abc', { defaultValue: 20 })).toBe(1);
  });
});

describe('validateOffset', () => {
  it('debería retornar 0 si no hay valor', () => {
    expect(validateOffset(undefined)).toBe(0);
    expect(validateOffset(null)).toBe(0);
  });

  it('debería parsear números correctamente', () => {
    expect(validateOffset(10)).toBe(10);
    expect(validateOffset('25')).toBe(25);
  });

  it('debería prevenir offsets negativos', () => {
    expect(validateOffset(-5)).toBe(0);
    expect(validateOffset(-100)).toBe(0);
  });

  it('debería manejar valores no numéricos', () => {
    expect(validateOffset('abc')).toBe(0);
  });

  it('debería aceptar offsets grandes', () => {
    expect(validateOffset(1000)).toBe(1000);
    expect(validateOffset(999999)).toBe(999999);
  });
});
