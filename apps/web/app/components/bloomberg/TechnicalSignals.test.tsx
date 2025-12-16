import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TechnicalSignals from './TechnicalSignals';

describe('TechnicalSignals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar loading state inicialmente', () => {
    render(<TechnicalSignals symbol="AAPL" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('debería mostrar contenido después de cargar', async () => {
    render(<TechnicalSignals symbol="AAPL" />);

    await waitFor(() => {
      expect(screen.getByText(/Technical Signals - AAPL/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Technical indicators/i)).toBeInTheDocument();
  });

  it('debería mostrar symbol en el heading', async () => {
    render(<TechnicalSignals symbol="MSFT" />);

    await waitFor(() => {
      expect(screen.getByText(/Technical Signals - MSFT/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar mensaje sobre indicadores técnicos', async () => {
    render(<TechnicalSignals symbol="AAPL" />);

    await waitFor(() => {
      expect(screen.getByText(/SMA/i)).toBeInTheDocument();
      expect(screen.getByText(/EMA/i)).toBeInTheDocument();
      expect(screen.getByText(/RSI/i)).toBeInTheDocument();
      expect(screen.getByText(/MACD/i)).toBeInTheDocument();
      expect(screen.getByText(/Bollinger Bands/i)).toBeInTheDocument();
    });
  });

  it('debería manejar diferentes symbols', async () => {
    const { rerender } = render(<TechnicalSignals symbol="GOOGL" />);

    await waitFor(() => {
      expect(screen.getByText(/Technical Signals - GOOGL/i)).toBeInTheDocument();
    });

    rerender(<TechnicalSignals symbol="TSLA" />);

    await waitFor(() => {
      expect(screen.getByText(/Technical Signals - TSLA/i)).toBeInTheDocument();
    });
  });
});
