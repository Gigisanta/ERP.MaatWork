/**
 * Tests unitarios para el módulo de normalización
 * Cumple con DoD de STORY 2: "10 tests unitarios de tipado/normalización"
 */

import { describe, it, expect } from '@jest/globals';
import {
  normalizeCuenta,
  normalizeAsesor,
  castToInt,
  castToBoolean,
  castToDate,
  castToNumber,
  validateBreakdownSum,
  levenshteinDistance
} from '../normalization';

describe('normalizeCuenta', () => {
  it('debe normalizar cuenta con puntos suspensivos', () => {
    expect(normalizeCuenta('Cuenta... 12345')).toBe('CUENTA 12345');
  });
  
  it('debe quitar tildes y convertir a uppercase', () => {
    expect(normalizeCuenta('Cüenta Ñoño')).toBe('CUENTA NONO');
  });
  
  it('debe colapsar múltiples espacios', () => {
    expect(normalizeCuenta('Cuenta    123   456')).toBe('CUENTA 123 456');
  });
  
  it('debe retornar string vacío para null/undefined', () => {
    expect(normalizeCuenta(null)).toBe('');
    expect(normalizeCuenta(undefined)).toBe('');
  });
  
  it('debe quitar puntuación y reemplazar con espacios', () => {
    expect(normalizeCuenta('Cuenta.123-456')).toBe('CUENTA 123 456');
  });
});

describe('normalizeAsesor', () => {
  it('debe quitar sufijos numéricos tipo "2 - 1"', () => {
    expect(normalizeAsesor('Juan Perez 2 - 1')).toBe('JUAN PEREZ');
    expect(normalizeAsesor('María García 10 - 3')).toBe('MARIA GARCIA');
  });
  
  it('debe quitar tildes y convertir a uppercase', () => {
    expect(normalizeAsesor('José Hernández')).toBe('JOSE HERNANDEZ');
  });
  
  it('debe retornar string vacío para null/undefined', () => {
    expect(normalizeAsesor(null)).toBe('');
    expect(normalizeAsesor(undefined)).toBe('');
  });
  
  it('no debe afectar nombres sin sufijos', () => {
    expect(normalizeAsesor('Carlos Lopez')).toBe('CARLOS LOPEZ');
  });
});

describe('castToInt', () => {
  it('debe truncar decimales (no redondear)', () => {
    expect(castToInt(12345.67)).toBe(12345);
    expect(castToInt(12345.99)).toBe(12345);
  });
  
  it('debe convertir strings numéricos', () => {
    expect(castToInt('12345.0')).toBe(12345);
    expect(castToInt('12345.67')).toBe(12345);
  });
  
  it('debe retornar null para valores inválidos', () => {
    expect(castToInt(null)).toBe(null);
    expect(castToInt(undefined)).toBe(null);
    expect(castToInt('')).toBe(null);
    expect(castToInt('abc')).toBe(null);
  });
  
  it('debe manejar números negativos', () => {
    expect(castToInt(-123.45)).toBe(-123);
  });
});

describe('castToBoolean', () => {
  it('debe convertir 0/1 a boolean', () => {
    expect(castToBoolean(1)).toBe(true);
    expect(castToBoolean(0)).toBe(false);
  });
  
  it('debe convertir strings a boolean', () => {
    expect(castToBoolean('true')).toBe(true);
    expect(castToBoolean('false')).toBe(false);
    expect(castToBoolean('1')).toBe(true);
    expect(castToBoolean('0')).toBe(false);
    expect(castToBoolean('yes')).toBe(true);
    expect(castToBoolean('no')).toBe(false);
    expect(castToBoolean('sí')).toBe(true);
    expect(castToBoolean('si')).toBe(true);
  });
  
  it('debe manejar booleans nativos', () => {
    expect(castToBoolean(true)).toBe(true);
    expect(castToBoolean(false)).toBe(false);
  });
  
  it('debe retornar null para valores inválidos', () => {
    expect(castToBoolean(null)).toBe(null);
    expect(castToBoolean(undefined)).toBe(null);
    expect(castToBoolean('')).toBe(null);
  });
});

describe('castToDate', () => {
  it('debe convertir strings ISO a Date', () => {
    const date = castToDate('2024-01-15');
    expect(date).toBeInstanceOf(Date);
    expect(date?.getFullYear()).toBe(2024);
    expect(date?.getMonth()).toBe(0); // Enero = 0
  });
  
  it('debe manejar Date objects', () => {
    const input = new Date('2024-01-15');
    const result = castToDate(input);
    expect(result).toBeInstanceOf(Date);
    expect(result?.getTime()).toBe(input.getTime());
  });
  
  it('debe retornar null para valores inválidos', () => {
    expect(castToDate(null)).toBe(null);
    expect(castToDate(undefined)).toBe(null);
    expect(castToDate('')).toBe(null);
    expect(castToDate('invalid-date')).toBe(null);
  });
});

describe('castToNumber', () => {
  it('debe convertir strings numéricos', () => {
    expect(castToNumber('123.456')).toBe(123.456);
    expect(castToNumber('123')).toBe(123);
  });
  
  it('debe manejar números nativos', () => {
    expect(castToNumber(123.456)).toBe(123.456);
  });
  
  it('debe redondear a precisión especificada', () => {
    expect(castToNumber(123.456789, 2)).toBe(123.46);
    expect(castToNumber(123.456789, 4)).toBe(123.4568);
  });
  
  it('debe retornar null para valores inválidos', () => {
    expect(castToNumber(null)).toBe(null);
    expect(castToNumber(undefined)).toBe(null);
    expect(castToNumber('')).toBe(null);
    expect(castToNumber('abc')).toBe(null);
  });
});

describe('validateBreakdownSum', () => {
  it('debe validar suma exacta', () => {
    expect(validateBreakdownSum(100, [50, 30, 20])).toBe(true);
  });
  
  it('debe validar suma dentro de tolerancia (±0.01)', () => {
    expect(validateBreakdownSum(100, [50.005, 30.005, 19.99])).toBe(true);
    expect(validateBreakdownSum(100, [50, 30, 20.009])).toBe(true);
  });
  
  it('debe rechazar suma fuera de tolerancia', () => {
    expect(validateBreakdownSum(100, [50, 30, 20.02])).toBe(false);
    expect(validateBreakdownSum(100, [50, 30, 19])).toBe(false);
  });
  
  it('debe manejar valores null como 0', () => {
    expect(validateBreakdownSum(100, [50, 30, 20, null])).toBe(true);
    expect(validateBreakdownSum(50, [null, null, 50])).toBe(true);
  });
});

describe('levenshteinDistance', () => {
  it('debe calcular distancia entre strings idénticos', () => {
    expect(levenshteinDistance('test', 'test')).toBe(0);
  });
  
  it('debe calcular distancia de 1 para un cambio', () => {
    expect(levenshteinDistance('test', 'tent')).toBe(1); // substitution
    expect(levenshteinDistance('test', 'tests')).toBe(1); // insertion
    expect(levenshteinDistance('tests', 'test')).toBe(1); // deletion
  });
  
  it('debe calcular distancia ≤ 2 para fuzzy matching', () => {
    expect(levenshteinDistance('cuenta123', 'cuenta12')).toBe(1);
    expect(levenshteinDistance('cuenta123', 'cuenta13')).toBe(1);
    expect(levenshteinDistance('cuenta123', 'cuenta124')).toBe(1);
  });
  
  it('debe manejar strings vacíos', () => {
    expect(levenshteinDistance('', 'test')).toBe(4);
    expect(levenshteinDistance('test', '')).toBe(4);
    expect(levenshteinDistance('', '')).toBe(0);
  });
});

describe('Integración: Pipeline completo de normalización', () => {
  it('debe normalizar datos de una fila completa', () => {
    const raw = {
      cuenta: 'Cuenta... 123-45',
      asesor: 'Juan Pérez 2 - 1',
      comitente: '12345.0',
      cuotapartista: '67890.0',
      esJuridica: 1,
      'AUM en Dolares': '100000.50'
    };
    
    const normalized = {
      cuentaNorm: normalizeCuenta(raw.cuenta),
      asesorNorm: normalizeAsesor(raw.asesor),
      comitente: castToInt(raw.comitente),
      cuotapartista: castToInt(raw.cuotapartista),
      esJuridica: castToBoolean(raw.esJuridica),
      aumEnDolares: castToNumber(raw['AUM en Dolares'], 6)
    };
    
    expect(normalized).toEqual({
      cuentaNorm: 'CUENTA 123 45',
      asesorNorm: 'JUAN PEREZ',
      comitente: 12345,
      cuotapartista: 67890,
      esJuridica: true,
      aumEnDolares: 100000.50
    });
  });
});

