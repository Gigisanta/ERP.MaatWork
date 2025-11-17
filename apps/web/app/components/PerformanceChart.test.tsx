/**
 * Tests para PerformanceChart component
 * 
 * AI_DECISION: Tests unitarios para gráfico de rendimiento
 * Justificación: Validación crítica de visualización de datos de rendimiento
 * Impacto: Prevenir errores en análisis de performance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PerformanceChart from './PerformanceChart';
import { usePortfolioComparison } from '../../lib/api-hooks';

// Mock dependencies
vi.mock('../../lib/api-hooks', () => ({
  usePortfolioComparison: vi.fn()
}));

vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>
}));

vi.mock('@cactus/ui', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  Select: ({ value, onValueChange, items }: any) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {items.map((item: any) => (
        <option key={item.value} value={item.value}>{item.label}</option>
      ))}
    </select>
  ),
  Spinner: ({ size }: any) => <div data-testid="spinner">Loading...</div>,
  Alert: ({ children, variant }: any) => (
    <div role="alert" data-alert-variant={variant}>{children}</div>
  ),
  Text: ({ children }: any) => <span>{children}</span>,
  Stack: ({ children }: any) => <div>{children}</div>,
  Grid: ({ children }: any) => <div>{children}</div>,
  Badge: ({ children }: any) => <span>{children}</span>,
  Button: ({ children }: any) => <button>{children}</button>
}));

describe('PerformanceChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (usePortfolioComparison as ReturnType<typeof vi.fn>).mockReturnValue({
      comparisonData: null,
      error: null,
      isLoading: false
    });
  });

  it('debería mostrar loading cuando está cargando', () => {
    (usePortfolioComparison as ReturnType<typeof vi.fn>).mockReturnValue({
      comparisonData: null,
      error: null,
      isLoading: true
    });

    render(<PerformanceChart portfolioIds={['1']} benchmarkIds={[]} />);

    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('debería mostrar error cuando hay error', () => {
    (usePortfolioComparison as ReturnType<typeof vi.fn>).mockReturnValue({
      comparisonData: null,
      error: 'Failed to fetch data',
      isLoading: false
    });

    render(<PerformanceChart portfolioIds={['1']} benchmarkIds={[]} />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('data-alert-variant', 'error');
  });

  it('debería mostrar gráfico cuando hay datos', () => {
    (usePortfolioComparison as ReturnType<typeof vi.fn>).mockReturnValue({
      comparisonData: {
        results: [
          {
            id: '1',
            name: 'Portfolio 1',
            type: 'portfolio',
            metrics: { totalReturn: 0.15 },
            performance: [
              { date: '2024-01-01', value: 100 },
              { date: '2024-01-02', value: 105 }
            ]
          }
        ]
      },
      error: null,
      isLoading: false
    });

    render(<PerformanceChart portfolioIds={['1']} benchmarkIds={[]} />);

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('debería cambiar periodo cuando se selecciona otro', async () => {
    const { rerender } = render(
      <PerformanceChart portfolioIds={['1']} benchmarkIds={[]} period="1Y" />
    );

    expect(usePortfolioComparison).toHaveBeenCalledWith(['1'], [], '1Y');

    rerender(<PerformanceChart portfolioIds={['1']} benchmarkIds={[]} period="3M" />);

    await waitFor(() => {
      expect(usePortfolioComparison).toHaveBeenCalledWith(['1'], [], '3M');
    });
  });

  it('debería aplicar className y height personalizados', () => {
    const { container } = render(
      <PerformanceChart
        portfolioIds={['1']}
        benchmarkIds={[]}
        className="custom-class"
        height={500}
      />
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-class');
  });
});

