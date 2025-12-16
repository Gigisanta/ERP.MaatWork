import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PortfolioAssetsSnapshot from './PortfolioAssetsSnapshot';
import { usePortfolioAssets } from '@/lib/hooks/usePortfolioAssets';
import { useRouter } from 'next/navigation';

vi.mock('@/lib/hooks/usePortfolioAssets', () => ({
  usePortfolioAssets: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('next/dynamic', () => ({
  default: vi.fn((loader) => {
    return function DynamicComponent() {
      return <div data-testid="asset-snapshot">Asset Snapshot</div>;
    };
  }),
}));

describe('PortfolioAssetsSnapshot', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
  });

  it('debería mostrar mensaje cuando no hay carteras', () => {
    (usePortfolioAssets as any).mockReturnValue([]);

    render(<PortfolioAssetsSnapshot portfolios={[]} />);

    expect(screen.getByText(/No hay carteras disponibles/i)).toBeInTheDocument();
  });

  it('debería mostrar mensaje cuando no hay activos', () => {
    (usePortfolioAssets as any).mockReturnValue([]);

    render(
      <PortfolioAssetsSnapshot
        portfolios={[{ id: 'portfolio-1', name: 'Test Portfolio' }] as any}
      />
    );

    expect(screen.getByText(/No hay activos en las carteras/i)).toBeInTheDocument();
  });

  it('debería mostrar activos cuando existen', () => {
    const mockAssets = [
      { symbol: 'AAPL', portfolios: [{ id: 'p1', name: 'Portfolio 1' }] },
      { symbol: 'MSFT', portfolios: [{ id: 'p1', name: 'Portfolio 1' }] },
    ];

    (usePortfolioAssets as any).mockReturnValue(mockAssets);

    render(<PortfolioAssetsSnapshot portfolios={[{ id: 'p1', name: 'Portfolio 1' }] as any} />);

    expect(screen.getByText(/Portfolio Assets Snapshot/i)).toBeInTheDocument();
    expect(screen.getByText(/2 activos únicos/i)).toBeInTheDocument();
  });

  it('debería limitar número de activos mostrados según maxAssets', () => {
    const mockAssets = Array.from({ length: 15 }, (_, i) => ({
      symbol: `SYMBOL${i}`,
      portfolios: [{ id: 'p1', name: 'Portfolio 1' }],
    }));

    (usePortfolioAssets as any).mockReturnValue(mockAssets);

    render(<PortfolioAssetsSnapshot portfolios={[{ id: 'p1' }] as any} maxAssets={10} />);

    expect(screen.getByText(/15 activos únicos/i)).toBeInTheDocument();
    expect(screen.getByText(/mostrando 10/i)).toBeInTheDocument();
  });

  it('debería mostrar contador correcto para singular', () => {
    const mockAssets = [{ symbol: 'AAPL', portfolios: [{ id: 'p1' }] }];

    (usePortfolioAssets as any).mockReturnValue(mockAssets);

    render(<PortfolioAssetsSnapshot portfolios={[{ id: 'p1' }] as any} />);

    expect(screen.getByText(/1 activo único/i)).toBeInTheDocument();
  });

  it('debería aceptar className prop', () => {
    (usePortfolioAssets as any).mockReturnValue([{ symbol: 'AAPL', portfolios: [{ id: 'p1' }] }]);

    const { container } = render(
      <PortfolioAssetsSnapshot portfolios={[{ id: 'p1' }] as any} className="custom-class" />
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});
