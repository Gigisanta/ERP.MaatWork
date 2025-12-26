/**
 * Tests para AssetSnapshot component
 *
 * AI_DECISION: Tests unitarios para componente de snapshot de activos Bloomberg
 * Justificación: Validación crítica de fetching y renderizado de datos
 * Impacto: Prevenir errores en visualización de datos financieros
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AssetSnapshot from './AssetSnapshot';

// Mock dependencies
// Note: Component uses global fetch directly to avoid webpack resolution issues
global.fetch = vi.fn();
const mockFetch = vi.mocked(global.fetch);

interface MockComponentProps {
  children?: React.ReactNode;
  className?: string;
  [key: string]: unknown;
}

vi.mock('@maatwork/ui', () => ({
  Card: ({ children, className }: MockComponentProps) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: MockComponentProps) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: MockComponentProps) => <div>{children}</div>,
  CardTitle: ({ children }: MockComponentProps) => <h3>{children}</h3>,
  Text: ({ children, className, style }: MockComponentProps) => (
    <span className={className} style={style as React.CSSProperties}>
      {children}
    </span>
  ),
  Heading: ({ children }: MockComponentProps) => <h2>{children}</h2>,
  Stack: ({ children, style }: MockComponentProps) => <div style={style as React.CSSProperties}>{children}</div>,
  Badge: ({ children }: MockComponentProps) => <span>{children}</span>,
  Spinner: () => <div data-testid="spinner">Loading...</div>,
  Alert: ({ children }: MockComponentProps) => <div role="alert">{children}</div>,
  Button: ({ children, onClick }: MockComponentProps) => (
    <button onClick={onClick as React.MouseEventHandler}>{children}</button>
  ),
}));

describe('AssetSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería mostrar loading inicialmente', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<AssetSnapshot symbol="AAPL" />);

    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('debería renderizar datos del snapshot cuando se cargan', async () => {
    const mockSnapshot = {
      symbol: 'AAPL',
      price: 150.25,
      change: 2.5,
      changePercent: 1.69,
      volume: 50000000,
      high52w: 180.0,
      low52w: 120.0,
      pe: 25.5,
      currency: 'USD',
      source: 'Bloomberg',
      asof: '2024-01-15T10:00:00Z',
    };

    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: async () => mockSnapshot,
    } as Response);

    render(<AssetSnapshot symbol="AAPL" />);

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    expect(screen.getByText(/150\.25/)).toBeInTheDocument();
  });

  it('debería mostrar error cuando falla el fetch', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<AssetSnapshot symbol="AAPL" />);

    await waitFor(() => {
      expect(screen.getByText(/Data not available/i)).toBeInTheDocument();
    });
  });

  it('debería llamar fetch con la URL correcta', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: async () => ({
        symbol: 'MSFT',
        price: 350.0,
        change: 5.0,
        changePercent: 1.45,
        volume: 30000000,
        high52w: 400.0,
        low52w: 300.0,
        currency: 'USD',
        source: 'Bloomberg',
        asof: '2024-01-15T10:00:00Z',
      }),
    } as Response);

    render(<AssetSnapshot symbol="MSFT" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/bloomberg/assets/MSFT/snapshot'),
        expect.any(Object)
      );
    });
  });

  it('debería aplicar className cuando se proporciona', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    const { container } = render(<AssetSnapshot symbol="AAPL" className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
