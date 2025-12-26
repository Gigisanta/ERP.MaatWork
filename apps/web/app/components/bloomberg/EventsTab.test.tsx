import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import EventsTab from './EventsTab';

describe('EventsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar loading state o contenido', () => {
    render(<EventsTab symbol="AAPL" />);
    // En React 19 / Vitest, el useEffect puede correr inmediatamente o después
    const loading = screen.queryByRole('status');
    const content = screen.queryByText(/Events - AAPL/i);
    expect(loading || content).toBeInTheDocument();
  });

  it('debería mostrar contenido después de cargar', async () => {
    render(<EventsTab symbol="AAPL" />);

    await waitFor(() => {
      expect(screen.getByText(/Events - AAPL/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Regulatory events/i)).toBeInTheDocument();
  });

  it('debería mostrar symbol en el heading', async () => {
    render(<EventsTab symbol="MSFT" />);

    await waitFor(() => {
      expect(screen.getByText(/Events - MSFT/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar mensaje informativo sobre eventos regulatorios', async () => {
    render(<EventsTab symbol="AAPL" />);

    await waitFor(() => {
      expect(screen.getByText(/CNV Hechos Relevantes/i)).toBeInTheDocument();
    });
  });

  it('debería manejar diferentes symbols', async () => {
    const { rerender } = render(<EventsTab symbol="GOOGL" />);

    await waitFor(() => {
      expect(screen.getByText(/Events - GOOGL/i)).toBeInTheDocument();
    });

    rerender(<EventsTab symbol="TSLA" />);

    await waitFor(() => {
      expect(screen.getByText(/Events - TSLA/i)).toBeInTheDocument();
    });
  });
});
