import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorState, InlineErrorState } from './ErrorState';

describe('ErrorState', () => {
  describe('Basic Rendering', () => {
    it('should render with title', () => {
      render(<ErrorState title="Error occurred" />);
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Error occurred')).toBeInTheDocument();
    });

    it('should render with description', () => {
      render(
        <ErrorState 
          title="Error" 
          description="Something went wrong"
        />
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should render with action text', () => {
      render(
        <ErrorState 
          title="Error" 
          actionText="Try again later"
        />
      );
      
      expect(screen.getByText('Try again later')).toBeInTheDocument();
    });
  });

  describe('Retry Button', () => {
    it('should render retry button when onRetry is provided', () => {
      const onRetry = vi.fn();
      render(
        <ErrorState 
          title="Error" 
          onRetry={onRetry}
        />
      );
      
      expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', () => {
      const onRetry = vi.fn();
      render(
        <ErrorState 
          title="Error" 
          onRetry={onRetry}
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /reintentar/i }));
      
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should show retrying state', () => {
      render(
        <ErrorState 
          title="Error" 
          onRetry={() => {}}
          isRetrying={true}
        />
      );
      
      expect(screen.getByRole('button', { name: /reintentando/i })).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should use custom retry text', () => {
      render(
        <ErrorState 
          title="Error" 
          onRetry={() => {}}
          retryText="Try again"
        />
      );
      
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  describe('Secondary Action', () => {
    it('should render secondary action button when provided', () => {
      const onSecondaryAction = vi.fn();
      render(
        <ErrorState 
          title="Error" 
          onSecondaryAction={onSecondaryAction}
          secondaryActionText="Go back"
        />
      );
      
      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    });

    it('should call onSecondaryAction when clicked', () => {
      const onSecondaryAction = vi.fn();
      render(
        <ErrorState 
          title="Error" 
          onSecondaryAction={onSecondaryAction}
          secondaryActionText="Go back"
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /go back/i }));
      
      expect(onSecondaryAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Variants', () => {
    it('should apply error variant by default', () => {
      const { container } = render(<ErrorState title="Error" />);
      
      expect(container.querySelector('.bg-error-subtle')).toBeInTheDocument();
    });

    it('should apply warning variant', () => {
      const { container } = render(<ErrorState title="Warning" variant="warning" />);
      
      expect(container.querySelector('.bg-warning-subtle')).toBeInTheDocument();
    });

    it('should apply info variant', () => {
      const { container } = render(<ErrorState title="Info" variant="info" />);
      
      expect(container.querySelector('.bg-info-subtle')).toBeInTheDocument();
    });

    it('should apply network variant', () => {
      const { container } = render(<ErrorState title="Network Error" variant="network" />);
      
      expect(container.querySelector('.bg-error-subtle')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('should apply small size', () => {
      const { container } = render(<ErrorState title="Error" size="sm" />);
      
      expect(container.querySelector('.p-4')).toBeInTheDocument();
    });

    it('should apply medium size (default)', () => {
      const { container } = render(<ErrorState title="Error" />);
      
      expect(container.querySelector('.p-6')).toBeInTheDocument();
    });

    it('should apply large size', () => {
      const { container } = render(<ErrorState title="Error" size="lg" />);
      
      expect(container.querySelector('.p-8')).toBeInTheDocument();
    });
  });

  describe('Request ID', () => {
    it('should not show request ID in production by default', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      render(
        <ErrorState 
          title="Error" 
          requestId="abc123"
        />
      );
      
      expect(screen.queryByText(/request id/i)).not.toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should show request ID when showRequestId is true', () => {
      render(
        <ErrorState 
          title="Error" 
          requestId="abc123"
          showRequestId={true}
        />
      );
      
      expect(screen.getByText(/abc123/)).toBeInTheDocument();
    });
  });

  describe('Children', () => {
    it('should render children content', () => {
      render(
        <ErrorState title="Error">
          <button>Custom action</button>
        </ErrorState>
      );
      
      expect(screen.getByRole('button', { name: /custom action/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have role="alert"', () => {
      render(<ErrorState title="Error" />);
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have aria-live="polite"', () => {
      render(<ErrorState title="Error" />);
      
      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite');
    });
  });
});

describe('InlineErrorState', () => {
  it('should render message', () => {
    render(<InlineErrorState message="Something went wrong" />);
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should render retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(
      <InlineErrorState 
        message="Error" 
        onRetry={onRetry}
      />
    );
    
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should call onRetry when clicked', () => {
    const onRetry = vi.fn();
    render(
      <InlineErrorState 
        message="Error" 
        onRetry={onRetry}
      />
    );
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should show loading state when retrying', () => {
    render(
      <InlineErrorState 
        message="Error" 
        onRetry={() => {}}
        isRetrying={true}
      />
    );
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should have role="alert"', () => {
    render(<InlineErrorState message="Error" />);
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
