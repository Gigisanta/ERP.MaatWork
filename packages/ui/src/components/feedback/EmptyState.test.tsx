import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState Component', () => {
  describe('Rendering', () => {
    it('should render title', () => {
      render(<EmptyState title="No data found" />);
      expect(screen.getByText('No data found')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      render(<EmptyState title="No data" description="Try adjusting your filters" />);
      expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
    });

    it('should render icon when provided', () => {
      render(<EmptyState title="Empty" icon={<span data-testid="custom-icon">📭</span>} />);
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('should render action button when provided', () => {
      render(<EmptyState title="Empty" action={<button>Add Item</button>} />);
      expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should have centered flex layout', () => {
      const { container } = render(<EmptyState title="Empty" />);
      const emptyState = container.firstChild as HTMLElement;
      expect(emptyState).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
    });

    it('should have text-center class', () => {
      const { container } = render(<EmptyState title="Empty" />);
      const emptyState = container.firstChild as HTMLElement;
      expect(emptyState).toHaveClass('text-center');
    });

    it('should have padding', () => {
      const { container } = render(<EmptyState title="Empty" />);
      const emptyState = container.firstChild as HTMLElement;
      expect(emptyState).toHaveClass('p-8');
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<EmptyState title="Empty" className="custom-empty" />);
      const emptyState = container.firstChild as HTMLElement;
      expect(emptyState).toHaveClass('custom-empty');
    });

    it('should style title as heading', () => {
      render(<EmptyState title="No Results" />);
      const title = screen.getByText('No Results');
      expect(title.tagName).toBe('H3');
      expect(title).toHaveClass('text-lg', 'font-medium', 'text-text');
    });

    it('should style description with secondary color', () => {
      render(<EmptyState title="Empty" description="No items to display" />);
      const description = screen.getByText('No items to display');
      expect(description).toHaveClass('text-sm', 'text-text-secondary');
    });

    it('should style icon container', () => {
      const { container } = render(<EmptyState title="Empty" icon={<span>Icon</span>} />);
      const iconContainer = container.querySelector('.text-4xl');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer).toHaveClass('text-text-muted', 'mb-4');
    });
  });

  describe('Content Structure', () => {
    it('should render icon before title', () => {
      render(<EmptyState title="Empty" icon={<span data-testid="icon">Icon</span>} />);

      const icon = screen.getByTestId('icon');
      const title = screen.getByText('Empty');

      // Check that icon comes before title in DOM order
      const parent = icon.parentElement?.parentElement;
      const children = Array.from(parent?.children || []);
      const iconIndex = children.indexOf(icon.parentElement as Element);
      const titleIndex = children.indexOf(title);

      expect(iconIndex).toBeLessThan(titleIndex);
    });

    it('should render description after title', () => {
      render(<EmptyState title="Empty" description="Description text" />);

      const title = screen.getByText('Empty');
      const description = screen.getByText('Description text');

      const parent = title.parentElement;
      const children = Array.from(parent?.children || []);
      const titleIndex = children.indexOf(title);
      const descIndex = children.indexOf(description);

      expect(titleIndex).toBeLessThan(descIndex);
    });

    it('should render action after content', () => {
      const { container } = render(
        <EmptyState title="Empty" description="Description" action={<button>Action</button>} />
      );

      const action = container.querySelector('.mt-4');
      expect(action).toBeInTheDocument();
    });
  });

  describe('Typography', () => {
    it('should have proper heading size', () => {
      render(<EmptyState title="No Data" />);
      const title = screen.getByText('No Data');
      expect(title).toHaveClass('text-lg');
    });

    it('should have proper description size', () => {
      render(<EmptyState title="Empty" description="Small text" />);
      const description = screen.getByText('Small text');
      expect(description).toHaveClass('text-sm');
    });

    it('should limit description width', () => {
      render(<EmptyState title="Empty" description="Long text" />);
      const description = screen.getByText('Long text');
      expect(description).toHaveClass('max-w-sm');
    });
  });

  describe('Edge Cases', () => {
    it('should render without description', () => {
      render(<EmptyState title="Empty State" />);
      expect(screen.getByText('Empty State')).toBeInTheDocument();
      expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
    });

    it('should render without icon', () => {
      const { container } = render(<EmptyState title="Empty" />);
      const iconContainer = container.querySelector('.text-4xl');
      expect(iconContainer).not.toBeInTheDocument();
    });

    it('should render without action', () => {
      render(<EmptyState title="Empty" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should handle all props together', () => {
      render(
        <EmptyState
          title="No Items"
          description="Get started by adding your first item"
          icon={<span data-testid="icon">📦</span>}
          action={<button>Add Item</button>}
          className="custom-class"
        />
      );

      expect(screen.getByText('No Items')).toBeInTheDocument();
      expect(screen.getByText('Get started by adding your first item')).toBeInTheDocument();
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
    });
  });

  describe('Spacing', () => {
    it('should have margin between title and description', () => {
      render(<EmptyState title="Empty" description="Text" />);
      const title = screen.getByText('Empty');
      expect(title).toHaveClass('mb-2');
    });

    it('should have margin between description and action', () => {
      render(<EmptyState title="Empty" description="Text" action={<button>Action</button>} />);
      const description = screen.getByText('Text');
      expect(description).toHaveClass('mb-4');
    });

    it('should have margin on action container', () => {
      const { container } = render(<EmptyState title="Empty" action={<button>Action</button>} />);
      const actionContainer = container.querySelector('.mt-4');
      expect(actionContainer).toBeInTheDocument();
    });
  });
});
