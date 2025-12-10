import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination';

describe('Pagination Component', () => {
  const mockOnPageChange = vi.fn();

  beforeEach(() => {
    mockOnPageChange.mockClear();
  });

  describe('Rendering', () => {
    it('should render pagination controls', () => {
      render(<Pagination currentPage={1} totalPages={5} onPageChange={mockOnPageChange} />);
      const nav = screen.getByRole('navigation', { name: /pagination/i });
      expect(nav).toBeInTheDocument();
    });

    it('should render page numbers', () => {
      render(<Pagination currentPage={3} totalPages={5} onPageChange={mockOnPageChange} />);
      expect(screen.getByRole('button', { name: 'Go to page 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go to page 2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go to page 3' })).toBeInTheDocument();
    });

    it('should not render when totalPages is 1 or less', () => {
      const { container } = render(
        <Pagination currentPage={1} totalPages={1} onPageChange={mockOnPageChange} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render Previous and Next buttons', () => {
      render(<Pagination currentPage={2} totalPages={5} onPageChange={mockOnPageChange} />);
      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    it('should render First and Last buttons', () => {
      render(<Pagination currentPage={2} totalPages={5} onPageChange={mockOnPageChange} />);
      expect(screen.getByRole('button', { name: /first/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /last/i })).toBeInTheDocument();
    });
  });

  describe('Current Page State', () => {
    it('should highlight current page', () => {
      render(<Pagination currentPage={3} totalPages={5} onPageChange={mockOnPageChange} />);
      const currentPage = screen.getByRole('button', { name: 'Go to page 3' });
      expect(currentPage).toHaveAttribute('aria-current', 'page');
    });

    it('should use primary variant for current page', () => {
      render(<Pagination currentPage={2} totalPages={5} onPageChange={mockOnPageChange} />);
      const currentPage = screen.getByRole('button', { name: 'Go to page 2' });
      expect(currentPage).toHaveClass('bg-primary');
    });
  });

  describe('Navigation Interactions', () => {
    it('should call onPageChange when page button is clicked', async () => {
      const user = userEvent.setup();
      render(<Pagination currentPage={1} totalPages={5} onPageChange={mockOnPageChange} />);

      await user.click(screen.getByRole('button', { name: 'Go to page 2' }));
      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it('should call onPageChange when Previous is clicked', async () => {
      const user = userEvent.setup();
      render(<Pagination currentPage={3} totalPages={5} onPageChange={mockOnPageChange} />);

      await user.click(screen.getByRole('button', { name: /previous/i }));
      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it('should call onPageChange when Next is clicked', async () => {
      const user = userEvent.setup();
      render(<Pagination currentPage={3} totalPages={5} onPageChange={mockOnPageChange} />);

      await user.click(screen.getByRole('button', { name: /next/i }));
      expect(mockOnPageChange).toHaveBeenCalledWith(4);
    });

    it('should call onPageChange when First is clicked', async () => {
      const user = userEvent.setup();
      render(<Pagination currentPage={3} totalPages={5} onPageChange={mockOnPageChange} />);

      await user.click(screen.getByRole('button', { name: /first/i }));
      expect(mockOnPageChange).toHaveBeenCalledWith(1);
    });

    it('should call onPageChange when Last is clicked', async () => {
      const user = userEvent.setup();
      render(<Pagination currentPage={3} totalPages={5} onPageChange={mockOnPageChange} />);

      await user.click(screen.getByRole('button', { name: /last/i }));
      expect(mockOnPageChange).toHaveBeenCalledWith(5);
    });
  });

  describe('Disabled States', () => {
    it('should disable Previous and First on first page', () => {
      render(<Pagination currentPage={1} totalPages={5} onPageChange={mockOnPageChange} />);

      expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /first/i })).toBeDisabled();
    });

    it('should disable Next and Last on last page', () => {
      render(<Pagination currentPage={5} totalPages={5} onPageChange={mockOnPageChange} />);

      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /last/i })).toBeDisabled();
    });

    it('should enable all buttons on middle pages', () => {
      render(<Pagination currentPage={3} totalPages={5} onPageChange={mockOnPageChange} />);

      expect(screen.getByRole('button', { name: /previous/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /first/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /last/i })).not.toBeDisabled();
    });
  });

  describe('Ellipsis', () => {
    it('should show ellipsis for many pages', () => {
      render(<Pagination currentPage={10} totalPages={20} onPageChange={mockOnPageChange} />);
      const ellipses = screen.getAllByText('...');
      expect(ellipses.length).toBeGreaterThan(0);
    });

    it('should not show ellipsis when all pages fit', () => {
      render(
        <Pagination
          currentPage={3}
          totalPages={5}
          onPageChange={mockOnPageChange}
          maxVisiblePages={5}
        />
      );
      expect(screen.queryByText('...')).not.toBeInTheDocument();
    });
  });

  describe('Options', () => {
    it('should hide first/last buttons when showFirstLast is false', () => {
      render(
        <Pagination
          currentPage={2}
          totalPages={5}
          onPageChange={mockOnPageChange}
          showFirstLast={false}
        />
      );

      expect(screen.queryByRole('button', { name: /first/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /last/i })).not.toBeInTheDocument();
    });

    it('should hide prev/next buttons when showPrevNext is false', () => {
      render(
        <Pagination
          currentPage={2}
          totalPages={5}
          onPageChange={mockOnPageChange}
          showPrevNext={false}
        />
      );

      expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    });

    it('should limit visible pages based on maxVisiblePages', () => {
      render(
        <Pagination
          currentPage={5}
          totalPages={10}
          onPageChange={mockOnPageChange}
          maxVisiblePages={3}
        />
      );

      // Should show limited number of page buttons
      const pageButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('aria-label')?.startsWith('Go to page'));

      // Exact count depends on ellipsis logic, but should be limited
      expect(pageButtons.length).toBeLessThan(10);
    });
  });

  describe('Accessibility', () => {
    it('should have proper navigation landmark', () => {
      render(<Pagination currentPage={1} totalPages={5} onPageChange={mockOnPageChange} />);
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Pagination');
    });

    it('should have aria-current on current page', () => {
      render(<Pagination currentPage={3} totalPages={5} onPageChange={mockOnPageChange} />);
      const currentPage = screen.getByRole('button', { name: 'Go to page 3' });
      expect(currentPage).toHaveAttribute('aria-current', 'page');
    });

    it('should have descriptive aria-labels', () => {
      render(<Pagination currentPage={2} totalPages={5} onPageChange={mockOnPageChange} />);

      expect(screen.getByRole('button', { name: /previous page, page 1/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next page, page 3/i })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle 2 total pages', () => {
      render(<Pagination currentPage={1} totalPages={2} onPageChange={mockOnPageChange} />);
      expect(screen.getByRole('button', { name: 'Go to page 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go to page 2' })).toBeInTheDocument();
    });

    it('should handle large page numbers', () => {
      render(<Pagination currentPage={50} totalPages={100} onPageChange={mockOnPageChange} />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <Pagination
          currentPage={1}
          totalPages={5}
          onPageChange={mockOnPageChange}
          className="custom-pagination"
        />
      );
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('custom-pagination');
    });
  });
});
