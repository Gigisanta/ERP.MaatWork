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

import React from 'react';

// Mock dependencies
vi.mock('../../lib/api-hooks', () => ({
  usePortfolioComparison: vi.fn(),
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  BarChart3: () => <div data-testid="barchart-icon" />,
  TrendingUp: () => <div data-testid="trending-up" />,
  TrendingDown: () => <div data-testid="trending-down" />,
  Calendar: () => <div data-testid="calendar-icon" />,
}));

vi.mock('@maatwork/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Select: ({ value, onValueChange, items }: { value: string; onValueChange: (val: string) => void; items: Array<{ value: string; label: string }> }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  ),
  Spinner: ({ size }: { size?: string }) => <div data-testid="spinner">Loading...</div>,
  Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div role="alert" data-alert-variant={variant}>
      {children}
    </div>
  ),
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Stack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Grid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

describe('PerformanceChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (usePortfolioComparison as ReturnType<typeof vi.fn>).mockReturnValue({
      comparisonData: null,
      error: null,
      isLoading: false,
    });
  });

  it('debería mostrar loading cuando está cargando', () => {
    (usePortfolioComparison as ReturnType<typeof vi.fn>).mockReturnValue({
      comparisonData: null,
      error: null,
      isLoading: true,
    });

    render(<PerformanceChart portfolioIds={['1']} benchmarkIds={[]} />);

    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('debería mostrar error cuando hay error', () => {
    (usePortfolioComparison as ReturnType<typeof vi.fn>).mockReturnValue({
      comparisonData: null,
      error: new Error('Failed to fetch data'),
      isLoading: false,
    });

    render(<PerformanceChart portfolioIds={['1']} benchmarkIds={[]} />);

    expect(screen.getByText('Error al cargar datos')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
  });

  it('debería mostrar gráfico cuando hay datos', () => {
    (usePortfolioComparison as ReturnType<typeof vi.fn>).mockReturnValue({
      comparisonData: {
        results: [
          {
            id: '1',
            name: 'Portfolio 1',
            type: 'portfolio',
            metrics: { totalReturn: 15 },
            performance: [
              { date: '2024-01-01', value: 100 },
              { date: '2024-01-02', value: 105 },
            ],
          },
        ],
      },
      error: null,
      isLoading: false,
    });

    render(<PerformanceChart portfolioIds={['1']} benchmarkIds={[]} />);

    expect(screen.getAllByText('Portfolio 1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('+15.00%').length).toBeGreaterThanOrEqual(1);
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
