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
import { getAssetSnapshot } from '@/lib/api';

// Mock dependencies
vi.mock('@/lib/api', () => ({
  getAssetSnapshot: vi.fn()
}));

vi.mock('@cactus/ui', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  Text: ({ children, size, weight, color, className, style }: any) => (
    <span className={className} style={style}>{children}</span>
  ),
  Heading: ({ children, level }: any) => <h2>{children}</h2>,
  Stack: ({ children, direction, gap, align, style }: any) => (
    <div style={style}>{children}</div>
  ),
  Badge: ({ children, variant }: any) => <span>{children}</span>,
  Spinner: ({ size }: any) => <div data-testid="spinner">Loading...</div>,
  Alert: ({ children, variant }: any) => (
    <div role="alert">{children}</div>
  ),
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  )
}));

describe('AssetSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería mostrar loading inicialmente', () => {
    (getAssetSnapshot as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));

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
      asof: '2024-01-15T10:00:00Z'
    };

    (getAssetSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: mockSnapshot
    });

    render(<AssetSnapshot symbol="AAPL" />);

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    expect(screen.getByText(/150\.25/)).toBeInTheDocument();
  });

  it('debería mostrar error cuando falla el fetch', async () => {
    (getAssetSnapshot as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    render(<AssetSnapshot symbol="AAPL" />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('debería llamar getAssetSnapshot con el symbol correcto', async () => {
    (getAssetSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        symbol: 'MSFT',
        price: 350.0,
        change: 5.0,
        changePercent: 1.45,
        volume: 30000000,
        high52w: 400.0,
        low52w: 300.0,
        currency: 'USD',
        source: 'Bloomberg',
        asof: '2024-01-15T10:00:00Z'
      }
    });

    render(<AssetSnapshot symbol="MSFT" />);

    await waitFor(() => {
      expect(getAssetSnapshot).toHaveBeenCalledWith('MSFT');
    });
  });

  it('debería aplicar className cuando se proporciona', () => {
    (getAssetSnapshot as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));

    const { container } = render(<AssetSnapshot symbol="AAPL" className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });
});

