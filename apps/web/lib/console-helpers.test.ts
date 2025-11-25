/**
 * Tests para console helpers
 * 
 * AI_DECISION: Tests unitarios para setupConsoleHelpers
 * Justificación: Validación de helpers de consola
 * Impacto: Prevenir errores en debugging
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupConsoleHelpers, debugHelperScript } from './console-helpers';

describe('console-helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window
    global.window = {
      ...global.window,
      debugConsole: undefined
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('debugHelperScript', () => {
    it('debería ser un string', () => {
      expect(typeof debugHelperScript).toBe('string');
      expect(debugHelperScript.length).toBeGreaterThan(0);
    });

    it('debería contener código para verificar debugConsole', () => {
      expect(debugHelperScript).toContain('debugConsole');
      expect(debugHelperScript).toContain('localStorage');
    });
  });

  describe('setupConsoleHelpers', () => {
    it('debería retornar null cuando window es undefined', () => {
      const originalWindow = global.window;
      delete (global as any).window;

      const result = setupConsoleHelpers();

      expect(result).toBeNull();

      global.window = originalWindow;
    });

    it('debería ejecutar script cuando window está disponible', () => {
      const mockEval = vi.fn().mockReturnValue({ getLogs: vi.fn() });
      global.window = {
        ...global.window,
        eval: mockEval
      } as any;

      const result = setupConsoleHelpers();

      expect(mockEval).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('debería manejar errores al ejecutar script', () => {
      const mockEval = vi.fn().mockImplementation(() => {
        throw new Error('Eval error');
      });
      const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      global.window = {
        ...global.window,
        eval: mockEval
      } as any;

      const result = setupConsoleHelpers();

      expect(result).toBeNull();
      expect(mockConsoleError).toHaveBeenCalled();

      mockConsoleError.mockRestore();
    });
  });
});


