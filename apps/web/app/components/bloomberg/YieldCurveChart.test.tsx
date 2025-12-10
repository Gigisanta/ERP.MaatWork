/**
 * Tests para YieldCurveChart component
 *
 * AI_DECISION: Tests unitarios para gráfico de curva de rendimiento
 * Justificación: Validación crítica de visualización de curva de rendimiento
 * Impacto: Prevenir errores en análisis de tasas
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import YieldCurveChart from './YieldCurveChart';
import { getYieldCurve, getYieldSpreads } from '@/lib/api/bloomberg';

// Mock dependencies
vi.mock('@/lib/api/bloomberg', () => ({
  getYieldCurve: vi.fn(),
  getYieldSpreads: vi.fn(),
}));

vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  ReferenceLine: () => null,
}));

vi.mock('@cactus/ui', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  Select: ({ value, onValueChange, items }: any) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {items.map((item: any) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  ),
  Spinner: ({ size }: any) => <div data-testid="spinner">Loading...</div>,
  Alert: ({ children, variant }: any) => (
    <div role="alert" data-alert-variant={variant}>
      {children}
    </div>
  ),
  Text: ({ children, size, color, weight, style }: any) => <span style={style}>{children}</span>,
  Stack: ({ children, direction, gap, alignItems, justifyContent }: any) => <div>{children}</div>,
  Badge: ({ children, variant }: any) => <span data-badge-variant={variant}>{children}</span>,
}));

describe('YieldCurveChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debería mostrar loading inicialmente', () => {
    (getYieldCurve as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    (getYieldSpreads as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<YieldCurveChart />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('debería mostrar curva cuando se cargan exitosamente', async () => {
    const mockCurve = {
      date: '2024-01-01',
      yields: {
        '1m': { value: 0.5 },
        '3m': { value: 0.6 },
        '6m': { value: 0.7 },
        '1y': { value: 0.8 },
        '2y': { value: 1.0 },
        '5y': { value: 1.5 },
        '10y': { value: 2.0 },
        '30y': { value: 2.5 },
      },
    };

    const mockSpreads = {
      '2s10s': 1.0,
      '3m10y': 1.4,
    };

    (getYieldCurve as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: mockCurve,
    });
    (getYieldSpreads as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { spreads: mockSpreads },
    });

    render(<YieldCurveChart />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/US Treasury Yield Curve/)).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('debería mostrar badge "Inverted" cuando 2s10s es negativo', async () => {
    const mockCurve = {
      date: '2024-01-01',
      yields: {
        '2y': { value: 2.0 },
        '10y': { value: 1.5 },
      },
    };

    const mockSpreads = {
      '2s10s': -0.5,
      '3m10y': 0.9,
    };

    (getYieldCurve as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: mockCurve,
    });
    (getYieldSpreads as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { spreads: mockSpreads },
    });

    render(<YieldCurveChart />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    const invertedBadge = screen.getByText(/Inverted/);
    expect(invertedBadge).toBeInTheDocument();
    expect(invertedBadge.closest('[data-badge-variant]')).toHaveAttribute(
      'data-badge-variant',
      'error'
    );
  });

  it('debería mostrar error cuando falla la carga', async () => {
    (getYieldCurve as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: 'Failed to fetch yield curve',
    });
    (getYieldSpreads as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: 'Failed to fetch spreads',
    });

    render(<YieldCurveChart />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('data-alert-variant', 'error');
  });

  it('debería manejar errores de excepción', async () => {
    (getYieldCurve as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
    (getYieldSpreads as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    render(<YieldCurveChart />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Network error');
  });

  it('debería usar país por defecto US', async () => {
    const mockCurve = {
      date: '2024-01-01',
      yields: {
        '10y': { value: 2.0 },
      },
    };

    (getYieldCurve as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: mockCurve,
    });
    (getYieldSpreads as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { spreads: {} },
    });

    render(<YieldCurveChart />);

    await waitFor(() => {
      expect(getYieldCurve).toHaveBeenCalledWith('US', undefined);
    });
  });

  it('debería usar país personalizado', async () => {
    const mockCurve = {
      date: '2024-01-01',
      yields: {
        '10y': { value: 2.0 },
      },
    };

    (getYieldCurve as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: mockCurve,
    });
    (getYieldSpreads as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { spreads: {} },
    });

    render(<YieldCurveChart country="AR" />);

    await waitFor(() => {
      expect(getYieldCurve).toHaveBeenCalledWith('AR', undefined);
    });
  });

  it('debería aplicar className y height personalizados', async () => {
    const mockCurve = {
      date: '2024-01-01',
      yields: {
        '10y': { value: 2.0 },
      },
    };

    (getYieldCurve as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: mockCurve,
    });
    (getYieldSpreads as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { spreads: {} },
    });

    const { container } = render(<YieldCurveChart className="custom-class" height={500} />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    const card = container.querySelector('[data-testid="card"]');
    expect(card).toHaveClass('custom-class');
  });
});
