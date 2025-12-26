/**
 * Tests para TransitionTimesChart component
 *
 * AI_DECISION: Tests unitarios para gráfico de tiempos de transición
 * Justificación: Validación crítica de visualización de tiempos promedio
 * Impacto: Prevenir errores en análisis de eficiencia del pipeline
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { TransitionTimesChart } from './TransitionTimesChart';
import type { MonthlyMetrics } from '@/types/metrics';

import React from 'react';

// Mock dependencies
vi.mock('recharts', () => ({
  BarChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('TransitionTimesChart', () => {
  const mockTransitionTimes: MonthlyMetrics['transitionTimes'] = {
    prospectoToFirstMeeting: 5,
    firstToSecondMeeting: 7,
    secondMeetingToClient: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar gráfico con datos', () => {
    const { container } = render(<TransitionTimesChart transitionTimes={mockTransitionTimes} />);

    const chart = container.querySelector('[data-testid="bar-chart"]');
    expect(chart).toBeInTheDocument();

    const chartData = JSON.parse(chart?.getAttribute('data-chart-data') || '[]');
    expect(chartData).toHaveLength(3);
    expect(chartData[0]).toMatchObject({
      name: 'Prospecto → Primera Reunión',
      value: 5,
      hasValue: true,
    });
  });

  it('debería manejar valores null', () => {
    const nullData: MonthlyMetrics['transitionTimes'] = {
      prospectoToFirstMeeting: null,
      firstToSecondMeeting: null,
      secondMeetingToClient: null,
    };

    const { container } = render(<TransitionTimesChart transitionTimes={nullData} />);

    const chart = container.querySelector('[data-testid="bar-chart"]');
    const chartData = JSON.parse(chart?.getAttribute('data-chart-data') || '[]');

    expect(chartData[0].value).toBe(0);
    expect(chartData[0].hasValue).toBe(false);
  });

  it('debería incluir todas las transiciones', () => {
    const { container } = render(<TransitionTimesChart transitionTimes={mockTransitionTimes} />);

    const chart = container.querySelector('[data-testid="bar-chart"]');
    const chartData = JSON.parse(chart?.getAttribute('data-chart-data') || '[]');

    const transitionNames = chartData.map((item: { name: string }) => item.name);
    expect(transitionNames).toContain('Prospecto → Primera Reunión');
    expect(transitionNames).toContain('Primera → Segunda Reunión');
    expect(transitionNames).toContain('Segunda Reunión → Cliente');
  });
});
