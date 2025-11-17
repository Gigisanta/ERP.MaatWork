/**
 * Tests para AdminUsersPage
 * 
 * AI_DECISION: Tests para página de administración de usuarios
 * Justificación: Validar gestión de usuarios, roles y estados
 * Impacto: Prevenir errores en administración crítica
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AdminUsersPage from './page';

// Mock dependencies
vi.mock('../../auth/useRequireAuth', () => ({
  useRequireAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'admin@example.com', role: 'admin' },
    loading: false,
  })),
}));

vi.mock('@/lib/api', () => ({
  getUsers: vi.fn(),
  updateUserRole: vi.fn(),
  updateUserStatus: vi.fn(),
  deleteUser: vi.fn(),
  approveUser: vi.fn(),
  rejectUser: vi.fn(),
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

vi.mock('../../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('AdminUsersPage', () => {
  const mockGetUsers = vi.fn();
  const mockUseRequireAuth = vi.fn();
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    const { useRequireAuth } = require('../../auth/useRequireAuth');
    mockUseRequireAuth.mockReturnValue({
      user: { id: 'user-1', email: 'admin@example.com', role: 'admin' },
      loading: false,
    });
    useRequireAuth.mockImplementation(mockUseRequireAuth);

    const { getUsers } = require('@/lib/api');
    getUsers.mockImplementation(mockGetUsers);

    const { useRouter } = require('next/navigation');
    useRouter.mockReturnValue({
      push: mockPush,
    });
  });

  it('debería mostrar loading mientras carga auth', () => {
    mockUseRequireAuth.mockReturnValue({
      user: null,
      loading: true,
    });

    render(<AdminUsersPage />);
    
    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it('debería redirigir si usuario no es admin', () => {
    mockUseRequireAuth.mockReturnValue({
      user: { id: 'user-1', role: 'advisor' },
      loading: false,
    });

    render(<AdminUsersPage />);
    
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('debería mostrar tabla de usuarios para admin', async () => {
    mockGetUsers.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'user-1',
          email: 'user1@example.com',
          fullName: 'User 1',
          role: 'advisor',
          isActive: true,
        },
      ],
    });

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText(/Administración de Usuarios/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar error cuando falla la carga', async () => {
    mockGetUsers.mockRejectedValue(new Error('Failed to fetch'));

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar botón para crear usuario', async () => {
    mockGetUsers.mockResolvedValue({
      success: true,
      data: [],
    });

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText(/Crear Usuario/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar contador de usuarios', async () => {
    mockGetUsers.mockResolvedValue({
      success: true,
      data: [
        { id: 'user-1', email: 'user1@example.com', fullName: 'User 1', role: 'advisor', isActive: true },
        { id: 'user-2', email: 'user2@example.com', fullName: 'User 2', role: 'manager', isActive: true },
      ],
    });

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText(/Usuarios \(2\)/i)).toBeInTheDocument();
    });
  });
});




