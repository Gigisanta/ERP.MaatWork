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

vi.mock('../components/PageTitleContext', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
  config: {
    n8nUrl: 'https://n8n.example.com',
  },
}));

vi.mock('./components/WelcomeEmailCard', () => ({
  default: () => <div>WelcomeEmailCard Component</div>,
}));

vi.mock('./components/SecondMeetingCard', () => ({
  default: () => <div>SecondMeetingCard Component</div>,
}));

describe('AutomationsPage', () => {
  const mockUseRequireAuth = vi.fn();
  const originalOpen = window.open;

  beforeEach(() => {
    vi.clearAllMocks();
    window.open = vi.fn();

        mockUseRequireAuth.mockReturnValue({
      loading: false,
    });
    useRequireAuth.mockImplementation(mockUseRequireAuth);
  });

  afterEach(() => {
    window.open = originalOpen;
  });

  it('debería renderizar página de automatizaciones', () => {
    render(<AutomationsPage />);

    expect(screen.getByRole('heading', { level: 1, name: /^Automatizaciones$/i })).toBeInTheDocument();
    expect(screen.getByText(/WelcomeEmailCard Component/i)).toBeInTheDocument();
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

  it('debería abrir N8N en nueva ventana al hacer click', () => {
    render(<AutomationsPage />);

    const n8nButton = screen.getByText(/N8N/i);
    n8nButton.click();

    expect(window.open).toHaveBeenCalledWith(
      'https://n8n.example.com',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('debería mostrar botón N8N', () => {
    render(<AutomationsPage />);

    expect(screen.getByText(/N8N/i)).toBeInTheDocument();
  });

  it('debería mostrar sección de automatizaciones base', () => {
    render(<AutomationsPage />);

    expect(screen.getByText(/Automatizaciones base/i)).toBeInTheDocument();
  });
});
