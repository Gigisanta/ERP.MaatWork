/**
 * Tests para AdminUsersPage
 *
 * AI_DECISION: Tests para página de administración de usuarios
 * Justificación: Validar gestión de usuarios, roles y estados
 * Impacto: Prevenir errores en administración crítica
 */
import { useRequireAuth } from '@/auth/useRequireAuth';
import { useRouter } from 'next/navigation';
import { AuthProvider } from '../../auth/AuthContext';
import { useUsers } from '@/lib/api-hooks';


import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AdminUsersPage from './page';

// Mock dependencies
vi.mock('../../auth/useRequireAuth', () => ({
  useRequireAuth: vi.fn(),
}));

vi.mock('@/lib/api-hooks', () => ({
  useUsers: vi.fn(),
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
  useRouter: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('../../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    updateUser: vi.fn(),
    logRequest: vi.fn(),
    logResponse: vi.fn(),
    logNetworkError: vi.fn(),
  },
}));

describe('AdminUsersPage', () => {
  const mockUseUsers = vi.fn();
  const mockUseRequireAuth = vi.fn();
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseRequireAuth.mockReturnValue({
      user: { id: 'user-1', email: 'admin@example.com', role: 'admin' },
      loading: false,
    });
    vi.mocked(useRequireAuth).mockImplementation(mockUseRequireAuth);

    vi.mocked(useUsers).mockImplementation(mockUseUsers);
    mockUseUsers.mockReturnValue({
      users: [],
      pagination: { totalPages: 1 },
      total: 0,
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as unknown as ReturnType<typeof useRouter>);
  });

  const renderWithAuth = (ui: React.ReactElement, user = { id: 'user-1', role: 'admin', email: 'admin@example.com' }) => {
    return render(
      <AuthProvider initialUser={user as unknown as import('../../auth/AuthContext').AuthUser}>
        {ui}
      </AuthProvider>
    );
  };

  it('debería mostrar loading mientras carga auth', () => {
    mockUseRequireAuth.mockReturnValue({
      user: null,
      loading: true,
    });

    renderWithAuth(<AdminUsersPage />);

    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it('debería redirigir si usuario no es admin', () => {
    const regularUser = { id: 'user-1', role: 'advisor', email: 'user@example.com' };
    mockUseRequireAuth.mockReturnValue({
      user: regularUser,
      loading: false,
    });

    renderWithAuth(<AdminUsersPage />, regularUser);

    expect(mockPush).toHaveBeenCalledWith('/home');
  });

  it('debería mostrar tabla de usuarios para admin', async () => {
    mockUseUsers.mockReturnValue({
      users: [
        {
          id: 'user-1',
          email: 'user1@example.com',
          fullName: 'User 1',
          role: 'advisor',
          isActive: true,
        },
      ],
      pagination: { totalPages: 1 },
      total: 1,
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    renderWithAuth(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Administración de Usuarios/i })).toBeInTheDocument();
    });
  });

  it('debería mostrar error cuando falla la carga', async () => {
    mockUseUsers.mockReturnValue({
      users: [],
      pagination: null,
      total: 0,
      isLoading: false,
      error: new Error('Failed to fetch'),
      mutate: vi.fn(),
    });

    renderWithAuth(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar botón para crear usuario', async () => {
    renderWithAuth(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Crear Usuario/i })).toBeInTheDocument();
    });
  });

  it('debería mostrar contador de usuarios', async () => {
    mockUseUsers.mockReturnValue({
      users: [
        {
          id: 'user-1',
          email: 'user1@example.com',
          fullName: 'User 1',
          role: 'advisor',
          isActive: true,
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          fullName: 'User 2',
          role: 'manager',
          isActive: true,
        },
      ],
      pagination: { totalPages: 1, total: 2 },
      total: 2,
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    renderWithAuth(<AdminUsersPage />);

    await waitFor(() => {
      // Usamos getAllByText si hay ambigüedad o somos más específicos
      const counters = screen.getAllByText(/Usuarios \(2\)/i);
      expect(counters.length).toBeGreaterThan(0);
    });
  });
});
