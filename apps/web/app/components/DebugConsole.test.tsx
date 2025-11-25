/**
 * Tests para DebugConsole component
 * 
 * AI_DECISION: Tests unitarios para inicialización de Debug Console
 * Justificación: Validación crítica de inicialización y fallback de debug console
 * Impacto: Prevenir errores en herramientas de desarrollo
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import DebugConsole from './DebugConsole';

// Mock dependencies
vi.mock('../../lib/debug-console', () => ({
  initDebugConsole: vi.fn()
}));

import { initDebugConsole } from '../../lib/debug-console';

describe('DebugConsole', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalWindow = global.window;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Mock window object
    Object.defineProperty(global, 'window', {
      value: {
        ...originalWindow,
        localStorage: {
          getItem: vi.fn(),
          setItem: vi.fn(),
          removeItem: vi.fn()
        }
      },
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env.NODE_ENV = originalEnv;
    Object.defineProperty(global, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true
    });
    delete (global.window as any).debugConsole;
    delete (global.window as any).$debug;
  });

  it('debería retornar null (sin UI)', () => {
    const { container } = render(<DebugConsole />);
    expect(container.firstChild).toBeNull();
  });

  it('no debería inicializar en producción', () => {
    process.env.NODE_ENV = 'production';
    
    render(<DebugConsole />);
    vi.advanceTimersByTime(500);

    expect(initDebugConsole).not.toHaveBeenCalled();
  });

  it('no debería inicializar en servidor (sin window)', () => {
    process.env.NODE_ENV = 'development';
    Object.defineProperty(global, 'window', {
      value: undefined,
      writable: true,
      configurable: true
    });

    render(<DebugConsole />);
    vi.advanceTimersByTime(500);

    expect(initDebugConsole).not.toHaveBeenCalled();
  });

  it('debería inicializar en desarrollo con window', async () => {
    process.env.NODE_ENV = 'development';
    (initDebugConsole as ReturnType<typeof vi.fn>).mockReturnValue({
      getLogs: vi.fn(),
      exportLogs: vi.fn(),
      clearLogs: vi.fn()
    });

    render(<DebugConsole />);
    vi.advanceTimersByTime(500);

    await vi.runAllTimersAsync();

    expect(initDebugConsole).toHaveBeenCalled();
  });

  it('debería crear fallback cuando initDebugConsole retorna null', async () => {
    process.env.NODE_ENV = 'development';
    (initDebugConsole as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    render(<DebugConsole />);
    vi.advanceTimersByTime(500);

    await vi.runAllTimersAsync();

    expect(consoleWarnSpy).toHaveBeenCalled();
    expect((global.window as any).debugConsole).toBeDefined();
    expect((global.window as any).$debug).toBeDefined();

    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('debería crear fallback cuando initDebugConsole lanza error', async () => {
    process.env.NODE_ENV = 'development';
    (initDebugConsole as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Init failed'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(<DebugConsole />);
    vi.advanceTimersByTime(500);

    await vi.runAllTimersAsync();

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect((global.window as any).debugConsole).toBeDefined();
    expect((global.window as any).$debug).toBeDefined();

    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('debería manejar localStorage en fallback', async () => {
    process.env.NODE_ENV = 'development';
    (initDebugConsole as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const localStorageGetItem = vi.fn().mockReturnValue('[]');
    (global.window as any).localStorage.getItem = localStorageGetItem;

    render(<DebugConsole />);
    vi.advanceTimersByTime(500);

    await vi.runAllTimersAsync();

    const fallback = (global.window as any).debugConsole;
    expect(fallback).toBeDefined();
    expect(fallback.getLogs).toBeDefined();
    expect(fallback.exportLogs).toBeDefined();
    expect(fallback.clearLogs).toBeDefined();
  });

  it('debería manejar errores de JSON.parse en fallback', async () => {
    process.env.NODE_ENV = 'development';
    (initDebugConsole as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const localStorageGetItem = vi.fn().mockReturnValue('invalid json');
    (global.window as any).localStorage.getItem = localStorageGetItem;

    render(<DebugConsole />);
    vi.advanceTimersByTime(500);

    await vi.runAllTimersAsync();

    const fallback = (global.window as any).debugConsole;
    expect(fallback.getLogs()).toEqual([]);
  });
});

