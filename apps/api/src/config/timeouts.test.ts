/**
 * Tests para configuración de timeouts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateDynamicTimeout,
  getPortfolioCompareTimeout,
  validateTimeouts,
} from './timeouts';

describe('calculateDynamicTimeout', () => {
  it('debería calcular timeout basado en items', () => {
    const result = calculateDynamicTimeout(1000, 5, 100, 5000);
    // 1000 + (5 * 100) = 1500
    expect(result).toBe(1500);
  });

  it('debería respetar el máximo', () => {
    const result = calculateDynamicTimeout(1000, 100, 100, 5000);
    // 1000 + (100 * 100) = 11000, pero max es 5000
    expect(result).toBe(5000);
  });

  it('debería funcionar sin máximo', () => {
    const result = calculateDynamicTimeout(1000, 10, 100);
    // 1000 + (10 * 100) = 2000
    expect(result).toBe(2000);
  });

  it('debería manejar 0 items', () => {
    const result = calculateDynamicTimeout(1000, 0, 100, 5000);
    expect(result).toBe(1000);
  });

  it('debería manejar timeout base mayor que máximo', () => {
    const result = calculateDynamicTimeout(6000, 0, 100, 5000);
    expect(result).toBe(5000);
  });
});

describe('getPortfolioCompareTimeout', () => {
  it('debería calcular timeout para comparación simple', () => {
    // 2 portfolios, 1 benchmark = 3 items total
    const result = getPortfolioCompareTimeout(2, 1);
    expect(result).toBeGreaterThan(0);
    expect(typeof result).toBe('number');
  });

  it('debería incrementar con más items', () => {
    const small = getPortfolioCompareTimeout(1, 1);
    const large = getPortfolioCompareTimeout(10, 10);
    expect(large).toBeGreaterThan(small);
  });

  it('debería manejar 0 items', () => {
    const result = getPortfolioCompareTimeout(0, 0);
    expect(result).toBeGreaterThan(0);
  });

  it('debería tener un límite máximo razonable', () => {
    const result = getPortfolioCompareTimeout(100, 100);
    // No debería exceder el timeout máximo configurado
    expect(result).toBeLessThanOrEqual(120000); // 120s max default
  });
});

describe('validateTimeouts', () => {
  it('debería validar configuración', () => {
    const result = validateTimeouts();
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('warnings');
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('debería retornar array de warnings', () => {
    const result = validateTimeouts();
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  // Nota: Los tests específicos de valores dependen de las env vars
  // En un entorno de test, podríamos mockear process.env
});

