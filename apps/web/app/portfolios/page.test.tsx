/**
 * Tests para portfolios page
 * 
 * AI_DECISION: Tests unitarios básicos para portfolios page
 * Justificación: Validación de renderizado básico
 * Impacto: Prevenir errores críticos en página de portfolios
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PortfoliosPage from './page';

// Mock dependencies
vi.mock('../auth/useRequireAuth', () => ({
  useRequireAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com', role: 'admin' },
    loading: false
  })
}));

vi.mock('./hooks/usePortfolios', () => ({
  usePortfolios: () => ({
    portfolios: [],
    isLoading: false,
    error: null,
    createPortfolio: vi.fn(),
    updatePortfolio: vi.fn(),
    deletePortfolio: vi.fn()
  })
}));

vi.mock('./hooks/useBenchmarks', () => ({
  useBenchmarks: () => ({
    benchmarks: [],
    isLoading: false,
    error: null
  })
}));

vi.mock('../components/PageTitleContext', () => ({
  usePageTitle: vi.fn()
}));

describe('PortfoliosPage', () => {
  it('debería renderizar correctamente', () => {
    render(<PortfoliosPage />);
    
    // Verificar que la página se renderiza sin errores
    expect(document.body).toBeDefined();
  });

  it('debería mostrar título de página', () => {
    const { usePageTitle } = require('../components/PageTitleContext');
    render(<PortfoliosPage />);
    
    expect(usePageTitle).toHaveBeenCalledWith('Carteras');
  });
});
