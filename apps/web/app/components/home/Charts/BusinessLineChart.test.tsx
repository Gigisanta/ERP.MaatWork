/**
 * Tests para BusinessLineChart component
 *
 * AI_DECISION: Tests unitarios para gráfico de líneas de negocio
 * Justificación: Validación crítica de visualización de datos por línea de negocio
 * Impacto: Prevenir errores en análisis de líneas de negocio
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BusinessLineChart } from './BusinessLineChart';
import type { MonthlyMetrics } from '@/types/metrics';

// Mock dependencies
vi.mock('recharts', () => ({
  BarChart: ({ children, data }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}));

describe('BusinessLineChart', () => {
  const mockBusinessLineClosures: MonthlyMetrics['businessLineClosures'] = {
    inversiones: 5,
    zurich: 3,
    patrimonial: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar gráfico con datos', () => {
    const { container } = render(
      <BusinessLineChart businessLineClosures={mockBusinessLineClosures} />
    );

    const chart = container.querySelector('[data-testid="bar-chart"]');
    expect(chart).toBeInTheDocument();

    const chartData = JSON.parse(chart?.getAttribute('data-chart-data') || '[]');
    expect(chartData).toHaveLength(3);
    expect(chartData[0]).toEqual({ name: 'Inversiones', value: 5 });
    expect(chartData[1]).toEqual({ name: 'Zurich', value: 3 });
    expect(chartData[2]).toEqual({ name: 'Patrimonial', value: 2 });
  });

  it('debería manejar valores cero', () => {
    const zeroData: MonthlyMetrics['businessLineClosures'] = {
      inversiones: 0,
      zurich: 0,
      patrimonial: 0,
    };

    const { container } = render(<BusinessLineChart businessLineClosures={zeroData} />);

    const chart = container.querySelector('[data-testid="bar-chart"]');
    expect(chart).toBeInTheDocument();
  });
});
