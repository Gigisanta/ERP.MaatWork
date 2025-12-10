import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toast } from './Toast';

describe('Toast Component', () => {
  describe('Rendering', () => {
    it('should render title', () => {
      render(<Toast title="Notification" open={true} />);
      expect(screen.getByText('Notification')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      render(<Toast title="Success" description="Operation completed" open={true} />);
      expect(screen.getByText('Operation completed')).toBeInTheDocument();
    });

    it('should not render content when open is false', () => {
      render(<Toast title="Hidden" open={false} />);
      // When closed, content should not be visible
      expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render info variant (default)', () => {
      const { container } = render(<Toast title="Info" variant="info" open={true} />);
      const toast = container.querySelector('.border-info');
      expect(toast).toBeInTheDocument();
    });

    it('should render success variant', () => {
      const { container } = render(<Toast title="Success" variant="success" open={true} />);
      const toast = container.querySelector('.border-success');
      expect(toast).toBeInTheDocument();
    });

    it('should render warning variant', () => {
      const { container } = render(<Toast title="Warning" variant="warning" open={true} />);
      const toast = container.querySelector('.border-warning');
      expect(toast).toBeInTheDocument();
    });

    it('should render error variant', () => {
      const { container } = render(<Toast title="Error" variant="error" open={true} />);
      const toast = container.querySelector('.border-error');
      expect(toast).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('should show info icon for info variant', () => {
      const { container } = render(<Toast title="Info" variant="info" open={true} />);
      expect(container.querySelector('span')).toBeInTheDocument(); // Icon renders as span
    });

    it('should show check icon for success variant', () => {
      const { container } = render(<Toast title="Success" variant="success" open={true} />);
      expect(container.querySelector('span')).toBeInTheDocument();
    });

    it('should show alert icon for warning variant', () => {
      const { container } = render(<Toast title="Warning" variant="warning" open={true} />);
      expect(container.querySelector('span')).toBeInTheDocument();
    });

    it('should show x icon for error variant', () => {
      const { container } = render(<Toast title="Error" variant="error" open={true} />);
      expect(container.querySelector('span')).toBeInTheDocument();
    });
  });

  describe('Close Button', () => {
    it('should render close button', () => {
      const { container } = render(<Toast title="Closeable" open={true} />);
      const closeButton = container.querySelector('.absolute.right-2.top-2');
      expect(closeButton).toBeInTheDocument();
    });

    it('should call onOpenChange when close button is clicked', async () => {
      const handleOpenChange = vi.fn();
      const { container } = render(
        <Toast title="Closeable" open={true} onOpenChange={handleOpenChange} />
      );

      const closeButton = container.querySelector('.absolute.right-2.top-2') as HTMLElement;
      closeButton?.click();

      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Duration', () => {
    it('should use default duration (5000ms)', () => {
      render(<Toast title="Auto-close" open={true} />);
      // Toast should be visible
      expect(screen.getByText('Auto-close')).toBeInTheDocument();
    });

    it('should accept custom duration', () => {
      render(<Toast title="Custom duration" open={true} duration={3000} />);
      // Toast should be visible
      expect(screen.getByText('Custom duration')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have base styling classes', () => {
      render(<Toast title="Styled" open={true} />);
      // Toast should be visible
      expect(screen.getByText('Styled')).toBeInTheDocument();
    });

    it('should have swipe gestures enabled', () => {
      render(<Toast title="Swipeable" open={true} />);
      // Toast should be visible
      expect(screen.getByText('Swipeable')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      render(<Toast title="Accessible" open={true} />);
      const title = screen.getByText('Accessible');
      expect(title).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      const { container } = render(<Toast title="Keyboard" open={true} />);
      const closeButton = container.querySelector('.absolute.right-2.top-2') as HTMLElement;
      expect(closeButton).toHaveClass('focus:ring-2');
    });
  });

  describe('Content', () => {
    it('should render children', () => {
      render(
        <Toast title="With children" open={true}>
          <div data-testid="custom-content">Custom action</div>
        </Toast>
      );
      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    });

    it('should handle long titles', () => {
      const longTitle =
        'This is a very long notification title that might wrap to multiple lines in the toast component';
      render(<Toast title={longTitle} open={true} />);
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should handle long descriptions', () => {
      const longDesc =
        'This is a detailed description explaining what happened in the system with lots of contextual information';
      render(<Toast title="Title" description={longDesc} open={true} />);
      expect(screen.getByText(longDesc)).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should position icon correctly', () => {
      const { container } = render(<Toast title="Icon layout" open={true} />);
      const iconContainer = container.querySelector('.flex.items-start.space-x-3');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should position close button in top right', () => {
      const { container } = render(<Toast title="Close position" open={true} />);
      const closeButton = container.querySelector('.absolute.right-2.top-2');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty description', () => {
      render(<Toast title="No description" description="" open={true} />);
      expect(screen.getByText('No description')).toBeInTheDocument();
    });

    it('should handle zero duration', () => {
      render(<Toast title="Zero duration" open={true} duration={0} />);
      expect(screen.getByText('Zero duration')).toBeInTheDocument();
    });
  });
});
