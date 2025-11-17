/**
 * Tests para AnalyticsPage
 * 
 * AI_DECISION: Tests para página de analytics dashboard
 * Justificación: Validar renderizado y manejo de datos según rol de usuario
 * Impacto: Prevenir errores en visualización de KPIs críticos
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AnalyticsPage from './page';

// Mock dependencies
vi.mock('../auth/useRequireAuth', () => ({
  useRequireAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com', role: 'advisor' },
    loading: false,
  })),
}));

vi.mock('../components/PageTitleContext', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  getDashboardKPIs: vi.fn(),
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/dynamic', () => ({
  default: vi.fn((loader) => {
    const Component = () => <div>Chart Component</div>;
    Component.displayName = 'DynamicComponent';
    return Component;
  }),
}));

describe('AnalyticsPage', () => {
  const mockGetDashboardKPIs = vi.fn();
  const mockUseRequireAuth = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    const { useRequireAuth } = require('../auth/useRequireAuth');
    mockUseRequireAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com', role: 'advisor' },
      loading: false,
    });
    useRequireAuth.mockImplementation(mockUseRequireAuth);

    const { getDashboardKPIs } = require('@/lib/api');
    getDashboardKPIs.mockImplementation(mockGetDashboardKPIs);
  });

  it('debería mostrar loading mientras carga auth', () => {
    mockUseRequireAuth.mockReturnValue({
      user: null,
      loading: true,
    });

    render(<AnalyticsPage />);
    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it('debería mostrar error cuando falla la carga de datos', async () => {
    mockGetDashboardKPIs.mockRejectedValue(new Error('Failed to fetch'));

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar KPIs para advisor', async () => {
    mockGetDashboardKPIs.mockResolvedValue({
      success: true,
      data: {
        role: 'advisor',
        kpis: {
          totalAUM: 1000000,
          clientsWithPortfolio: 25,
          deviationAlerts: 3,
        },
        aumTrend: [],
      },
    });

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/AUM Total Clientes/i)).toBeInTheDocument();
      expect(screen.getByText(/Clientes con Cartera/i)).toBeInTheDocument();
      expect(screen.getByText(/Alertas de Desvío/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar KPIs para manager', async () => {
    mockUseRequireAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com', role: 'manager' },
      loading: false,
    });

    mockGetDashboardKPIs.mockResolvedValue({
      success: true,
      data: {
        role: 'manager',
        kpis: {
          teamAUM: 5000000,
        },
        riskDistribution: [
          { riskLevel: 'low', count: 10 },
          { riskLevel: 'mid', count: 15 },
        ],
      },
    });

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/AUM Total Equipo/i)).toBeInTheDocument();
      expect(screen.getByText(/Distribución de Riesgo/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar KPIs para admin', async () => {
    mockUseRequireAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com', role: 'admin' },
      loading: false,
    });

    mockGetDashboardKPIs.mockResolvedValue({
      success: true,
      data: {
        role: 'admin',
        kpis: {
          globalAum: 10000000,
          activeTemplates: 50,
          clientsWithoutPortfolio: 5,
          instrumentsWithoutPrice: 2,
        },
      },
    });

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/AUM Global/i)).toBeInTheDocument();
      expect(screen.getByText(/Carteras Activas/i)).toBeInTheDocument();
      expect(screen.getByText(/Sin Cartera/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar gráfico de tendencia AUM para advisor', async () => {
    mockGetDashboardKPIs.mockResolvedValue({
      success: true,
      data: {
        role: 'advisor',
        kpis: {
          totalAUM: 1000000,
          clientsWithPortfolio: 25,
          deviationAlerts: 0,
        },
        aumTrend: [
          { date: '2024-01-01', value: 1000000 },
          { date: '2024-01-02', value: 1050000 },
        ],
      },
    });

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Tendencia AUM/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar top clientes para manager', async () => {
    mockUseRequireAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com', role: 'manager' },
      loading: false,
    });

    mockGetDashboardKPIs.mockResolvedValue({
      success: true,
      data: {
        role: 'manager',
        kpis: {
          teamAUM: 5000000,
        },
        topClients: [
          { contactId: '1', contactName: 'Cliente 1', aum: 1000000 },
          { contactId: '2', contactName: 'Cliente 2', aum: 500000 },
        ],
      },
    });

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Top 5 Clientes por AUM/i)).toBeInTheDocument();
      expect(screen.getByText(/Cliente 1/i)).toBeInTheDocument();
    });
  });

  it('debería manejar respuesta sin datos', async () => {
    mockGetDashboardKPIs.mockResolvedValue({
      success: false,
      data: null,
    });

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar links de navegación', async () => {
    mockGetDashboardKPIs.mockResolvedValue({
      success: true,
      data: {
        role: 'advisor',
        kpis: {
          totalAUM: 1000000,
          clientsWithPortfolio: 25,
          deviationAlerts: 0,
        },
        aumTrend: [],
      },
    });

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Volver al inicio/i)).toBeInTheDocument();
      expect(screen.getByText(/Performance & Riesgo/i)).toBeInTheDocument();
    });
  });
});




