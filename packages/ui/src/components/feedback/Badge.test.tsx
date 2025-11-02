import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge Component', () => {
  describe('Rendering', () => {
    it('should render with children', () => {
      render(<Badge>New</Badge>);
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('should render with default variant', () => {
      render(<Badge>Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toHaveClass('bg-surface-hover', 'text-text');
    });

    it('should render with default size (md)', () => {
      render(<Badge>Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toHaveClass('px-2.5', 'py-1', 'text-sm');
    });
  });

  describe('Variants', () => {
    it('should apply default variant classes', () => {
      render(<Badge variant="default">Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toHaveClass('bg-surface-hover', 'text-text');
    });

    it('should apply success variant classes', () => {
      render(<Badge variant="success">Success</Badge>);
      const badge = screen.getByText('Success');
      expect(badge).toHaveClass('bg-success-subtle', 'text-success');
    });

    it('should apply warning variant classes', () => {
      render(<Badge variant="warning">Warning</Badge>);
      const badge = screen.getByText('Warning');
      expect(badge).toHaveClass('bg-warning-subtle', 'text-warning');
    });

    it('should apply error variant classes', () => {
      render(<Badge variant="error">Error</Badge>);
      const badge = screen.getByText('Error');
      expect(badge).toHaveClass('bg-error-subtle', 'text-error');
    });

    it('should apply brand variant classes', () => {
      render(<Badge variant="brand">Brand</Badge>);
      const badge = screen.getByText('Brand');
      expect(badge).toHaveClass('bg-primary', 'text-text-inverse');
    });
  });

  describe('Sizes', () => {
    it('should apply small size classes', () => {
      render(<Badge size="sm">Small</Badge>);
      const badge = screen.getByText('Small');
      expect(badge).toHaveClass('px-2', 'py-0.5', 'text-xs');
    });

    it('should apply medium size classes', () => {
      render(<Badge size="md">Medium</Badge>);
      const badge = screen.getByText('Medium');
      expect(badge).toHaveClass('px-2.5', 'py-1', 'text-sm');
    });

    it('should apply large size classes', () => {
      render(<Badge size="lg">Large</Badge>);
      const badge = screen.getByText('Large');
      expect(badge).toHaveClass('px-3', 'py-1.5', 'text-base');
    });
  });

  describe('Custom Props', () => {
    it('should accept and apply custom className', () => {
      render(<Badge className="custom-badge">Custom</Badge>);
      const badge = screen.getByText('Custom');
      expect(badge).toHaveClass('custom-badge');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLSpanElement>();
      render(<Badge ref={ref}>With Ref</Badge>);
      expect(ref.current).not.toBeNull();
    });

    it('should accept HTML span attributes', () => {
      render(<Badge data-testid="custom-badge" aria-label="Status badge">Active</Badge>);
      const badge = screen.getByTestId('custom-badge');
      expect(badge).toHaveAttribute('aria-label', 'Status badge');
    });
  });

  describe('Styling', () => {
    it('should have base styling classes', () => {
      render(<Badge>Base</Badge>);
      const badge = screen.getByText('Base');
      expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-full', 'font-medium');
    });

    it('should combine all classes correctly', () => {
      render(<Badge variant="success" size="lg" className="extra-class">Combined</Badge>);
      const badge = screen.getByText('Combined');
      
      // Base classes
      expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-full');
      // Variant classes
      expect(badge).toHaveClass('bg-success-subtle', 'text-success');
      // Size classes
      expect(badge).toHaveClass('px-3', 'py-1.5', 'text-base');
      // Custom class
      expect(badge).toHaveClass('extra-class');
    });
  });

  describe('Accessibility', () => {
    it('should render as a span element', () => {
      render(<Badge>Span</Badge>);
      const badge = screen.getByText('Span');
      expect(badge.tagName).toBe('SPAN');
    });

    it('should support ARIA attributes', () => {
      render(<Badge role="status" aria-live="polite">Live Status</Badge>);
      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-live', 'polite');
    });
  });
});

