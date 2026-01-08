/**
 * Tests para AutomationsPage
 *
 * AI_DECISION: Tests para página de automatizaciones
 * Justificación: Validar renderizado y apertura de N8N
 * Impacto: Prevenir errores en acceso a automatizaciones
 */
import { useRequireAuth } from '../auth/useRequireAuth';
import { usePageTitle } from '../components/PageTitleContext';

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AutomationsPage from './page';

// Mock dependencies
vi.mock('../auth/useRequireAuth', () => ({
  useRequireAuth: vi.fn(() => ({
    loading: false,
  })),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    mutateUser: vi.fn(),
  })),
}));

vi.mock('@/lib/hooks/useToast', () => ({
  useToast: vi.fn(() => ({
    showToast: vi.fn(),
  })),
}));

vi.mock('../components/PageTitleContext', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
  config: {
    // n8nUrl removed
  },
}));

vi.mock('./components/EmailAutomationCard', () => ({
  default: () => <div>EmailAutomationCard Component</div>,
}));

describe('AutomationsPage', () => {
  const mockUseRequireAuth = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseRequireAuth.mockReturnValue({
      loading: false,
    });
    useRequireAuth.mockImplementation(mockUseRequireAuth);
  });

  it('debería renderizar página de automatizaciones', () => {
    render(<AutomationsPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /^Automatizaciones$/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText(/EmailAutomationCard Component/i)).toHaveLength(2);
  });

  it('debería mostrar loading mientras carga auth', () => {
    mockUseRequireAuth.mockReturnValue({
      loading: true,
    });

    render(<AutomationsPage />);

    expect(screen.getByText(/Verificando autenticación/i)).toBeInTheDocument();
  });

  it('debería llamar usePageTitle con título correcto', () => {
    render(<AutomationsPage />);

    expect(usePageTitle).toHaveBeenCalledWith('Automatizaciones');
  });

  it('debería mostrar sección de automatizaciones base', () => {
    render(<AutomationsPage />);

    expect(screen.getByText(/Emails Automáticos/i)).toBeInTheDocument();
  });
});
