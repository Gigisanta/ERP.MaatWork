import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner, LoadingOverlay } from './Spinner';

describe('Spinner Component', () => {
  describe('Rendering', () => {
    it('should render spinner', () => {
      render(<Spinner />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should have accessible label', () => {
      render(<Spinner />);
      const label = screen.getByText('Loading...');
      expect(label).toHaveClass('sr-only');
    });
  });

  describe('Sizes', () => {
    it('should apply small size classes', () => {
      const { container } = render(<Spinner size="sm" />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('h-4', 'w-4');
    });

    it('should apply medium size classes (default)', () => {
      const { container } = render(<Spinner />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('h-6', 'w-6');
    });

    it('should apply large size classes', () => {
      const { container } = render(<Spinner size="lg" />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('h-8', 'w-8');
    });
  });

  describe('Styling', () => {
    it('should have animation classes', () => {
      const { container } = render(<Spinner />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('animate-spin', 'rounded-full');
    });

    it('should have border styles', () => {
      const { container } = render(<Spinner />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('border-2', 'border-current', 'border-t-transparent');
    });

    it('should accept custom className', () => {
      const { container } = render(<Spinner className="custom-spinner" />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('custom-spinner');
    });
  });

  describe('Accessibility', () => {
    it('should have sr-only loading text', () => {
      render(<Spinner />);
      const loadingText = screen.getByText('Loading...');
      expect(loadingText).toHaveClass('sr-only');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Spinner ref={ref} />);
      expect(ref.current).not.toBeNull();
    });
  });
});

describe('LoadingOverlay Component', () => {
  describe('Rendering', () => {
    it('should render children', () => {
      render(
        <LoadingOverlay loading={false}>
          <div>Content</div>
        </LoadingOverlay>
      );
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should show loading overlay when loading is true', () => {
      render(
        <LoadingOverlay loading={true}>
          <div>Content</div>
        </LoadingOverlay>
      );
      // getAllByText because there are 2 instances: sr-only text + visible text
      expect(screen.getAllByText('Loading...')).toHaveLength(2);
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should hide loading overlay when loading is false', () => {
      render(
        <LoadingOverlay loading={false}>
          <div>Content</div>
        </LoadingOverlay>
      );
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should display custom loading text', () => {
      render(
        <LoadingOverlay loading={true} text="Please wait...">
          <div>Content</div>
        </LoadingOverlay>
      );
      expect(screen.getByText('Please wait...')).toBeInTheDocument();
    });

    it('should not display text when not provided and loading', () => {
      render(
        <LoadingOverlay loading={true} text="">
          <div>Content</div>
        </LoadingOverlay>
      );
      // Should still show the Spinner's "Loading..." text
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have relative positioning for overlay', () => {
      const { container } = render(
        <LoadingOverlay loading={false}>
          <div>Content</div>
        </LoadingOverlay>
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('relative');
    });

    it('should apply backdrop blur when loading', () => {
      const { container } = render(
        <LoadingOverlay loading={true}>
          <div>Content</div>
        </LoadingOverlay>
      );
      const overlay = container.querySelector('.absolute');
      expect(overlay).toHaveClass('backdrop-blur-sm');
    });

    it('should accept custom className', () => {
      const { container } = render(
        <LoadingOverlay loading={false} className="custom-overlay">
          <div>Content</div>
        </LoadingOverlay>
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-overlay');
    });
  });

  describe('Accessibility', () => {
    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <LoadingOverlay loading={false} ref={ref}>
          <div>Content</div>
        </LoadingOverlay>
      );
      expect(ref.current).not.toBeNull();
    });

    it('should maintain content accessibility when loading', () => {
      render(
        <LoadingOverlay loading={true}>
          <button>Click me</button>
        </LoadingOverlay>
      );
      // Content should still be in DOM (though visually covered)
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should toggle loading state', () => {
      const { rerender } = render(
        <LoadingOverlay loading={false}>
          <div>Content</div>
        </LoadingOverlay>
      );
      
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      
      rerender(
        <LoadingOverlay loading={true}>
          <div>Content</div>
        </LoadingOverlay>
      );
      
      // getAllByText because there are 2 instances when loading
      expect(screen.getAllByText('Loading...')).toHaveLength(2);
    });
  });
});

