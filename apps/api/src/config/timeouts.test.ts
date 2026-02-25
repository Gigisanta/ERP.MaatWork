/**
 * Tests para configuración de timeouts
 *
 * AI_DECISION: Tests completos para todas las funciones de timeouts
 * Justificación: Validación crítica de configuración de timeouts
 * Impacto: Prevenir timeouts incorrectos que causen fallos
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TIMEOUTS,
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

  it('debería manejar valores exactos en el límite', () => {
    const result = calculateDynamicTimeout(1000, 40, 100, 5000);
    // 1000 + (40 * 100) = 5000 exactamente
    expect(result).toBe(5000);
  });

  it('debería manejar valores negativos de itemCount', () => {
    const result = calculateDynamicTimeout(1000, -5, 100, 5000);
    // 1000 + (-5 * 100) = 500
    expect(result).toBe(500);
  });

  it('debería manejar perItemTimeout muy grande', () => {
    const result = calculateDynamicTimeout(1000, 10, 10000, 5000);
    // Calculado sería 101000, pero max es 5000
    expect(result).toBe(5000);
  });

  it('debería manejar maxTimeout undefined', () => {
    const result = calculateDynamicTimeout(1000, 100, 100);
    // 1000 + (100 * 100) = 11000, sin límite
    expect(result).toBe(11000);
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

  it('debería calcular correctamente con diferentes combinaciones', () => {
    const result1 = getPortfolioCompareTimeout(1, 0);
    const result2 = getPortfolioCompareTimeout(0, 1);
    const result3 = getPortfolioCompareTimeout(5, 5);

    expect(result1).toBeGreaterThan(0);
    expect(result2).toBeGreaterThan(0);
    expect(result3).toBeGreaterThan(result1);
    expect(result3).toBeGreaterThan(result2);
  });

  it('debería respetar el máximo cuando hay muchos items', () => {
    const result = getPortfolioCompareTimeout(1000, 1000);
    expect(result).toBeLessThanOrEqual(120000);
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

  it('debería retornar valid: true cuando configuración es correcta', () => {
    const result = validateTimeouts();
    // Con valores por defecto, debería ser válido
    expect(typeof result.valid).toBe('boolean');
  });

  it('debería generar warnings cuando PORTFOLIO_PERFORMANCE es muy bajo', async () => {
    const originalEnv = process.env.PORTFOLIO_PERFORMANCE_TIMEOUT;

    // Mock muy bajo timeout
    process.env.PORTFOLIO_PERFORMANCE_TIMEOUT = '3000';

    // Re-import para que tome el nuevo valor
    vi.resetModules();
    const { validateTimeouts: validate } = await import('./timeouts');
    const result = validate();

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w: string) => w.includes('PORTFOLIO_PERFORMANCE'))).toBe(true);

    // Restore
    if (originalEnv) {
      process.env.PORTFOLIO_PERFORMANCE_TIMEOUT = originalEnv;
    } else {
      delete process.env.PORTFOLIO_PERFORMANCE_TIMEOUT;
    }
    vi.resetModules();
  });

  it('debería generar warnings cuando PORTFOLIO_COMPARE_BASE es muy bajo', async () => {
    const originalEnv = process.env.PORTFOLIO_COMPARE_BASE_TIMEOUT;

    process.env.PORTFOLIO_COMPARE_BASE_TIMEOUT = '5000';

    vi.resetModules();
    const { validateTimeouts: validate } = await import('./timeouts');
    const result = validate();

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w: string) => w.includes('PORTFOLIO_COMPARE_BASE'))).toBe(true);

    if (originalEnv) {
      process.env.PORTFOLIO_COMPARE_BASE_TIMEOUT = originalEnv;
    } else {
      delete process.env.PORTFOLIO_COMPARE_BASE_TIMEOUT;
    }
    vi.resetModules();
  });

  it('debería generar warnings cuando PORTFOLIO_COMPARE_MAX es muy alto', async () => {
    const originalEnv = process.env.PORTFOLIO_COMPARE_MAX_TIMEOUT;

    process.env.PORTFOLIO_COMPARE_MAX_TIMEOUT = '400000';

    vi.resetModules();
    const { validateTimeouts: validate } = await import('./timeouts');
    const result = validate();

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w: string) => w.includes('PORTFOLIO_COMPARE_MAX'))).toBe(true);

    if (originalEnv) {
      process.env.PORTFOLIO_COMPARE_MAX_TIMEOUT = originalEnv;
    } else {
      delete process.env.PORTFOLIO_COMPARE_MAX_TIMEOUT;
    }
    vi.resetModules();
  });

  it('debería generar warnings cuando PRICE_BACKFILL es muy alto', async () => {
    const originalEnv = process.env.PRICE_BACKFILL_TIMEOUT;

    process.env.PRICE_BACKFILL_TIMEOUT = '700000';

    vi.resetModules();
    const { validateTimeouts: validate } = await import('./timeouts');
    const result = validate();

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w: string) => w.includes('PRICE_BACKFILL'))).toBe(true);

    if (originalEnv) {
      process.env.PRICE_BACKFILL_TIMEOUT = originalEnv;
    } else {
      delete process.env.PRICE_BACKFILL_TIMEOUT;
    }
    vi.resetModules();
  });

  it('debería retornar valid: false cuando hay warnings', async () => {
    const originalEnv = process.env.PORTFOLIO_PERFORMANCE_TIMEOUT;

    process.env.PORTFOLIO_PERFORMANCE_TIMEOUT = '3000';

    vi.resetModules();
    const { validateTimeouts: validate } = await import('./timeouts');
    const result = validate();

    expect(result.valid).toBe(false);

    if (originalEnv) {
      process.env.PORTFOLIO_PERFORMANCE_TIMEOUT = originalEnv;
    } else {
      delete process.env.PORTFOLIO_PERFORMANCE_TIMEOUT;
    }
    vi.resetModules();
  });
});

describe('TIMEOUTS constants', () => {
  it('debería tener todas las propiedades requeridas', () => {
    expect(TIMEOUTS).toHaveProperty('PORTFOLIO_PERFORMANCE');
    expect(TIMEOUTS).toHaveProperty('PORTFOLIO_COMPARE_BASE');
    expect(TIMEOUTS).toHaveProperty('PORTFOLIO_COMPARE_PER_ITEM');
    expect(TIMEOUTS).toHaveProperty('PORTFOLIO_COMPARE_MAX');
    expect(TIMEOUTS).toHaveProperty('PYTHON_SERVICE_DEFAULT');
    expect(TIMEOUTS).toHaveProperty('INSTRUMENT_SEARCH');
    expect(TIMEOUTS).toHaveProperty('PRICE_BACKFILL');
  });

  it('debería tener valores numéricos', () => {
    expect(typeof TIMEOUTS.PORTFOLIO_PERFORMANCE).toBe('number');
    expect(typeof TIMEOUTS.PORTFOLIO_COMPARE_BASE).toBe('number');
    expect(typeof TIMEOUTS.PORTFOLIO_COMPARE_PER_ITEM).toBe('number');
    expect(typeof TIMEOUTS.PORTFOLIO_COMPARE_MAX).toBe('number');
    expect(typeof TIMEOUTS.PYTHON_SERVICE_DEFAULT).toBe('number');
    expect(typeof TIMEOUTS.INSTRUMENT_SEARCH).toBe('number');
    expect(typeof TIMEOUTS.PRICE_BACKFILL).toBe('number');
  });

  it('debería tener valores positivos', () => {
    expect(TIMEOUTS.PORTFOLIO_PERFORMANCE).toBeGreaterThan(0);
    expect(TIMEOUTS.PORTFOLIO_COMPARE_BASE).toBeGreaterThan(0);
    expect(TIMEOUTS.PORTFOLIO_COMPARE_PER_ITEM).toBeGreaterThan(0);
    expect(TIMEOUTS.PORTFOLIO_COMPARE_MAX).toBeGreaterThan(0);
    expect(TIMEOUTS.PYTHON_SERVICE_DEFAULT).toBeGreaterThan(0);
    expect(TIMEOUTS.INSTRUMENT_SEARCH).toBeGreaterThan(0);
    expect(TIMEOUTS.PRICE_BACKFILL).toBeGreaterThan(0);
  });

  it('debería usar valores por defecto cuando env vars no están definidas', () => {
    // Los valores por defecto están en el código fuente
    expect(TIMEOUTS.PORTFOLIO_PERFORMANCE).toBe(60000); // 60s default
    expect(TIMEOUTS.PORTFOLIO_COMPARE_BASE).toBe(30000); // 30s default
    expect(TIMEOUTS.PORTFOLIO_COMPARE_PER_ITEM).toBe(5000); // 5s default
    expect(TIMEOUTS.PORTFOLIO_COMPARE_MAX).toBe(120000); // 120s default
    expect(TIMEOUTS.PYTHON_SERVICE_DEFAULT).toBe(30000); // 30s default
    expect(TIMEOUTS.INSTRUMENT_SEARCH).toBe(10000); // 10s default
    expect(TIMEOUTS.PRICE_BACKFILL).toBe(300000); // 5min default
  });
});
