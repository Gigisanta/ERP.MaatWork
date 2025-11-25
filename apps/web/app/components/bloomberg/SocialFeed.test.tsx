import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SocialFeed from './SocialFeed';

describe('SocialFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar loading state inicialmente', () => {
    render(<SocialFeed symbol="AAPL" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('debería mostrar contenido después de cargar', async () => {
    render(<SocialFeed symbol="AAPL" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Social Feed - AAPL/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/Social media posts/i)).toBeInTheDocument();
  });

  it('debería mostrar symbol en el heading', async () => {
    render(<SocialFeed symbol="MSFT" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Social Feed - MSFT/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar mensaje sobre Reddit y X/Twitter', async () => {
    render(<SocialFeed symbol="AAPL" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Reddit/i)).toBeInTheDocument();
      expect(screen.getByText(/X\/Twitter/i)).toBeInTheDocument();
    });
  });

  it('debería manejar diferentes symbols', async () => {
    const { rerender } = render(<SocialFeed symbol="GOOGL" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Social Feed - GOOGL/i)).toBeInTheDocument();
    });
    
    rerender(<SocialFeed symbol="TSLA" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Social Feed - TSLA/i)).toBeInTheDocument();
    });
  });
});

