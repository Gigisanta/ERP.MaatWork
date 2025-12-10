import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from './Switch';

describe('Switch Component', () => {
  describe('Rendering', () => {
    it('should render switch', () => {
      render(<Switch />);
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('should render with label', () => {
      render(<Switch label="Enable notifications" />);
      expect(screen.getByText('Enable notifications')).toBeInTheDocument();
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('should render with helper text', () => {
      render(<Switch label="Theme" helperText="Toggle dark mode" />);
      expect(screen.getByText('Toggle dark mode')).toBeInTheDocument();
    });

    it('should render with error message', () => {
      render(<Switch label="Accept" error="Required field" />);
      expect(screen.getByText('Required field')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should hide helper text when error is shown', () => {
      render(<Switch helperText="Helper" error="Error message" />);
      expect(screen.queryByText('Helper')).not.toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('States', () => {
    it('should be unchecked by default', () => {
      render(<Switch />);
      expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'unchecked');
    });

    it('should be checked when defaultChecked is true', () => {
      render(<Switch defaultChecked />);
      expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'checked');
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Switch disabled />);
      expect(screen.getByRole('switch')).toBeDisabled();
    });
  });

  describe('Styling', () => {
    it('should have base styling classes', () => {
      render(<Switch />);
      const switchEl = screen.getByRole('switch');

      expect(switchEl).toHaveClass('inline-flex', 'h-5', 'w-9', 'rounded-full');
    });

    it('should apply checked state styles', () => {
      render(<Switch defaultChecked />);
      const switchEl = screen.getByRole('switch');

      expect(switchEl).toHaveAttribute('data-state', 'checked');
    });

    it('should apply unchecked state styles', () => {
      render(<Switch />);
      const switchEl = screen.getByRole('switch');

      expect(switchEl).toHaveAttribute('data-state', 'unchecked');
    });

    it('should apply error styles when error prop is present', () => {
      render(<Switch error="Error" />);
      expect(screen.getByRole('switch')).toHaveClass('ring-2', 'ring-error');
    });
  });

  describe('Interactions', () => {
    it('should toggle when clicked', async () => {
      const user = userEvent.setup();
      render(<Switch />);

      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveAttribute('data-state', 'unchecked');

      await user.click(switchEl);
      expect(switchEl).toHaveAttribute('data-state', 'checked');

      await user.click(switchEl);
      expect(switchEl).toHaveAttribute('data-state', 'unchecked');
    });

    it('should call onCheckedChange when toggled', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(<Switch onCheckedChange={handleChange} />);

      await user.click(screen.getByRole('switch'));
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('should toggle when label is clicked', async () => {
      const user = userEvent.setup();
      render(<Switch label="Click me" />);

      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveAttribute('data-state', 'unchecked');

      await user.click(screen.getByText('Click me'));
      expect(switchEl).toHaveAttribute('data-state', 'checked');
    });

    it('should not toggle when disabled', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(<Switch disabled onCheckedChange={handleChange} />);

      await user.click(screen.getByRole('switch'));
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes when error is present', () => {
      render(<Switch error="Error message" />);
      const switchEl = screen.getByRole('switch');

      expect(switchEl).toHaveAttribute('aria-invalid', 'true');
      expect(switchEl).toHaveAttribute('aria-describedby');
    });

    it('should link helper text with aria-describedby', () => {
      render(<Switch helperText="Helper text" id="test-switch" />);
      const switchEl = screen.getByRole('switch');

      expect(switchEl).toHaveAttribute('aria-describedby', 'test-switch-helper');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<Switch label="Keyboard test" />);

      const switchEl = screen.getByRole('switch');
      switchEl.focus();
      expect(switchEl).toHaveFocus();

      await user.keyboard(' ');
      expect(switchEl).toHaveAttribute('data-state', 'checked');
    });

    it('should have focus styles', () => {
      render(<Switch />);
      const switchEl = screen.getByRole('switch');

      expect(switchEl).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-2');
    });

    it('should have proper role', () => {
      render(<Switch />);
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should accept custom id', () => {
      render(<Switch id="custom-id" />);
      expect(screen.getByRole('switch')).toHaveAttribute('id', 'custom-id');
    });

    it('should accept custom className', () => {
      render(<Switch className="custom-class" />);
      expect(screen.getByRole('switch')).toHaveClass('custom-class');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<React.ElementRef<typeof import('@radix-ui/react-switch').Root>>();
      render(<Switch ref={ref} />);
      expect(ref.current).not.toBeNull();
    });
  });
});
