/**
 * Tests para OHLCVChart component
 *
 * AI_DECISION: Tests unitarios para gráfico OHLCV
 * Justificación: Validación crítica de visualización de datos de precios
 * Impacto: Prevenir errores en visualización de gráficos financieros
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import OHLCVChart from './OHLCVChart';
import { getOHLCV } from '@/lib/api/bloomberg';

// Mock dependencies
vi.mock('@/lib/api/bloomberg', () => ({
  getOHLCV: vi.fn(),
}));

vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
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
  Text: ({ children, color }: any) => <span>{children}</span>,
  Stack: ({ children, direction, gap, align, justify }: any) => <div>{children}</div>,
}));

describe('OHLCVChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debería mostrar loading inicialmente', () => {
    (getOHLCV as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<OHLCVChart symbol="AAPL" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('debería mostrar datos cuando se cargan exitosamente', async () => {
    const mockData = [
      {
        date: '2024-01-01',
        open: 100,
        high: 105,
        low: 99,
        close: 103,
        volume: 1000000,
      },
      {
        date: '2024-01-02',
        open: 103,
        high: 107,
        low: 102,
        close: 106,
        volume: 1200000,
      },
    ];

    (getOHLCV as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: mockData,
    });

    render(<OHLCVChart symbol="AAPL" />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/AAPL - Price Chart/)).toBeInTheDocument();
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('debería mostrar error cuando falla la carga', async () => {
    (getOHLCV as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: 'Failed to fetch OHLCV data',
    });

    render(<OHLCVChart symbol="AAPL" />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('data-alert-variant', 'error');
    expect(alert).toHaveTextContent('Failed to fetch OHLCV data');
  });

  it('debería manejar errores de excepción', async () => {
    (getOHLCV as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    render(<OHLCVChart symbol="AAPL" />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Network error');
  });

  it('debería mostrar mensaje cuando no hay datos', async () => {
    (getOHLCV as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: [],
    });

    render(<OHLCVChart symbol="AAPL" />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/No data available for AAPL/)).toBeInTheDocument();
  });

  it('debería cambiar timeframe cuando se selecciona otro', async () => {
    const mockData = [
      {
        date: '2024-01-01',
        open: 100,
        high: 105,
        low: 99,
        close: 103,
        volume: 1000000,
      },
    ];

    (getOHLCV as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: mockData,
    });

    render(<OHLCVChart symbol="AAPL" />);

    await waitFor(() => {
      expect(getOHLCV).toHaveBeenCalled();
    });

    // Verificar que se llamó con timeframe por defecto (1m)
    expect(getOHLCV).toHaveBeenCalledWith('AAPL', '1d', expect.any(String), expect.any(String));
  });

  it('debería aplicar className y height personalizados', async () => {
    const mockData = [
      {
        date: '2024-01-01',
        open: 100,
        high: 105,
        low: 99,
        close: 103,
        volume: 1000000,
      },
    ];

    (getOHLCV as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: mockData,
    });

    const { container } = render(
      <OHLCVChart symbol="AAPL" className="custom-class" height={500} />
    );

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    const card = container.querySelector('[data-testid="card"]');
    expect(card).toHaveClass('custom-class');
  });
});
