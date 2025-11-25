/**
 * Tests para DebugConsole
 * 
 * AI_DECISION: Tests unitarios para DebugConsole class
 * Justificación: Validación crítica de debugging y captura de errores
 * Impacto: Prevenir errores en debugging y captura de errores
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DebugConsole, initDebugConsole, type ErrorLog } from './debug-console';

describe('DebugConsole', () => {
  let mockDocument: {
    createElement: ReturnType<typeof vi.fn>;
    body: { appendChild: ReturnType<typeof vi.fn> };
    readyState: string;
    addEventListener: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockDocument = {
      createElement: vi.fn((tag: string) => {
        const element = {
          tagName: tag.toUpperCase(),
          style: {} as CSSStyleDeclaration,
          textContent: '',
          innerHTML: '',
          className: '',
          onclick: null as (() => void) | null,
          onmouseenter: null as (() => void) | null,
          onmouseleave: null as (() => void) | null,
          oninput: null as (() => void) | null,
          onscroll: null as (() => void) | null,
          appendChild: vi.fn(),
          querySelector: vi.fn(),
          scrollTop: 0,
          scrollHeight: 100,
          clientHeight: 50,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn()
        } as any;
        return element;
      }),
      body: {
        appendChild: vi.fn()
      },
      readyState: 'complete',
      addEventListener: vi.fn()
    };

    global.document = mockDocument as any;
    global.window = {
      ...global.window,
      addEventListener: vi.fn(),
      matchMedia: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }),
      location: { href: 'http://localhost:3000' },
      navigator: { userAgent: 'test-agent' }
    } as any;

    global.localStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn()
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('debería inicializar correctamente cuando window está disponible', () => {
      const debugConsole = new DebugConsole();
      
      expect(debugConsole).toBeDefined();
    });

    it('debería retornar early cuando window es undefined', () => {
      const originalWindow = global.window;
      delete (global as any).window;
      
      const debugConsole = new DebugConsole();
      
      // No debería lanzar error
      expect(debugConsole).toBeDefined();
      
      global.window = originalWindow;
    });

    it('debería cargar logs desde localStorage', () => {
      const savedLogs: ErrorLog[] = [
        {
          timestamp: new Date().toISOString(),
          type: 'error',
          message: 'Test error',
          count: 1,
          collapsed: true
        }
      ];
      
      global.localStorage.getItem = vi.fn().mockReturnValue(JSON.stringify(savedLogs));
      
      const debugConsole = new DebugConsole();
      const logs = debugConsole.getLogs();
      
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('Test error');
    });

    it('debería manejar localStorage corrupto', () => {
      global.localStorage.getItem = vi.fn().mockReturnValue('invalid-json');
      const mockWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const debugConsole = new DebugConsole();
      
      expect(debugConsole.getLogs()).toEqual([]);
      expect(mockWarn).toHaveBeenCalled();
      
      mockWarn.mockRestore();
    });
  });

  describe('log method', () => {
    it('debería agregar log correctamente', () => {
      const debugConsole = new DebugConsole();
      
      debugConsole['log']({
        type: 'error',
        message: 'Test error'
      });
      
      const logs = debugConsole.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('Test error');
      expect(logs[0].type).toBe('error');
    });

    it('debería deduplicar logs recientes', () => {
      const debugConsole = new DebugConsole();
      
      debugConsole['log']({
        type: 'error',
        message: 'Duplicate error',
        stack: 'Stack trace'
      });
      
      // Log duplicado dentro de la ventana de deduplicación
      debugConsole['log']({
        type: 'error',
        message: 'Duplicate error',
        stack: 'Stack trace'
      });
      
      const logs = debugConsole.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].count).toBe(2);
    });

    it('debería limitar número de logs a maxLogs', () => {
      const debugConsole = new DebugConsole();
      debugConsole['maxLogs'] = 5;
      
      // Agregar más logs que el máximo
      for (let i = 0; i < 10; i++) {
        debugConsole['log']({
          type: 'info',
          message: `Log ${i}`
        });
      }
      
      const logs = debugConsole.getLogs();
      expect(logs.length).toBe(5);
    });

    it('debería prevenir logging durante isLogging', () => {
      const debugConsole = new DebugConsole();
      debugConsole['isLogging'] = true;
      
      debugConsole['log']({
        type: 'info',
        message: 'Should not log'
      });
      
      const logs = debugConsole.getLogs();
      expect(logs.length).toBe(0);
    });
  });

  describe('getLogs', () => {
    it('debería retornar copia de logs', () => {
      const debugConsole = new DebugConsole();
      
      debugConsole['log']({
        type: 'error',
        message: 'Test'
      });
      
      const logs1 = debugConsole.getLogs();
      const logs2 = debugConsole.getLogs();
      
      expect(logs1).not.toBe(logs2); // Diferentes instancias
      expect(logs1).toEqual(logs2); // Mismo contenido
    });
  });

  describe('exportLogs', () => {
    it('debería exportar logs como JSON', () => {
      const debugConsole = new DebugConsole();
      
      debugConsole['log']({
        type: 'error',
        message: 'Test error'
      });
      
      const exported = debugConsole.exportLogs();
      const parsed = JSON.parse(exported);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
      expect(parsed[0].message).toBe('Test error');
    });
  });

  describe('clearLogs', () => {
    it('debería limpiar todos los logs', () => {
      const debugConsole = new DebugConsole();
      
      debugConsole['log']({
        type: 'error',
        message: 'Test error'
      });
      
      expect(debugConsole.getLogs().length).toBe(1);
      
      debugConsole.clearLogs();
      
      expect(debugConsole.getLogs().length).toBe(0);
    });

    it('debería limpiar localStorage', () => {
      const debugConsole = new DebugConsole();
      
      debugConsole['log']({
        type: 'error',
        message: 'Test'
      });
      
      debugConsole.clearLogs();
      
      expect(global.localStorage.removeItem).toHaveBeenCalledWith('debug-console-logs');
    });
  });

  describe('Error handlers', () => {
    it('debería capturar window error events', () => {
      const debugConsole = new DebugConsole();
      
      const errorEvent = new ErrorEvent('error', {
        message: 'Test error',
        filename: 'test.js',
        lineno: 10,
        colno: 5,
        error: new Error('Test error')
      });
      
      // Simular evento de error
      const errorHandler = (global.window.addEventListener as ReturnType<typeof vi.fn>).mock.calls
        .find((call: unknown[]) => call[0] === 'error')?.[1] as ((event: ErrorEvent) => void);
      
      if (errorHandler) {
        errorHandler(errorEvent);
      }
      
      const logs = debugConsole.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].type).toBe('error');
    });

    it('debería capturar unhandled promise rejections', () => {
      const debugConsole = new DebugConsole();
      
      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject('Test rejection'),
        reason: 'Test reason'
      } as any);
      
      // Simular evento de rejection
      const rejectionHandler = (global.window.addEventListener as ReturnType<typeof vi.fn>).mock.calls
        .find((call: unknown[]) => call[0] === 'unhandledrejection')?.[1] as ((event: PromiseRejectionEvent) => void);
      
      if (rejectionHandler) {
        rejectionHandler(rejectionEvent);
      }
      
      const logs = debugConsole.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].type).toBe('error');
      expect(logs[0].message).toContain('Unhandled Promise Rejection');
    });
  });

  describe('initDebugConsole', () => {
    it('debería inicializar DebugConsole cuando window está disponible', () => {
      const result = initDebugConsole();
      
      expect(result).toBeDefined();
      expect(global.window.debugConsole).toBeDefined();
    });

    it('debería retornar null cuando window es undefined', () => {
      const originalWindow = global.window;
      delete (global as any).window;
      
      const result = initDebugConsole();
      
      expect(result).toBeNull();
      
      global.window = originalWindow;
    });

    it('debería manejar errores durante inicialización', () => {
      const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Forzar error en constructor
      global.document.createElement = vi.fn().mockImplementation(() => {
        throw new Error('DOM error');
      });
      
      const result = initDebugConsole();
      
      // Debería crear fallback
      expect(result).toBeNull();
      expect(global.window.debugConsole).toBeDefined();
      
      mockError.mockRestore();
    });

    it('debería exponer debugConsole globalmente', () => {
      initDebugConsole();
      
      expect(global.window.debugConsole).toBeDefined();
      expect(typeof global.window.debugConsole.getLogs).toBe('function');
      expect(typeof global.window.debugConsole.exportLogs).toBe('function');
      expect(typeof global.window.debugConsole.clearLogs).toBe('function');
    });
  });
});


