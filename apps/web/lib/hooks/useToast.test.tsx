/**
 * Tests para useToast hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, render, screen } from '@testing-library/react';
import React from 'react';
import { useToast, ToastProvider } from './useToast';

describe('useToast', () => {
  beforeEach(() => {
    // Limpiar cualquier estado previo
  });

  describe('useToast hook', () => {
    it('debería lanzar error si se usa fuera del provider', () => {
      // Suprimir console.error para este test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useToast());
      }).toThrow('useToast must be used within ToastProvider');

      consoleSpy.mockRestore();
    });

    it('debería mostrar toast con título', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ToastProvider>{children}</ToastProvider>
      );

      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.showToast('Test Title');
      });

      expect(result.current.toast.show).toBe(true);
      expect(result.current.toast.title).toBe('Test Title');
      expect(result.current.toast.variant).toBe('info');
    });

    it('debería mostrar toast con título y descripción', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ToastProvider>{children}</ToastProvider>
      );

      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.showToast('Test Title', 'Test Description');
      });

      expect(result.current.toast.show).toBe(true);
      expect(result.current.toast.title).toBe('Test Title');
      expect(result.current.toast.description).toBe('Test Description');
    });

    it('debería mostrar toast con variant personalizado', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ToastProvider>{children}</ToastProvider>
      );

      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.showToast('Error Title', 'Error Description', 'error');
      });

      expect(result.current.toast.variant).toBe('error');
    });

    it('debería ocultar toast', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ToastProvider>{children}</ToastProvider>
      );

      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.showToast('Test Title');
      });

      expect(result.current.toast.show).toBe(true);

      act(() => {
        result.current.hideToast();
      });

      expect(result.current.toast.show).toBe(false);
    });

    it('debería mantener título y descripción al ocultar', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ToastProvider>{children}</ToastProvider>
      );

      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.showToast('Test Title', 'Test Description');
      });

      act(() => {
        result.current.hideToast();
      });

      expect(result.current.toast.show).toBe(false);
      expect(result.current.toast.title).toBe('Test Title');
      expect(result.current.toast.description).toBe('Test Description');
    });
  });

  describe('ToastProvider', () => {
    it('debería renderizar children', () => {
      render(
        <ToastProvider>
          <div>Test Content</div>
        </ToastProvider>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });
});
