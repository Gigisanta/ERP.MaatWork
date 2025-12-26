/**
 * Tests para portfolios page
 *
 * AI_DECISION: Tests unitarios básicos para portfolios page
 * Justificación: Validación de renderizado básico
 * Impacto: Prevenir errores críticos en página de portfolios
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PortfoliosPage from './page';

// Mock dependencies
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn().mockReturnValue({ value: 'fake-token' }),
  }),
}));

vi.mock('@/lib/api-server', () => ({
  getPortfolios: vi.fn().mockResolvedValue({
    success: true,
    data: [],
  }),
  getCurrentUser: vi.fn().mockResolvedValue({
    success: true,
    data: { id: 'user-123', email: 'test@example.com', role: 'admin' },
  }),
}));

vi.mock('../auth/useRequireAuth', () => ({
  useRequireAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com', role: 'admin' },
    loading: false,
  }),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com', role: 'admin' },
    isAuthenticated: true,
  }),
}));

vi.mock('./hooks/usePortfolios', () => ({
  usePortfolios: () => ({
    portfolios: [],
    isLoading: false,
    error: null,
    createPortfolio: vi.fn(),
    updatePortfolio: vi.fn(),
    deletePortfolio: vi.fn(),
  }),
}));

vi.mock('./hooks/useBenchmarks', () => ({
  useBenchmarks: () => ({
    benchmarks: [],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../components/PageTitleContext', () => ({
  usePageTitle: vi.fn(),
}));

import { usePageTitle } from '../components/PageTitleContext';

describe('PortfoliosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar correctamente', async () => {
    const Component = await PortfoliosPage();
    render(Component);

    // Verificar que la página se renderiza sin errores
    expect(document.body).toBeDefined();
  });

  it('debería mostrar título de página', async () => {
    const Component = await PortfoliosPage();
    render(Component);

    await waitFor(() => {
      expect(usePageTitle).toHaveBeenCalledWith('Carteras');
    });
  });
});
