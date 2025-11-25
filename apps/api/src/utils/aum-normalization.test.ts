/**
 * Tests para AUM normalization utilities
 * 
 * AI_DECISION: Tests unitarios para normalización de datos AUM
 * Justificación: Consistencia en parsing, matching y commit de AUM
 * Impacto: Prevenir errores por diferencias de formato
 */

import { describe, it, expect } from 'vitest';
import { normalizeAdvisorAlias, normalizeAccountNumber } from './aum-normalization';

describe('normalizeAdvisorAlias', () => {
  it('debería convertir a lowercase', () => {
    expect(normalizeAdvisorAlias('JOHN DOE')).toBe('john doe');
    expect(normalizeAdvisorAlias('John Doe')).toBe('john doe');
    expect(normalizeAdvisorAlias('john doe')).toBe('john doe');
  });

  it('debería eliminar espacios al inicio y final', () => {
    expect(normalizeAdvisorAlias('  john doe  ')).toBe('john doe');
    expect(normalizeAdvisorAlias(' john doe ')).toBe('john doe');
    expect(normalizeAdvisorAlias('john doe')).toBe('john doe');
  });

  it('debería mantener espacios internos', () => {
    expect(normalizeAdvisorAlias('John Doe Smith')).toBe('john doe smith');
    expect(normalizeAdvisorAlias('  John   Doe  ')).toBe('john   doe');
  });

  it('debería manejar strings vacíos', () => {
    expect(normalizeAdvisorAlias('')).toBe('');
    expect(normalizeAdvisorAlias('   ')).toBe('');
  });

  it('debería manejar caracteres especiales', () => {
    expect(normalizeAdvisorAlias('José María')).toBe('josé maría');
    expect(normalizeAdvisorAlias('John-Doe')).toBe('john-doe');
    expect(normalizeAdvisorAlias('John_Doe')).toBe('john_doe');
  });

  it('debería manejar números', () => {
    expect(normalizeAdvisorAlias('John Doe 123')).toBe('john doe 123');
  });
});

describe('normalizeAccountNumber', () => {
  it('debería extraer solo dígitos', () => {
    expect(normalizeAccountNumber('123456789')).toBe('123456789');
    expect(normalizeAccountNumber('123-456-789')).toBe('123456789');
    expect(normalizeAccountNumber('123 456 789')).toBe('123456789');
    expect(normalizeAccountNumber('ACC-123-456')).toBe('123456');
  });

  it('debería retornar null para null', () => {
    expect(normalizeAccountNumber(null)).toBeNull();
  });

  it('debería retornar null para undefined', () => {
    expect(normalizeAccountNumber(undefined)).toBeNull();
  });

  it('debería retornar null para string vacío', () => {
    expect(normalizeAccountNumber('')).toBeNull();
  });

  it('debería retornar null para string sin dígitos', () => {
    expect(normalizeAccountNumber('ABC-DEF')).toBeNull();
    expect(normalizeAccountNumber('   ')).toBeNull();
    expect(normalizeAccountNumber('no-numbers-here')).toBeNull();
  });

  it('debería manejar strings con solo caracteres especiales', () => {
    expect(normalizeAccountNumber('---')).toBeNull();
    expect(normalizeAccountNumber('   ')).toBeNull();
  });

  it('debería preservar orden de dígitos', () => {
    expect(normalizeAccountNumber('123-456-789')).toBe('123456789');
    expect(normalizeAccountNumber('987-654-321')).toBe('987654321');
  });

  it('debería manejar múltiples formatos de separadores', () => {
    expect(normalizeAccountNumber('123.456.789')).toBe('123456789');
    expect(normalizeAccountNumber('123/456/789')).toBe('123456789');
    expect(normalizeAccountNumber('123_456_789')).toBe('123456789');
  });

  it('debería manejar strings con espacios y otros caracteres', () => {
    expect(normalizeAccountNumber('ACC 123 456')).toBe('123456');
    expect(normalizeAccountNumber('Account #123-456')).toBe('123456');
  });
});








