/**
 * Tests para AnalyticsClient
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AnalyticsClient from './AnalyticsClient';
import type { DashboardData } from '@/types';

// Mock dependencies
vi.mock('../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/dynamic', () => ({
  default: vi.fn(() => {
    const Component = () => <div>Chart Component</div>;
    Component.displayName = 'DynamicComponent';
    return Component;
  }),
}));

const mockDashboardData: DashboardData = {
  role: 'advisor',
  kpis: {
    totalAUM: 1000000,
    clientsWithPortfolio: 25,
    deviationAlerts: 3,
  },
  aumTrend: [
    { date: '2024-01-01', value: 1000000 },
    { date: '2024-01-02', value: 1050000 },
  ],
  riskDistribution: [],
  topClients: [],
};

describe('AnalyticsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería mostrar KPIs para advisor', async () => {
    render(<AnalyticsClient dashboardData={mockDashboardData} />);

    expect(screen.getByText(/AUM Total Clientes/i)).toBeInTheDocument();
    expect(screen.getByText(/Clientes con Cartera/i)).toBeInTheDocument();
    expect(screen.getByText(/Alertas de Desvío/i)).toBeInTheDocument();

    // Verificar valores (formateados)
    expect(screen.getByText(/1.000.000/)).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('debería mostrar KPIs para manager', async () => {
    const managerData: DashboardData = {
      ...mockDashboardData,
      role: 'manager',
      kpis: {
        teamAUM: 5000000,
      },
      riskDistribution: [
        { riskLevel: 'low', count: 10 },
        { riskLevel: 'mid', count: 15 },
      ],
      topClients: [{ contactId: '1', contactName: 'Cliente 1', aum: 1000000 }],
    };

    render(<AnalyticsClient dashboardData={managerData} />);

    expect(screen.getByText(/AUM Total Equipo/i)).toBeInTheDocument();
    expect(screen.getByText(/Distribución de Riesgo/i)).toBeInTheDocument();
    expect(screen.getByText(/Conservador/i)).toBeInTheDocument();
    expect(screen.getByText(/Balanceado/i)).toBeInTheDocument();

    expect(screen.getByText(/Top 5 Clientes por AUM/i)).toBeInTheDocument();
    expect(screen.getByText(/Cliente 1/i)).toBeInTheDocument();
  });

  it('debería mostrar KPIs para admin', async () => {
    const adminData: DashboardData = {
      ...mockDashboardData,
      role: 'admin',
      kpis: {
        globalAum: 10000000,
        activeTemplates: 50,
        clientsWithoutPortfolio: 5,
        instrumentsWithoutPrice: 2,
      },
    };

    render(<AnalyticsClient dashboardData={adminData} />);

    expect(screen.getByText(/AUM Global/i)).toBeInTheDocument();
    expect(screen.getByText(/Carteras Activas/i)).toBeInTheDocument();
    expect(screen.getByText(/Sin Cartera/i)).toBeInTheDocument();
    expect(screen.getByText(/Sin Precio Actualizado/i)).toBeInTheDocument();
  });

  it('debería mostrar gráfico de tendencia AUM si hay datos', async () => {
    render(<AnalyticsClient dashboardData={mockDashboardData} />);
    expect(screen.getByText(/Tendencia AUM/i)).toBeInTheDocument();
  });

  it('debería mostrar links de gestión para admin', async () => {
    const adminData: DashboardData = { ...mockDashboardData, role: 'admin' };
    render(<AnalyticsClient dashboardData={adminData} />);
    expect(screen.getByText(/Gestionar Benchmarks/i)).toBeInTheDocument();
  });
});
