/**
 * Tests para PortfolioComparator component
 * 
 * AI_DECISION: Tests unitarios para comparador de carteras
 * Justificación: Validación crítica de lógica de comparación y selección
 * Impacto: Prevenir errores en análisis comparativo
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PortfolioComparator from './PortfolioComparator';
import { usePortfolioComparison } from '../../lib/api-hooks';

// Mock dependencies
vi.mock('../../lib/api-hooks', () => ({
  usePortfolioComparison: vi.fn()
}));

vi.mock('./PerformanceChart', () => ({
  __esModule: true,
  default: ({ portfolioIds, benchmarkIds }: any) => (
    <div data-testid="performance-chart">
      Portfolios: {portfolioIds.join(',')}, Benchmarks: {benchmarkIds.join(',')}
    </div>
  )
}));

vi.mock('@cactus/ui', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
  Text: ({ children, size, weight, color, className }: any) => (
    <span className={className}>{children}</span>
  ),
  Stack: ({ children, direction, gap, align }: any) => <div>{children}</div>,
  Grid: ({ children, cols, gap }: any) => <div>{children}</div>,
  Badge: ({ children, variant }: any) => <span data-badge-variant={variant}>{children}</span>,
  Spinner: ({ size }: any) => <div data-testid="spinner">Loading...</div>,
  DataTable: ({ data, columns, keyField }: any) => (
    <table>
      <thead>
        <tr>
          {columns.map((col: any) => (
            <th key={col.key}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row: any) => (
          <tr key={row[keyField]}>
            {columns.map((col: any) => (
              <td key={col.key}>{col.render(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}));

describe('PortfolioComparator', () => {
  const mockPortfolios = [
    { id: '1', name: 'Portfolio 1', type: 'portfolio' as const, riskLevel: 'moderate' },
    { id: '2', name: 'Portfolio 2', type: 'portfolio' as const, riskLevel: 'aggressive' }
  ];

  const mockBenchmarks = [
    { id: 'b1', name: 'Benchmark 1', type: 'benchmark' as const },
    { id: 'b2', name: 'Benchmark 2', type: 'benchmark' as const }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (usePortfolioComparison as ReturnType<typeof vi.fn>).mockReturnValue({
      comparisonData: null,
      isLoading: false
    });
  });

  it('debería mostrar portfolios y benchmarks', () => {
    render(
      <PortfolioComparator portfolios={mockPortfolios} benchmarks={mockBenchmarks} />
    );

    expect(screen.getByText('Portfolio 1')).toBeInTheDocument();
    expect(screen.getByText('Portfolio 2')).toBeInTheDocument();
    expect(screen.getByText('Benchmark 1')).toBeInTheDocument();
    expect(screen.getByText('Benchmark 2')).toBeInTheDocument();
  });

  it('debería mostrar mensaje cuando no hay portfolios', () => {
    render(<PortfolioComparator portfolios={[]} benchmarks={mockBenchmarks} />);

    expect(screen.getByText('No tienes carteras creadas')).toBeInTheDocument();
  });

  it('debería mostrar mensaje cuando no hay benchmarks', () => {
    render(<PortfolioComparator portfolios={mockPortfolios} benchmarks={[]} />);

    expect(screen.getByText('No hay benchmarks disponibles')).toBeInTheDocument();
  });

  it('debería agregar portfolio a comparación', async () => {
    const user = userEvent.setup();
    const onAddToComparison = vi.fn();

    render(
      <PortfolioComparator
        portfolios={mockPortfolios}
        benchmarks={mockBenchmarks}
        onAddToComparison={onAddToComparison}
      />
    );

    const addButtons = screen.getAllByRole('button');
    const portfolioAddButton = addButtons.find(btn => 
      btn.textContent === '+' && !btn.disabled
    );

    if (portfolioAddButton) {
      await user.click(portfolioAddButton);
      expect(onAddToComparison).toHaveBeenCalledWith('1', 'portfolio');
    }
  });

  it('debería mostrar datos de comparación cuando están disponibles', () => {
    (usePortfolioComparison as ReturnType<typeof vi.fn>).mockReturnValue({
      comparisonData: {
        results: [
          {
            id: '1',
            name: 'Portfolio 1',
            type: 'portfolio',
            metrics: {
              totalReturn: 0.15,
              volatility: 0.12,
              sharpeRatio: 1.25,
              maxDrawdown: -0.08
            },
            performance: []
          }
        ]
      },
      isLoading: false
    });

    render(
      <PortfolioComparator portfolios={mockPortfolios} benchmarks={mockBenchmarks} />
    );

    expect(screen.getByText('Métricas Comparativas')).toBeInTheDocument();
  });

  it('debería mostrar loading cuando está cargando', () => {
    (usePortfolioComparison as ReturnType<typeof vi.fn>).mockReturnValue({
      comparisonData: null,
      isLoading: true
    });

    render(
      <PortfolioComparator portfolios={mockPortfolios} benchmarks={mockBenchmarks} />
    );

    expect(screen.getByTestId('spinner')).toBeInTheDocument();
    expect(screen.getByText('Calculando métricas comparativas...')).toBeInTheDocument();
  });

  it('debería aplicar className personalizada', () => {
    const { container } = render(
      <PortfolioComparator
        portfolios={mockPortfolios}
        benchmarks={mockBenchmarks}
        className="custom-class"
      />
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-class');
  });
});

