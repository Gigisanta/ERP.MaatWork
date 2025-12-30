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
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// Mock Radix UI Portal to render in-place for easier testing
vi.mock('@radix-ui/react-dialog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@radix-ui/react-dialog')>();
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// Mock API
vi.mock('@/lib/api', () => ({
  getPortfolioById: vi.fn(),
  addPortfolioLine: vi.fn(),
  deletePortfolioLine: vi.fn(),
}));

// Mock Toast component specifically as it can be tricky with Radix portals in tests
vi.mock('@maatwork/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@maatwork/ui')>();
  return {
    ...actual,
    Toast: ({ title, open }: { title: string; open: boolean }) =>
      open ? <div data-testid="mock-toast">{title}</div> : null,
  };
});

// Mock auth
vi.mock('../../auth/useRequireAuth', () => ({
  useRequireAuth: () => ({
    user: { id: 'user-1', role: 'admin' },
    loading: false,
  }),
}));

// Mock logger
vi.mock('../../../lib/logger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/logger')>();
  return {
    ...actual,
    logger: {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  };
});

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
      expect(screen.getAllByText('Test Portfolio').length).toBeGreaterThan(0);
    });
  });

  it('should show error message when portfolio fetch fails', async () => {
    const { getPortfolioById } = await import('@/lib/api');
    vi.mocked(getPortfolioById).mockRejectedValue(new Error('Failed to fetch'));

    render(<PortfolioDetailPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/error/i).length).toBeGreaterThan(0);
    });
  });

  it('should open create line modal when add button is clicked', async () => {
    const user = userEvent.setup();
    const { getPortfolioById } = await import('@/lib/api');
    vi.mocked(getPortfolioById).mockResolvedValue({
      success: true,
      data: mockPortfolio,
    });

    render(<PortfolioDetailPage />);

    // Wait for the add button to appear
    const addButton = await screen.findByRole('button', { name: /Agregar Primer Componente/i });

    // Click the button
    await user.click(addButton);

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText(/Agregar Componente a la Cartera/i)).toBeInTheDocument();
    });
  });

  it('should validate required fields when creating line', async () => {
    const user = userEvent.setup();
    const { getPortfolioById } = await import('@/lib/api');
    vi.mocked(getPortfolioById).mockResolvedValue({
      success: true,
      data: mockPortfolio,
    });

    render(<PortfolioDetailPage />);

    const addButton = await screen.findByRole('button', { name: /Agregar Primer Componente/i });
    await user.click(addButton);

    // Fill in a valid weight but leave asset class empty
    const weightInput = await screen.findByLabelText(/Peso Objetivo/i);
    await user.clear(weightInput);
    await user.type(weightInput, '25');

    // Try to submit without required fields
    const modal = await screen.findByRole('dialog');
    const submitButton = within(modal).getByRole('button', { name: /^Agregar$/ });
    await user.click(submitButton);

    // Should show validation errors
    await waitFor(
      () => {
        expect(screen.getByText(/requerido/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});
