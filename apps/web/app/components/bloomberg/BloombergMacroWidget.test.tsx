/**
 * Tests para BloombergMacroWidget component
 * 
 * AI_DECISION: Tests unitarios para widget macro Bloomberg
 * Justificación: Validación crítica de fetching y renderizado de spreads de tasas
 * Impacto: Prevenir errores en visualización de indicadores macro
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import BloombergMacroWidget from './BloombergMacroWidget';
import { getYieldSpreads } from '@/lib/api/bloomberg';

// Mock dependencies
vi.mock('@/lib/api/bloomberg', () => ({
  getYieldSpreads: vi.fn()
}));

vi.mock('@cactus/ui', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  Grid: ({ children, className }: any) => <div className={className}>{children}</div>,
  Text: ({ children, size, weight, color, className, style }: any) => (
    <span className={className} style={style}>{children}</span>
  ),
  Stack: ({ children, direction, gap, align, justify }: any) => (
    <div>{children}</div>
  ),
  Badge: ({ children, variant }: any) => <span data-badge-variant={variant}>{children}</span>,
  Spinner: ({ size }: any) => <div data-testid="spinner">Loading...</div>,
  Alert: ({ children, variant }: any) => (
    <div role="alert" data-alert-variant={variant}>{children}</div>
  )
}));

describe('BloombergMacroWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debería mostrar loading inicialmente', () => {
    (getYieldSpreads as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<BloombergMacroWidget />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('debería mostrar datos de spreads cuando se cargan exitosamente', async () => {
    const mockSpreads = {
      '2s10s': 0.5,
      '3m10y': 1.2
    };

    (getYieldSpreads as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { spreads: mockSpreads }
    });

    render(<BloombergMacroWidget />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('US Treasury Spreads')).toBeInTheDocument();
    expect(screen.getByText('0.50%')).toBeInTheDocument();
    expect(screen.getByText('1.20%')).toBeInTheDocument();
  });

  it('debería mostrar badge "Inverted" cuando 2s10s es negativo', async () => {
    const mockSpreads = {
      '2s10s': -0.3,
      '3m10y': 0.8
    };

    (getYieldSpreads as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { spreads: mockSpreads }
    });

    render(<BloombergMacroWidget />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    const invertedBadge = screen.getByText('Inverted');
    expect(invertedBadge).toBeInTheDocument();
    expect(invertedBadge.closest('[data-badge-variant]')).toHaveAttribute('data-badge-variant', 'error');
  });

  it('debería mostrar alerta de curva invertida cuando 2s10s es negativo', async () => {
    const mockSpreads = {
      '2s10s': -0.5,
      '3m10y': 0.5
    };

    (getYieldSpreads as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { spreads: mockSpreads }
    });

    render(<BloombergMacroWidget />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/La curva está invertida/)).toBeInTheDocument();
  });

  it('debería mostrar error cuando falla la carga', async () => {
    (getYieldSpreads as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: 'Failed to fetch spreads'
    });

    render(<BloombergMacroWidget />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('data-alert-variant', 'error');
    expect(alert).toHaveTextContent('Failed to fetch spreads');
  });

  it('debería manejar errores de excepción', async () => {
    (getYieldSpreads as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network error')
    );

    render(<BloombergMacroWidget />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Network error');
  });

  it('debería refrescar datos cada 5 minutos', async () => {
    const mockSpreads = {
      '2s10s': 0.5,
      '3m10y': 1.2
    };

    (getYieldSpreads as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { spreads: mockSpreads }
    });

    render(<BloombergMacroWidget />);

    await waitFor(() => {
      expect(getYieldSpreads).toHaveBeenCalledTimes(1);
    });

    // Avanzar 5 minutos
    vi.advanceTimersByTime(5 * 60 * 1000);

    await waitFor(() => {
      expect(getYieldSpreads).toHaveBeenCalledTimes(2);
    });
  });

  it('debería mostrar "No data available" cuando no hay spreads', async () => {
    (getYieldSpreads as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { spreads: null }
    });

    render(<BloombergMacroWidget />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('debería aplicar className personalizada', () => {
    (getYieldSpreads as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { spreads: { '2s10s': 0.5 } }
    });

    const { container } = render(<BloombergMacroWidget className="custom-class" />);
    const grid = container.querySelector('.lg\\:grid-cols-2.custom-class');
    expect(grid).toBeInTheDocument();
  });

  it('debería mostrar indicadores macro estáticos', async () => {
    (getYieldSpreads as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { spreads: { '2s10s': 0.5 } }
    });

    render(<BloombergMacroWidget />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Macro Indicators')).toBeInTheDocument();
    expect(screen.getByText('Argentina')).toBeInTheDocument();
    expect(screen.getByText('United States')).toBeInTheDocument();
  });
});

