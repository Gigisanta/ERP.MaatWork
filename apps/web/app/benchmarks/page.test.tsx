/**
 * Tests para BenchmarksPage
 * 
 * AI_DECISION: Tests para página de gestión de benchmarks
 * Justificación: Validar acceso restringido y renderizado de benchmarks
 * Impacto: Prevenir acceso no autorizado y errores en visualización
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import BenchmarksPage from './page';

// Mock dependencies
vi.mock('../auth/useRequireAuth', () => ({
  useRequireAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com', role: 'admin' },
    loading: false,
  })),
}));

vi.mock('@/lib/api', () => ({
  getBenchmarks: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('BenchmarksPage', () => {
  const mockGetBenchmarks = vi.fn();
  const mockUseRequireAuth = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    const { useRequireAuth } = require('../auth/useRequireAuth');
    mockUseRequireAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com', role: 'admin' },
      loading: false,
    });
    useRequireAuth.mockImplementation(mockUseRequireAuth);

    const { getBenchmarks } = require('@/lib/api');
    getBenchmarks.mockImplementation(mockGetBenchmarks);
  });

  it('debería mostrar loading mientras carga auth', () => {
    mockUseRequireAuth.mockReturnValue({
      user: null,
      loading: true,
    });

    render(<BenchmarksPage />);
    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it('debería mostrar mensaje de acceso denegado para no-admin', () => {
    mockUseRequireAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com', role: 'advisor' },
      loading: false,
    });

    render(<BenchmarksPage />);
    expect(screen.getByText(/No tienes permisos/i)).toBeInTheDocument();
  });

  it('debería mostrar tabla de benchmarks para admin', async () => {
    mockGetBenchmarks.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'bench-1',
          code: 'MERVAL',
          name: 'Merval Index',
          description: 'Índice principal',
          type: 'individual',
          isSystem: true,
          componentCount: 10,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
    });

    render(<BenchmarksPage />);

    await waitFor(() => {
      expect(screen.getByText(/Benchmarks/i)).toBeInTheDocument();
      expect(screen.getByText(/MERVAL/i)).toBeInTheDocument();
      expect(screen.getByText(/Merval Index/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar mensaje cuando no hay benchmarks', async () => {
    mockGetBenchmarks.mockResolvedValue({
      success: true,
      data: [],
    });

    render(<BenchmarksPage />);

    await waitFor(() => {
      expect(screen.getByText(/No hay benchmarks configurados/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar error cuando falla la carga', async () => {
    mockGetBenchmarks.mockRejectedValue(new Error('Failed to fetch'));

    render(<BenchmarksPage />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar información de benchmarks del sistema', async () => {
    mockGetBenchmarks.mockResolvedValue({
      success: true,
      data: [],
    });

    render(<BenchmarksPage />);

    await waitFor(() => {
      expect(screen.getByText(/Benchmarks del Sistema/i)).toBeInTheDocument();
      expect(screen.getByText(/MERVAL/i)).toBeInTheDocument();
      expect(screen.getByText(/S&P 500/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar links de navegación', async () => {
    mockGetBenchmarks.mockResolvedValue({
      success: true,
      data: [],
    });

    render(<BenchmarksPage />);

    await waitFor(() => {
      expect(screen.getByText(/Volver al inicio/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar badges de tipo de benchmark', async () => {
    mockGetBenchmarks.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'bench-1',
          code: 'MERVAL',
          name: 'Merval',
          type: 'individual',
          isSystem: true,
          componentCount: 10,
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'bench-2',
          code: 'CUSTOM',
          name: 'Custom Benchmark',
          type: 'composite',
          isSystem: false,
          componentCount: 5,
          createdAt: '2024-01-02T00:00:00Z',
        },
      ],
    });

    render(<BenchmarksPage />);

    await waitFor(() => {
      expect(screen.getByText(/Sistema/i)).toBeInTheDocument();
      expect(screen.getByText(/Custom/i)).toBeInTheDocument();
    });
  });
});




