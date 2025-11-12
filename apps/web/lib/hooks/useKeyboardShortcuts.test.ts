/**
 * Tests para useKeyboardShortcuts hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, useSearchShortcut, useEscapeShortcut } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería registrar shortcuts', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts([
        {
          key: 'k',
          ctrlKey: true,
          handler
        }
      ])
    );

    // Simular keydown event
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true
    });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();

    unmount();
  });

  it('debería no ejecutar handler cuando disabled', () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts(
        [
          {
            key: 'k',
            ctrlKey: true,
            handler
          }
        ],
        false
      )
    );

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true
    });
    window.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it('debería limpiar event listener en unmount', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts([
        {
          key: 'k',
          handler
        }
      ])
    );

    unmount();

    const event = new KeyboardEvent('keydown', {
      key: 'k'
    });
    window.dispatchEvent(event);

    // Handler no debería ser llamado después de unmount
    // (aunque en tests puede ser difícil verificar esto directamente)
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('useSearchShortcut', () => {
  it('debería focus search input con Ctrl+K', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    const ref = { current: input };

    renderHook(() => useSearchShortcut(ref as React.RefObject<HTMLInputElement>));

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true
    });
    window.dispatchEvent(event);

    expect(document.activeElement).toBe(input);

    document.body.removeChild(input);
  });
});

describe('useEscapeShortcut', () => {
  it('debería llamar onClose con Escape', () => {
    const onClose = vi.fn();
    renderHook(() => useEscapeShortcut(onClose));

    const event = new KeyboardEvent('keydown', {
      key: 'Escape'
    });
    window.dispatchEvent(event);

    expect(onClose).toHaveBeenCalled();
  });
});


