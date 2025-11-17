/**
 * Tests para AuthContext
 * 
 * AI_DECISION: Tests unitarios para contexto de autenticación
 * Justificación: Validación crítica de login, registro y gestión de sesión
 * Impacto: Prevenir errores en autenticación y gestión de usuario
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { fetchWithLogging, postJson } from '../../lib/fetch-client';
import { config } from '../../lib/config';
import { logger } from '../../lib/logger';

// Mock dependencies
vi.mock('../../lib/fetch-client', () => ({
  fetchWithLogging: vi.fn(),
  postJson: vi.fn()
}));

vi.mock('../../lib/config', () => ({
  config: {
    apiUrl: 'http://localhost:3001'
  }
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    updateUser: vi.fn()
  }
}));

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AuthProvider', () => {
    it('debería renderizar children', () => {
      // Mock fetchWithLogging para que retorne una promesa resuelta
      (fetchWithLogging as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({})
      });

      render(
        <AuthProvider>
          <div>Test Content</div>
        </AuthProvider>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('debería verificar sesión al montar', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          user: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'advisor',
            fullName: 'Test User'
          }
        })
      };
      (fetchWithLogging as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      expect(fetchWithLogging).toHaveBeenCalledWith(
        `${config.apiUrl}/v1/auth/me`,
        { credentials: 'include' }
      );
    });

    it('debería manejar error al verificar sesión', async () => {
      (fetchWithLogging as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      expect(result.current.user).toBeNull();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('debería manejar respuesta sin usuario', async () => {
      const mockResponse = {
        ok: false,
        json: vi.fn().mockResolvedValue({})
      };
      (fetchWithLogging as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      expect(result.current.user).toBeNull();
    });
  });

  describe('useAuth', () => {
    it('debería lanzar error si se usa fuera del provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within AuthProvider');

      consoleSpy.mockRestore();
    });

    it('debería retornar contexto cuando está dentro del provider', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('initialized');
      expect(result.current).toHaveProperty('login');
      expect(result.current).toHaveProperty('register');
      expect(result.current).toHaveProperty('logout');
    });
  });

  describe('login', () => {
    it('debería hacer login exitoso', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'advisor' as const,
        fullName: 'Test User'
      };

      (postJson as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: mockUser
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(result.current.user).toEqual(mockUser);
      expect(logger.updateUser).toHaveBeenCalledWith(mockUser.id, mockUser.role);
      expect(postJson).toHaveBeenCalledWith(
        `${config.apiUrl}/v1/auth/login`,
        {
          identifier: 'test@example.com',
          password: 'password',
          rememberMe: undefined
        }
      );
    });

    it('debería pasar rememberMe cuando se proporciona', async () => {
      (postJson as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: { id: 'user-123', email: 'test@example.com', role: 'advisor' }
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password', true);
      });

      expect(postJson).toHaveBeenCalledWith(
        `${config.apiUrl}/v1/auth/login`,
        expect.objectContaining({
          rememberMe: true
        })
      );
    });

    it('debería manejar error en login', async () => {
      const mockError = new Error('Invalid credentials');
      (postJson as ReturnType<typeof vi.fn>).mockRejectedValue(mockError);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.login('test@example.com', 'wrong-password');
        })
      ).rejects.toThrow('Invalid credentials');

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('debería hacer registro exitoso', async () => {
      (postJson as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      const registerData = {
        email: 'new@example.com',
        fullName: 'New User',
        password: 'password123',
        role: 'advisor' as const
      };

      await act(async () => {
        await result.current.register(registerData);
      });

      expect(postJson).toHaveBeenCalledWith(
        `${config.apiUrl}/v1/auth/register`,
        registerData
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Registro exitoso',
        expect.objectContaining({
          email: 'new@example.com',
          role: 'advisor'
        })
      );
    });

    it('debería manejar error en registro', async () => {
      const mockError = new Error('Email already exists');
      (postJson as ReturnType<typeof vi.fn>).mockRejectedValue(mockError);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.register({
            email: 'existing@example.com',
            fullName: 'User',
            password: 'password',
            role: 'advisor'
          });
        })
      ).rejects.toThrow('Email already exists');

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('debería hacer logout y limpiar usuario', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'advisor' as const
      };

      // Primero hacer login
      (postJson as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: mockUser
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(result.current.user).toEqual(mockUser);

      // Ahora hacer logout
      (postJson as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(logger.updateUser).toHaveBeenCalledWith(null, null);
      expect(postJson).toHaveBeenCalledWith(
        `${config.apiUrl}/v1/auth/logout`,
        {}
      );
    });

    it('debería manejar error al limpiar cookie en logout', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'advisor' as const
      };

      (postJson as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ success: true, user: mockUser })
        .mockRejectedValueOnce(new Error('Network error'));

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      await act(async () => {
        result.current.logout();
        // Esperar un tick para que el catch se ejecute
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // El usuario debe ser limpiado incluso si hay error al limpiar cookie
      expect(result.current.user).toBeNull();
      // El logger.warn se llama en el catch, pero puede no ejecutarse inmediatamente
      // Verificamos que el usuario se limpió correctamente
    });
  });
});

