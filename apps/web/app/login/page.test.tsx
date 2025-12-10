/**
 * Tests para página de login
 *
 * AI_DECISION: Tests unitarios para página de login
 * Justificación: Validación crítica de autenticación y UX
 * Impacto: Prevenir errores en flujo de autenticación
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoginPage from './page';
import { useAuth } from '../auth/AuthContext';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockUseRouter = vi.mocked(useRouter);
const mockUseSearchParams = vi.mocked(useSearchParams);
const mockUseAuth = vi.mocked(useAuth);

describe('LoginPage', () => {
  const mockRouter = {
    replace: vi.fn(),
    push: vi.fn(),
  };

  const mockSearchParams = {
    get: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter as any);
    mockUseSearchParams.mockReturnValue(mockSearchParams as any);
    mockUseAuth.mockReturnValue({
      login: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn(),
      user: null,
      initialized: true,
      loading: false,
    } as any);
  });

  it('debería renderizar formulario de login', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/email|usuario|correo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña|password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ingresar|login|entrar/i })).toBeInTheDocument();
  });

  it('debería mostrar errores de validación cuando campos están vacíos', async () => {
    render(<LoginPage />);

    const submitButton = screen.getByRole('button', { name: /ingresar|login|entrar/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/completa todos los campos/i)).toBeInTheDocument();
    });
  });

  it('debería llamar login cuando se envía formulario válido', async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      logout: vi.fn(),
      user: null,
      initialized: true,
      loading: false,
    } as any);

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email|usuario|correo/i);
    const passwordInput = screen.getByLabelText(/contraseña|password/i);
    const submitButton = screen.getByRole('button', { name: /ingresar|login|entrar/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123', false);
    });
  });

  it('debería redirigir cuando login es exitoso', async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      logout: vi.fn(),
      user: null,
      initialized: true,
      loading: false,
    } as any);

    mockSearchParams.get.mockReturnValue(null);

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email|usuario|correo/i);
    const passwordInput = screen.getByLabelText(/contraseña|password/i);
    const submitButton = screen.getByRole('button', { name: /ingresar|login|entrar/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/');
    });
  });

  it('debería redirigir a URL de redirect cuando está presente', async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      logout: vi.fn(),
      user: null,
      initialized: true,
      loading: false,
    } as any);

    mockSearchParams.get.mockReturnValue('/contacts');

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email|usuario|correo/i);
    const passwordInput = screen.getByLabelText(/contraseña|password/i);
    const submitButton = screen.getByRole('button', { name: /ingresar|login|entrar/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/contacts');
    });
  });

  it('debería mostrar error cuando login falla', async () => {
    const mockLogin = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      logout: vi.fn(),
      user: null,
      initialized: true,
      loading: false,
    } as any);

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email|usuario|correo/i);
    const passwordInput = screen.getByLabelText(/contraseña|password/i);
    const submitButton = screen.getByRole('button', { name: /ingresar|login|entrar/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/error|invalid|credenciales/i)).toBeInTheDocument();
    });
  });

  it('debería redirigir automáticamente si usuario ya está autenticado', async () => {
    mockUseAuth.mockReturnValue({
      login: vi.fn(),
      logout: vi.fn(),
      user: { id: 'user-123', email: 'test@example.com' },
      initialized: true,
      loading: false,
    } as any);

    mockSearchParams.get.mockReturnValue(null);

    render(<LoginPage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/');
    });
  });

  it('debería manejar checkbox remember me', async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      logout: vi.fn(),
      user: null,
      initialized: true,
      loading: false,
    } as any);

    render(<LoginPage />);

    const rememberMeCheckbox = screen.getByLabelText(/recordar|remember/i);
    const emailInput = screen.getByLabelText(/email|usuario|correo/i);
    const passwordInput = screen.getByLabelText(/contraseña|password/i);
    const submitButton = screen.getByRole('button', { name: /ingresar|login|entrar/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(rememberMeCheckbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123', true);
    });
  });
});
