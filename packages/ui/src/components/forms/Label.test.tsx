import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Label from './Label';

describe('Label Component', () => {
  describe('Rendering', () => {
    it('should render label with children', () => {
      render(<Label>Username</Label>);
      expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('should render as label element', () => {
      const { container } = render(<Label>Test Label</Label>);
      const label = container.querySelector('label');
      expect(label).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have base styling classes', () => {
      const { container } = render(<Label>Styled Label</Label>);
      const label = container.querySelector('label');
      expect(label).toHaveClass('block', 'text-sm', 'font-medium', 'text-text', 'mb-1');
    });

    it('should accept custom className', () => {
      const { container } = render(<Label className="custom-label">Custom</Label>);
      const label = container.querySelector('label');
      expect(label).toHaveClass('custom-label');
    });

    it('should combine base and custom classes', () => {
      const { container } = render(<Label className="text-red-500">Combined</Label>);
      const label = container.querySelector('label');
      expect(label).toHaveClass('block', 'text-sm', 'text-red-500');
    });
  });

  describe('HTML Attributes', () => {
    it('should accept htmlFor attribute', () => {
      const { container } = render(<Label htmlFor="input-id">For Input</Label>);
      const label = container.querySelector('label');
      expect(label).toHaveAttribute('for', 'input-id');
    });

    it('should accept id attribute', () => {
      const { container } = render(<Label id="label-id">With ID</Label>);
      const label = container.querySelector('label');
      expect(label).toHaveAttribute('id', 'label-id');
    });

    it('should accept onClick handler', () => {
      const handleClick = vi.fn();
      const { container } = render(<Label onClick={handleClick}>Clickable</Label>);
      const label = container.querySelector('label');
      label?.click();
      expect(handleClick).toHaveBeenCalled();
    });

    it('should accept data attributes', () => {
      const { container } = render(<Label data-testid="test-label">Data Attr</Label>);
      const label = container.querySelector('label');
      expect(label).toHaveAttribute('data-testid', 'test-label');
    });
  });

  describe('Children', () => {
    it('should render text children', () => {
      render(<Label>Simple Text</Label>);
      expect(screen.getByText('Simple Text')).toBeInTheDocument();
    });

    it('should render JSX children', () => {
      render(
        <Label>
          <span>Email</span>
          <span className="text-error">*</span>
        </Label>
      );
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <Label>
          Username <span className="text-text-secondary">(optional)</span>
        </Label>
      );
      expect(screen.getByText(/Username/)).toBeInTheDocument();
      expect(screen.getByText('(optional)')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should associate label with input via htmlFor', () => {
      const { container } = render(
        <>
          <Label htmlFor="test-input">Associated Label</Label>
          <input id="test-input" type="text" />
        </>
      );
      const label = container.querySelector('label');
      const input = container.querySelector('input');
      expect(label).toHaveAttribute('for', 'test-input');
      expect(input).toHaveAttribute('id', 'test-input');
    });
  });
});
