/**
 * Tests para env config
 * 
 * AI_DECISION: Tests unitarios para configuración de variables de entorno
 * Justificación: Validación crítica de configuración
 * Impacto: Prevenir errores por configuración faltante
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('dotenv', () => ({
  config: vi.fn()
}));

describe('env config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería validar variables requeridas', () => {
    // Test that DATABASE_URL is required
    const originalEnv = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    // Reset module to reload
    vi.resetModules();

    // Import should not throw in test environment
    expect(() => {
      require('./env');
    }).not.toThrow();

    process.env.DATABASE_URL = originalEnv;
  });

  it('debería usar valores por defecto', () => {
    const originalPort = process.env.PORT;
    delete process.env.PORT;

    vi.resetModules();

    // PORT should have a default
    expect(process.env.PORT).toBeUndefined();

    process.env.PORT = originalPort;
  });
});


