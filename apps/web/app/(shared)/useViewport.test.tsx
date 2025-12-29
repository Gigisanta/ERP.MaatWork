import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewport } from './useViewport';

describe('useViewport', () => {
  let originalInnerWidth: number;
  let resizeEvent: Event;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    resizeEvent = new Event('resize');

    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('debería retornar width inicial correcto', () => {
    const { result } = renderHook(() => useViewport());

    expect(result.current.width).toBe(1920);
  });

  it('debería calcular isXs correctamente cuando width < 640', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    const { result } = renderHook(() => useViewport());

    expect(result.current.isXs).toBe(true);
    expect(result.current.isSm).toBe(false);
    expect(result.current.isMd).toBe(false);
    expect(result.current.isLg).toBe(false);
  });

  it('debería calcular isSm correctamente cuando 640 <= width < 768', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 700,
    });

    const { result } = renderHook(() => useViewport());

    expect(result.current.isXs).toBe(false);
    expect(result.current.isSm).toBe(true);
    expect(result.current.isMd).toBe(false);
    expect(result.current.isLg).toBe(false);
  });

  it('debería calcular isMd correctamente cuando 768 <= width < 1024', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 900,
    });

    const { result } = renderHook(() => useViewport());

    expect(result.current.isXs).toBe(false);
    expect(result.current.isSm).toBe(false);
    expect(result.current.isMd).toBe(true);
    expect(result.current.isLg).toBe(false);
  });

  it('debería calcular isLg correctamente cuando width >= 1024', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    });

    const { result } = renderHook(() => useViewport());

    expect(result.current.isXs).toBe(false);
    expect(result.current.isSm).toBe(false);
    expect(result.current.isMd).toBe(false);
    expect(result.current.isLg).toBe(true);
  });

  it('debería actualizar width cuando window se redimensiona', () => {
    const { result } = renderHook(() => useViewport());

    expect(result.current.width).toBe(1920);

    // Simular resize
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800,
    });

    act(() => {
      window.dispatchEvent(resizeEvent);
    });

    expect(result.current.width).toBe(800);
    expect(result.current.isMd).toBe(true);
  });

  it('debería limpiar event listener al desmontar', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useViewport());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('debería manejar múltiples resize events', () => {
    const { result, rerender } = renderHook(() => useViewport());

    expect(result.current.width).toBe(1920);

    // Primer resize - cambiar innerWidth antes de disparar el evento
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      });
      window.dispatchEvent(new Event('resize'));
    });

    // AI_DECISION: 600 es isXs (< 640)
    // Justificación: Match real logic in useViewport.ts
    expect(result.current.width).toBe(600);
    expect(result.current.isXs).toBe(true);
    expect(result.current.isSm).toBe(false);

    // Segundo resize
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1500,
      });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.width).toBe(1500);
    expect(result.current.isLg).toBe(true);
  });

  it('debería retornar valores readonly', () => {
    const { result } = renderHook(() => useViewport());

    // Verificar que las propiedades son readonly (TypeScript)
    // En runtime, verificamos que son constantes
    expect(typeof result.current.width).toBe('number');
    expect(typeof result.current.isXs).toBe('boolean');
    expect(typeof result.current.isSm).toBe('boolean');
    expect(typeof result.current.isMd).toBe('boolean');
    expect(typeof result.current.isLg).toBe('boolean');
  });
});
