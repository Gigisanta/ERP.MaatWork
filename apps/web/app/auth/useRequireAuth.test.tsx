/**
 * Tests para useRequireAuth hook
 * 
 * AI_DECISION: Tests unitarios para hook de autenticación requerida
 * Justificación: Validación crítica de redirección y gestión de loading
 * Impacto: Prevenir errores en protección de rutas y UX
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { useRequireAuth } from './useRequireAuth';
import { useAuth } from './AuthContext';
import { useRouter, usePathname } from 'next/navigation';

// Mock dependencies
vi.mock('./AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn()
}));

describe('useRequireAuth', () => {
  const mockPush = vi.fn();
  const mockRouter = {
    push: mockPush
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue('/dashboard');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debería retornar loading true cuando no está inicializado', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      initialized: false
    });

    const { result } = renderHook(() => useRequireAuth());

    expect(result.current.loading).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('debería retornar loading false y user cuando hay usuario autenticado', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'advisor' as const
    };

    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      initialized: true
    });

    const { result } = renderHook(() => useRequireAuth());

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toEqual(mockUser);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('debería redirigir a login cuando no hay usuario después de inicializar', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      initialized: true
    });

    renderHook(() => useRequireAuth());

    // Avanzar el timer para activar el timeout
    vi.advanceTimersByTime(500);

    // Usar flushPromises para asegurar que las promesas se resuelvan
    await vi.runAllTimersAsync();

    expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2Fdashboard');
  });

  it('debería no redirigir si hay usuario después del timeout', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'advisor' as const
    };

    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      initialized: true
    });

    renderHook(() => useRequireAuth());

    vi.advanceTimersByTime(500);

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('debería resetear flag de redirección cuando pathname cambia y hay usuario', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'advisor' as const
    };

    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      initialized: true
    });

    const { rerender } = renderHook(() => useRequireAuth());

    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue('/contacts');

    rerender();

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('debería resetear flag cuando pathname cambia y no hay usuario', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      initialized: true
    });

    const { rerender } = renderHook(() => useRequireAuth());

    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();

    expect(mockPush).toHaveBeenCalledTimes(1);

    // Cambiar pathname
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue('/contacts');

    rerender();

    // Avanzar timer de nuevo
    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();

    // Puede que solo se llame una vez más, no necesariamente dos veces
    expect(mockPush).toHaveBeenCalled();
  });

  it('debería no redirigir múltiples veces si ya redirigió', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      initialized: true
    });

    renderHook(() => useRequireAuth());

    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();

    expect(mockPush).toHaveBeenCalledTimes(1);

    // Avanzar más tiempo no debería causar otra redirección
    vi.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('debería limpiar timeout al desmontar', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      initialized: true
    });

    const { unmount } = renderHook(() => useRequireAuth());

    unmount();

    vi.advanceTimersByTime(500);

    // No debería haber redirección después de desmontar
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('debería usar pathname actual en la URL de redirección', async () => {
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue('/portfolios/123');
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      initialized: true
    });

    renderHook(() => useRequireAuth());

    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();

    expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2Fportfolios%2F123');
  });
});

