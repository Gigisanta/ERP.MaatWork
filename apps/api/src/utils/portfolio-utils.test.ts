/**
 * Tests para portfolio-utils
 * 
 * AI_DECISION: Tests unitarios para utilidades de portfolios
 * Justificación: Validación crítica de cálculos matemáticos
 * Impacto: Prevenir errores en cálculos de peso
 */

import { describe, it, expect } from 'vitest';
import { calculateTotalWeight, isValidTotalWeight } from './portfolio-utils';

describe('calculateTotalWeight', () => {
  it('debería calcular peso total correctamente', () => {
    const lines = [
      { targetWeight: 0.3 },
      { targetWeight: 0.4 },
      { targetWeight: 0.3 }
    ];

    const total = calculateTotalWeight(lines);
    expect(total).toBe(1.0);
  });

  it('debería manejar pesos como strings', () => {
    const lines = [
      { targetWeight: '0.25' },
      { targetWeight: '0.25' },
      { targetWeight: '0.5' }
    ];

    const total = calculateTotalWeight(lines);
    expect(total).toBe(1.0);
  });

  it('debería manejar array vacío', () => {
    const lines: Array<{ targetWeight: string | number }> = [];
    const total = calculateTotalWeight(lines);
    expect(total).toBe(0);
  });

  it('debería manejar pesos mixtos (string y number)', () => {
    const lines = [
      { targetWeight: 0.3 },
      { targetWeight: '0.4' },
      { targetWeight: 0.3 }
    ];

    const total = calculateTotalWeight(lines);
    expect(total).toBe(1.0);
  });
});

describe('isValidTotalWeight', () => {
  it('debería retornar true cuando peso total es 1.0', () => {
    expect(isValidTotalWeight(1.0)).toBe(true);
  });

  it('debería retornar true cuando peso total está dentro de tolerancia', () => {
    expect(isValidTotalWeight(1.00005)).toBe(true);
    expect(isValidTotalWeight(0.99995)).toBe(true);
  });

  it('debería retornar false cuando peso total está fuera de tolerancia', () => {
    expect(isValidTotalWeight(1.1)).toBe(false);
    expect(isValidTotalWeight(0.9)).toBe(false);
  });

  it('debería usar tolerancia personalizada', () => {
    expect(isValidTotalWeight(1.01, 0.02)).toBe(true);
    expect(isValidTotalWeight(1.01, 0.001)).toBe(false);
  });

  it('debería manejar pesos menores a 1.0 con tolerancia', () => {
    expect(isValidTotalWeight(0.999, 0.01)).toBe(true);
    expect(isValidTotalWeight(0.99, 0.001)).toBe(false);
  });
});

