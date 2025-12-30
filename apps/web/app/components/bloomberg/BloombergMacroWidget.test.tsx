/**
 * Tests para BloombergMacroWidget component
 *
 * AI_DECISION: Tests unitarios para widget macro Bloomberg
 * Justificación: Validación crítica de fetching y renderizado de spreads de tasas
 * Impacto: Prevenir errores en visualización de indicadores macro
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import BloombergMacroWidget from './BloombergMacroWidget';
import { getYieldSpreads } from '@/lib/api/bloomberg';

import React from 'react';

// Mock dependencies
vi.mock('@/lib/api/bloomberg', () => ({
  getYieldSpreads: vi.fn(),
}));

vi.mock('@maatwork/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  Grid: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  Text: ({
    children,
    className,
    style,
  }: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <span className={className} style={style}>
      {children}
    </span>
  ),
  Stack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-badge-variant={variant}>{children}</span>
  ),
  Spinner: ({ size }: { size?: string }) => <div data-testid="spinner">Loading...</div>,
  Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div role="alert" data-alert-variant={variant}>
      {children}
    </div>
  ),
}));

describe('BloombergMacroWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
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
      '3m10y': 1.2,
    };

    (getYieldSpreads as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { spreads: mockSpreads },
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
      '3m10y': 0.8,
    };

    (getYieldSpreads as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { spreads: mockSpreads },
    });

    render(<BloombergMacroWidget />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    const invertedBadge = screen.getByText('Inverted');
    expect(invertedBadge).toBeInTheDocument();
    expect(invertedBadge.closest('[data-badge-variant]')).toHaveAttribute(
      'data-badge-variant',
      'error'
    );
  });

  it('debería mostrar alerta de curva invertida cuando 2s10s es negativo', async () => {
    const mockSpreads = {
      '2s10s': -0.5,
      '3m10y': 0.5,
    };

    (getYieldSpreads as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { spreads: mockSpreads },
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
      error: 'Failed to fetch spreads',
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
    (getYieldSpreads as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    render(<BloombergMacroWidget />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Network error');
  });

  it('debería refrescar datos periódicamente', async () => {
    vi.useFakeTimers();
    const mockSpreads = {
      '2s10s': 0.5,
      '3m10y': 1.2,
    };

    (getYieldSpreads as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { spreads: mockSpreads },
    });

    render(<BloombergMacroWidget />);

    // Esperar primera llamada
    await vi.runOnlyPendingTimersAsync();
    const callsAfterFirst = (getYieldSpreads as any).mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThanOrEqual(1);

    // Avanzar 5 minutos
    await act(async () => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });

    expect(getYieldSpreads).toHaveBeenCalledTimes(callsAfterFirst + 1);
    vi.useRealTimers();
  });

  it('debería mostrar mensaje de error cuando no hay spreads', async () => {
    (getYieldSpreads as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { spreads: null },
    });

    render(<BloombergMacroWidget />);

    await waitFor(
      () => {
        expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // El código actual trata spreads: null como un error
    expect(screen.getByText('Failed to fetch yield spreads')).toBeInTheDocument();
  });

  it('debería aplicar className personalizada', () => {
    (getYieldSpreads as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { spreads: { '2s10s': 0.5 } },
    });

    const { container } = render(<BloombergMacroWidget className="custom-class" />);
    const grid = container.querySelector('.custom-class');
    expect(grid).toBeInTheDocument();
  });

  it('debería mostrar indicadores macro estáticos', async () => {
    (getYieldSpreads as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { spreads: { '2s10s': 0.5 } },
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
