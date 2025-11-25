/**
 * Tests para RegisterPage
 *
 * AI_DECISION: Tests para página de registro de usuarios
 * Justificación: Validar formulario de registro y validaciones
 * Impacto: Prevenir errores en creación de cuentas
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import RegisterPage from './page';

// Mock dependencies
vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    register: vi.fn(),
  })),
}));

vi.mock('@/lib/api', () => ({
  getManagers: vi.fn(),
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('RegisterPage', () => {
  const mockRegister = vi.fn();
  const mockGetManagers = vi.fn();
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    const { useAuth } = require('../auth/AuthContext');
    useAuth.mockReturnValue({
      register: mockRegister,
    });

    const { getManagers } = require('@/lib/api');
    getManagers.mockImplementation(mockGetManagers);

    const { useRouter } = require('next/navigation');
    useRouter.mockReturnValue({
      push: mockPush,
    });
  });

  it('debería renderizar formulario de registro', () => {
    render(<RegisterPage />);

    expect(screen.getByText(/CACTUS CRM/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre de usuario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();
  });

  it('debería validar campos requeridos', async () => {
    render(<RegisterPage />);

    const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/El email es requerido/i)).toBeInTheDocument();
    });
  });

  it('debería validar formato de contraseña', async () => {
    render(<RegisterPage />);

    const emailInput = screen.getByLabelText(/Email/i);
    const fullNameInput = screen.getByLabelText(/Nombre completo/i);
    const passwordInput = screen.getByLabelText(/Contraseña/i);
    const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(fullNameInput, { target: { value: 'Test User' } });
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/al menos 6 caracteres/i)).toBeInTheDocument();
    });
  });

  it('debería validar formato de username', async () => {
    render(<RegisterPage />);

    const usernameInput = screen.getByLabelText(/Nombre de usuario/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const fullNameInput = screen.getByLabelText(/Nombre completo/i);
    const passwordInput = screen.getByLabelText(/Contraseña/i);
    const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i });

    fireEvent.change(usernameInput, { target: { value: 'ab' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(fullNameInput, { target: { value: 'Test User' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/no es válido/i)).toBeInTheDocument();
    });
  });

  it('debería requerir manager cuando rol es advisor', async () => {
    mockGetManagers.mockResolvedValue({
      success: true,
      data: [{ id: 'manager-1', email: 'manager@example.com', fullName: 'Manager 1' }],
    });

    render(<RegisterPage />);

    await waitFor(() => {
      const roleSelect = screen.getByLabelText(/Rol/i);
      fireEvent.change(roleSelect, { target: { value: 'advisor' } });
    });

    const emailInput = screen.getByLabelText(/Email/i);
    const fullNameInput = screen.getByLabelText(/Nombre completo/i);
    const passwordInput = screen.getByLabelText(/Contraseña/i);
    const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(fullNameInput, { target: { value: 'Test User' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Debe seleccionar un manager/i)).toBeInTheDocument();
    });
  });

  it('debería registrar usuario exitosamente', async () => {
    mockRegister.mockResolvedValue(undefined);

    render(<RegisterPage />);

    const emailInput = screen.getByLabelText(/Email/i);
    const fullNameInput = screen.getByLabelText(/Nombre completo/i);
    const passwordInput = screen.getByLabelText(/Contraseña/i);
    const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(fullNameInput, { target: { value: 'Test User' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'test@example.com',
        fullName: 'Test User',
        password: 'password123',
        role: 'advisor',
      });
    });
  });

  it('debería mostrar mensaje de éxito después de registro', async () => {
    mockRegister.mockResolvedValue(undefined);

    render(<RegisterPage />);

    const emailInput = screen.getByLabelText(/Email/i);
    const fullNameInput = screen.getByLabelText(/Nombre completo/i);
    const passwordInput = screen.getByLabelText(/Contraseña/i);
    const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(fullNameInput, { target: { value: 'Test User' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Registro exitoso/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar error cuando falla el registro', async () => {
    mockRegister.mockRejectedValue(new Error('Registration failed'));

    render(<RegisterPage />);

    const emailInput = screen.getByLabelText(/Email/i);
    const fullNameInput = screen.getByLabelText(/Nombre completo/i);
    const passwordInput = screen.getByLabelText(/Contraseña/i);
    const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(fullNameInput, { target: { value: 'Test User' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Registration failed/i)).toBeInTheDocument();
    });
  });

  it('debería cargar managers cuando rol es advisor', async () => {
    mockGetManagers.mockResolvedValue({
      success: true,
      data: [{ id: 'manager-1', email: 'manager@example.com', fullName: 'Manager 1' }],
    });

    render(<RegisterPage />);

    const roleSelect = screen.getByLabelText(/Rol/i);
    fireEvent.change(roleSelect, { target: { value: 'advisor' } });

    await waitFor(() => {
      expect(mockGetManagers).toHaveBeenCalled();
      expect(screen.getByText(/Manager asignado/i)).toBeInTheDocument();
    });
  });
});
