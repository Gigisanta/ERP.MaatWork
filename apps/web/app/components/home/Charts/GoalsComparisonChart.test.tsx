/**
 * Tests para GoalsComparisonChart component
 *
 * AI_DECISION: Tests unitarios para gráfico de comparación de objetivos
 * Justificación: Validación crítica de visualización de objetivos vs actuales
 * Impacto: Prevenir errores en análisis de cumplimiento de objetivos
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { GoalsComparisonChart } from './GoalsComparisonChart';
import type { MonthlyMetrics, MonthlyGoal } from '@/types/metrics';

// Mock dependencies
vi.mock('recharts', () => ({
  BarChart: ({ children, data }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Bar: ({ children }: any) => <div>{children}</div>,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}));

describe('GoalsComparisonChart', () => {
  const mockCurrentMonth: MonthlyMetrics = {
    newProspects: 10,
    firstMeetings: 8,
    secondMeetings: 5,
    newClients: 3,
    businessLineClosures: {
      inversiones: 2,
      zurich: 1,
      patrimonial: 0,
    },
    transitionTimes: {
      prospectoToFirstMeeting: 5,
      firstToSecondMeeting: 7,
      secondMeetingToClient: 10,
    },
  };

  const mockGoals: MonthlyGoal = {
    newProspectsGoal: 15,
    firstMeetingsGoal: 12,
    secondMeetingsGoal: 8,
    newClientsGoal: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar gráfico con datos y objetivos', () => {
    const { container } = render(
      <GoalsComparisonChart currentMonth={mockCurrentMonth} goals={mockGoals} />
    );

    const chart = container.querySelector('[data-testid="bar-chart"]');
    expect(chart).toBeInTheDocument();

    const chartData = JSON.parse(chart?.getAttribute('data-chart-data') || '[]');
    expect(chartData).toHaveLength(4);
    expect(chartData[0]).toMatchObject({
      name: 'Nuevos Contactos',
      actual: 10,
      goal: 15,
    });
  });

  it('debería usar valores por defecto cuando goals es null', () => {
    const { container } = render(
      <GoalsComparisonChart currentMonth={mockCurrentMonth} goals={null} />
    );

    const chart = container.querySelector('[data-testid="bar-chart"]');
    const chartData = JSON.parse(chart?.getAttribute('data-chart-data') || '[]');

    expect(chartData[0].goal).toBe(0);
    expect(chartData[1].goal).toBe(0);
    expect(chartData[2].goal).toBe(0);
    expect(chartData[3].goal).toBe(0);
  });

  it('debería incluir todas las métricas', () => {
    const { container } = render(
      <GoalsComparisonChart currentMonth={mockCurrentMonth} goals={mockGoals} />
    );

    const chart = container.querySelector('[data-testid="bar-chart"]');
    const chartData = JSON.parse(chart?.getAttribute('data-chart-data') || '[]');

    const metricNames = chartData.map((item: any) => item.name);
    expect(metricNames).toContain('Nuevos Contactos');
    expect(metricNames).toContain('Primeras Reuniones');
    expect(metricNames).toContain('Segundas Reuniones');
    expect(metricNames).toContain('Nuevos Clientes');
  });
});
