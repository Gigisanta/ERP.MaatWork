/**
 * Tests for Portfolio Detail Page
 * 
 * Covers:
 * - CRUD operations for portfolio lines
 * - Error handling
 * - Validation
 * - Data loading
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PortfolioDetailPage from './page';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-portfolio-id' }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock API
vi.mock('@/lib/api', () => ({
  getPortfolioById: vi.fn(),
  addPortfolioLine: vi.fn(),
  deletePortfolioLine: vi.fn(),
}));

// Mock auth
vi.mock('../../auth/useRequireAuth', () => ({
  useRequireAuth: () => ({
    user: { id: 'user-1', role: 'advisor' },
    loading: false,
  }),
}));

// Mock logger
vi.mock('../../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('PortfolioDetailPage', () => {
  const mockPortfolio = {
    id: 'test-portfolio-id',
    name: 'Test Portfolio',
    lines: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render portfolio details when data is loaded', async () => {
    const { getPortfolioById } = await import('@/lib/api');
    vi.mocked(getPortfolioById).mockResolvedValue({
      success: true,
      data: mockPortfolio,
    });

    render(<PortfolioDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Portfolio')).toBeInTheDocument();
    });
  });

  it('should show error message when portfolio fetch fails', async () => {
    const { getPortfolioById } = await import('@/lib/api');
    vi.mocked(getPortfolioById).mockRejectedValue(new Error('Failed to fetch'));

    render(<PortfolioDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('should open create line modal when add button is clicked', async () => {
    const { getPortfolioById } = await import('@/lib/api');
    vi.mocked(getPortfolioById).mockResolvedValue({
      success: true,
      data: mockPortfolio,
    });

    render(<PortfolioDetailPage />);

    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /agregar/i });
      fireEvent.click(addButton);
      expect(screen.getByText(/crear línea/i)).toBeInTheDocument();
    });
  });

  it('should validate required fields when creating line', async () => {
    const { getPortfolioById } = await import('@/lib/api');
    vi.mocked(getPortfolioById).mockResolvedValue({
      success: true,
      data: mockPortfolio,
    });

    render(<PortfolioDetailPage />);

    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /agregar/i });
      fireEvent.click(addButton);
    });

    // Try to submit without required fields
    const submitButton = screen.getByRole('button', { name: /guardar/i });
    fireEvent.click(submitButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/requerido/i)).toBeInTheDocument();
    });
  });
});

