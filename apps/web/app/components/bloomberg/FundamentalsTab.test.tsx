import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import FundamentalsTab from './FundamentalsTab';

describe('FundamentalsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar loading state inicialmente', () => {
    render(<FundamentalsTab symbol="AAPL" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('debería mostrar contenido después de cargar', async () => {
    render(<FundamentalsTab symbol="AAPL" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Fundamentals - AAPL/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/Fundamental data/i)).toBeInTheDocument();
  });

  it('debería mostrar symbol en el heading', async () => {
    render(<FundamentalsTab symbol="MSFT" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Fundamentals - MSFT/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar mensaje sobre SEC EDGAR', async () => {
    render(<FundamentalsTab symbol="AAPL" />);
    
    await waitFor(() => {
      expect(screen.getByText(/SEC EDGAR/i)).toBeInTheDocument();
    });
  });

  it('debería manejar diferentes symbols', async () => {
    const { rerender } = render(<FundamentalsTab symbol="GOOGL" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Fundamentals - GOOGL/i)).toBeInTheDocument();
    });
    
    rerender(<FundamentalsTab symbol="TSLA" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Fundamentals - TSLA/i)).toBeInTheDocument();
    });
  });
});

