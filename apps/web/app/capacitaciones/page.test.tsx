/**
 * Tests para CapacitacionesPage
 * 
 * AI_DECISION: Tests para página de capacitaciones
 * Justificación: Validar renderizado y loading states
 * Impacto: Prevenir errores en visualización de capacitaciones
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CapacitacionesPage from './page';

// Mock dependencies
vi.mock('../auth/useRequireAuth', () => ({
  useRequireAuth: vi.fn(() => ({
    loading: false,
  })),
}));

vi.mock('../components/PageTitleContext', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('./CapacitacionesList', () => ({
  default: () => <div>CapacitacionesList Component</div>,
}));

describe('CapacitacionesPage', () => {
  const mockUseRequireAuth = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    const { useRequireAuth } = require('../auth/useRequireAuth');
    mockUseRequireAuth.mockReturnValue({
      loading: false,
    });
    useRequireAuth.mockImplementation(mockUseRequireAuth);
  });

  it('debería renderizar página de capacitaciones', () => {
    render(<CapacitacionesPage />);
    
    expect(screen.getByText(/CapacitacionesList Component/i)).toBeInTheDocument();
  });

  it('debería mostrar loading mientras carga auth', () => {
    mockUseRequireAuth.mockReturnValue({
      loading: true,
    });

    render(<CapacitacionesPage />);
    
    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it('debería llamar usePageTitle con título correcto', () => {
    const { usePageTitle } = require('../components/PageTitleContext');
    
    render(<CapacitacionesPage />);
    
    expect(usePageTitle).toHaveBeenCalledWith('Capacitaciones');
  });
});




