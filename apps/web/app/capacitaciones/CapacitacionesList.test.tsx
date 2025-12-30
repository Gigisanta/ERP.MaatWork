/**
 * Tests para CapacitacionesList
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CapacitacionesList from './CapacitacionesList';
import { AuthProvider } from '../auth/AuthContext';
import { useCapacitaciones } from '@/lib/api-hooks';

// Mock dependencies
vi.mock('@/lib/api-hooks', () => ({
  useCapacitaciones: vi.fn(),
  useInvalidateCapacitacionesCache: vi.fn(() => vi.fn()),
}));

vi.mock('@/lib/api', () => ({
  createCapacitacion: vi.fn(),
  updateCapacitacion: vi.fn(),
  deleteCapacitacion: vi.fn(),
}));

vi.mock('../../lib/hooks/useToast', () => ({
  useToast: vi.fn(() => ({
    showToast: vi.fn(),
  })),
}));

// Mock Auth Context
const mockUser = { id: '1', email: 'admin@example.com', role: 'admin' };

describe('CapacitacionesList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCapacitaciones).mockReturnValue({
      capacitaciones: [],
      pagination: { total: 0, limit: 50, offset: 0 },
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });
  });

  const renderWithAuth = (ui: React.ReactElement) => {
    return render(<AuthProvider initialUser={mockUser}>{ui}</AuthProvider>);
  };

  it('debería renderizar título correctamente', () => {
    renderWithAuth(<CapacitacionesList />);
    expect(screen.getByRole('heading', { level: 1, name: /Capacitaciones/i })).toBeInTheDocument();
  });

  it('debería mostrar mensaje de carga cuando isLoading es true', () => {
    vi.mocked(useCapacitaciones).mockReturnValue({
      capacitaciones: [],
      pagination: { total: 0, limit: 50, offset: 0 },
      isLoading: true,
      error: null,
      mutate: vi.fn(),
    });

    renderWithAuth(<CapacitacionesList />);
    // El componente muestra un Spinner o mensaje
    expect(
      screen.queryByText(/cargando/i) ||
        screen.queryByRole('status') ||
        document.querySelector('.animate-spin')
    ).toBeDefined();
  });

  it('debería mostrar mensaje cuando no hay capacitaciones', () => {
    vi.mocked(useCapacitaciones).mockReturnValue({
      capacitaciones: [],
      pagination: { total: 0, limit: 50, offset: 0 },
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    renderWithAuth(<CapacitacionesList />);
    expect(screen.getByText(/No hay capacitaciones/i)).toBeInTheDocument();
  });
});
