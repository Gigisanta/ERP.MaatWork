/**
 * Tests para logger
 *
 * AI_DECISION: Tests unitarios para logger estructurado
 * Justificación: Validación crítica de logging
 * Impacto: Prevenir errores en logging
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('pino', () => ({
  default: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería tener logger definido', async () => {
    const { logger } = await import('./logger');

    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
  });

  it('debería configurar logger en desarrollo', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    // Reset module to reload with new env
    vi.resetModules();
    const { logger } = await import('./logger');

    expect(logger).toBeDefined();

    process.env.NODE_ENV = originalEnv;
  });

  it('debería configurar logger en producción', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    // Reset module to reload with new env
    vi.resetModules();
    const { logger } = await import('./logger');

    expect(logger).toBeDefined();

    process.env.NODE_ENV = originalEnv;
  });
});
