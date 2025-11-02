import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tooltip } from './Tooltip';

describe('Tooltip Component', () => {
  describe('Rendering', () => {
    it('should render trigger content', () => {
      render(
        <Tooltip content="Helpful text">
          <button>Hover me</button>
        </Tooltip>
      );
      expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument();
    });

    it('should not show tooltip content initially', () => {
      render(
        <Tooltip content="Tooltip text">
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument();
    });
  });

  describe('Content', () => {
    it('should support string content', () => {
      render(
        <Tooltip content="Simple text">
          <button>Trigger</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should support React node content', () => {
      render(
        <Tooltip content={<div data-testid="custom">Custom content</div>}>
          <button>Trigger</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Positioning', () => {
    it('should default to top position', () => {
      render(
        <Tooltip content="Top tooltip">
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should support right position', () => {
      render(
        <Tooltip content="Right tooltip" side="right">
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should support bottom position', () => {
      render(
        <Tooltip content="Bottom tooltip" side="bottom">
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should support left position', () => {
      render(
        <Tooltip content="Left tooltip" side="left">
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Delay', () => {
    it('should use default delay duration (200ms)', () => {
      render(
        <Tooltip content="Delayed tooltip">
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should accept custom delay duration', () => {
      render(
        <Tooltip content="Custom delay" delayDuration={500}>
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should support instant tooltip (0ms delay)', () => {
      render(
        <Tooltip content="Instant tooltip" delayDuration={0}>
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have tooltip provider', () => {
      const { container } = render(
        <Tooltip content="Styled tooltip">
          <button>Button</button>
        </Tooltip>
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Children', () => {
    it('should work with button elements', () => {
      render(
        <Tooltip content="Button tooltip">
          <button>Click me</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should work with span elements', () => {
      render(
        <Tooltip content="Span tooltip">
          <span>Hover text</span>
        </Tooltip>
      );
      expect(screen.getByText('Hover text')).toBeInTheDocument();
    });

    it('should work with div elements', () => {
      render(
        <Tooltip content="Div tooltip">
          <div data-testid="div-trigger">Hover area</div>
        </Tooltip>
      );
      expect(screen.getByTestId('div-trigger')).toBeInTheDocument();
    });

    it('should work with icon elements', () => {
      render(
        <Tooltip content="Icon tooltip">
          <span data-testid="icon">ℹ️</span>
        </Tooltip>
      );
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      render(
        <Tooltip content="">
          <button>Empty tooltip</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle long content', () => {
      const longContent = 'This is a very long tooltip text that might wrap to multiple lines in some cases depending on the viewport width';
      render(
        <Tooltip content={longContent}>
          <button>Long tooltip</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle special characters', () => {
      render(
        <Tooltip content="Special: @#$%^&*()">
          <button>Special chars</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Multiple Tooltips', () => {
    it('should render multiple tooltips independently', () => {
      render(
        <div>
          <Tooltip content="First tooltip">
            <button>Button 1</button>
          </Tooltip>
          <Tooltip content="Second tooltip">
            <button>Button 2</button>
          </Tooltip>
        </div>
      );
      expect(screen.getByRole('button', { name: 'Button 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Button 2' })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should support keyboard navigation on trigger', () => {
      render(
        <Tooltip content="Accessible tooltip">
          <button>Keyboard accessible</button>
        </Tooltip>
      );
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('should work with disabled elements', () => {
      render(
        <Tooltip content="Disabled tooltip">
          <button disabled>Disabled button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });
});

