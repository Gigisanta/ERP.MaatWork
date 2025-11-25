/**
 * Tests para MetricsSection component
 * 
 * AI_DECISION: Tests unitarios para sección de métricas
 * Justificación: Validación crítica de visualización de métricas y gráficos
 * Impacto: Prevenir errores en dashboard de métricas
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MetricsSection } from './MetricsSection';
import type { MonthlyMetrics, MonthlyGoal } from '@/types/metrics';

// Mock dependencies
vi.mock('./Charts/GoalsComparisonChart', () => ({
  GoalsComparisonChart: ({ currentMonth, goals }: any) => (
    <div data-testid="goals-chart">
      Goals Chart - Prospects: {currentMonth.newProspects}, Goal: {goals?.newProspectsGoal ?? 0}
    </div>
  )
}));

vi.mock('./Charts/BusinessLineChart', () => ({
  BusinessLineChart: ({ businessLineClosures }: any) => (
    <div data-testid="business-line-chart">
      Business Line Chart - Inversiones: {businessLineClosures.inversiones}
    </div>
  )
}));

vi.mock('./Charts/TransitionTimesChart', () => ({
  TransitionTimesChart: ({ transitionTimes }: any) => (
    <div data-testid="transition-times-chart">
      Transition Times Chart - Prospecto to First: {transitionTimes.prospectoToFirstMeeting ?? 0}
    </div>
  )
}));

vi.mock('./MetricCard', () => ({
  MetricCard: ({ title, actual, goal }: any) => (
    <div data-testid={`metric-card-${title}`}>
      {title}: {actual} / {goal}
    </div>
  )
}));

vi.mock('@cactus/ui', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  Spinner: ({ size }: any) => <div data-testid="spinner">Loading...</div>,
  Alert: ({ children, variant }: any) => (
    <div role="alert" data-alert-variant={variant}>{children}</div>
  ),
  Text: ({ children, color }: any) => <span>{children}</span>,
  Stack: ({ children, direction, gap, align, justify, className }: any) => (
    <div className={className}>{children}</div>
  ),
  Select: ({ items, value, onValueChange }: any) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {items.map((item: any) => (
        <option key={item.value} value={item.value}>{item.label}</option>
      ))}
    </select>
  ),
  Grid: ({ children, cols, gap }: any) => <div>{children}</div>,
  GridItem: ({ children }: any) => <div>{children}</div>
}));

describe('MetricsSection', () => {
  const mockMetricsData: MonthlyMetrics = {
    newProspects: 10,
    firstMeetings: 8,
    secondMeetings: 5,
    newClients: 3,
    businessLineClosures: {
      inversiones: 2,
      zurich: 1,
      patrimonial: 0
    },
    transitionTimes: {
      prospectoToFirstMeeting: 5,
      firstToSecondMeeting: 7,
      secondMeetingToClient: 10
    }
  };

  const mockGoalsData: MonthlyGoal = {
    newProspectsGoal: 15,
    firstMeetingsGoal: 12,
    secondMeetingsGoal: 8,
    newClientsGoal: 5
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería mostrar loading cuando está cargando', () => {
    render(<MetricsSection metricsData={null} goalsData={null} loading={true} error={null} />);

    expect(screen.getByTestId('spinner')).toBeInTheDocument();
    expect(screen.getByText('Cargando métricas...')).toBeInTheDocument();
  });

  it('debería mostrar error cuando hay error', () => {
    render(
      <MetricsSection
        metricsData={null}
        goalsData={null}
        loading={false}
        error="Failed to load metrics"
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('data-alert-variant', 'error');
    expect(alert).toHaveTextContent('Error al cargar métricas: Failed to load metrics');
  });

  it('debería retornar null cuando no hay datos', () => {
    const { container } = render(
      <MetricsSection metricsData={null} goalsData={null} loading={false} error={null} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('debería mostrar gráfico de objetivos por defecto', () => {
    render(
      <MetricsSection
        metricsData={mockMetricsData}
        goalsData={mockGoalsData}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByTestId('goals-chart')).toBeInTheDocument();
  });

  it('debería cambiar gráfico cuando se selecciona otro', async () => {
    const user = userEvent.setup();
    render(
      <MetricsSection
        metricsData={mockMetricsData}
        goalsData={mockGoalsData}
        loading={false}
        error={null}
      />
    );

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'businessLines');

    expect(screen.getByTestId('business-line-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('goals-chart')).not.toBeInTheDocument();
  });

  it('debería mostrar todos los MetricCards', () => {
    render(
      <MetricsSection
        metricsData={mockMetricsData}
        goalsData={mockGoalsData}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByTestId('metric-card-Nuevos Contactos')).toBeInTheDocument();
    expect(screen.getByTestId('metric-card-Primeras Reuniones')).toBeInTheDocument();
    expect(screen.getByTestId('metric-card-Segundas Reuniones')).toBeInTheDocument();
    expect(screen.getByTestId('metric-card-Nuevos Clientes')).toBeInTheDocument();
  });

  it('debería usar valores por defecto cuando goalsData es null', () => {
    render(
      <MetricsSection
        metricsData={mockMetricsData}
        goalsData={null}
        loading={false}
        error={null}
      />
    );

    const nuevosContactosCard = screen.getByTestId('metric-card-Nuevos Contactos');
    expect(nuevosContactosCard).toHaveTextContent('Nuevos Contactos: 10 / 0');
  });
});

