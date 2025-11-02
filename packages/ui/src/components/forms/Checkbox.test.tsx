import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './Checkbox';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';

describe('Checkbox Component', () => {
  describe('Rendering', () => {
    it('should render checkbox', () => {
      render(<Checkbox />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('should render with label', () => {
      render(<Checkbox label="Accept terms" />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(screen.getByText('Accept terms')).toBeInTheDocument();
    });

    it('should render with helper text', () => {
      render(<Checkbox label="Subscribe" helperText="Get weekly updates" />);
      expect(screen.getByText('Get weekly updates')).toBeInTheDocument();
    });

    it('should render with error message', () => {
      render(<Checkbox label="Agree" error="You must agree to continue" />);
      expect(screen.getByText('You must agree to continue')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should hide helper text when error is shown', () => {
      render(<Checkbox helperText="Helper" error="Error message" />);
      expect(screen.queryByText('Helper')).not.toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('States', () => {
    it('should be unchecked by default', () => {
      render(<Checkbox />);
      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('should be checked when defaultChecked is true', () => {
      render(<Checkbox defaultChecked={true} />);
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Checkbox disabled={true} />);
      expect(screen.getByRole('checkbox')).toBeDisabled();
    });

    it('should show indeterminate state', () => {
      render(<Checkbox indeterminate />);
      // Indeterminate is visual only, checkbox should still be present
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should toggle when clicked', async () => {
      const user = userEvent.setup();
      render(<Checkbox />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
      
      await user.click(checkbox);
      expect(checkbox).toBeChecked();
      
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('should call onCheckedChange when toggled', async () => {
      const handleChange = vi.fn<(checked: boolean) => void>();
      const user = userEvent.setup();
      
      render(<Checkbox onCheckedChange={handleChange} />);
      
      await user.click(screen.getByRole('checkbox'));
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('should toggle when label is clicked', async () => {
      const user = userEvent.setup();
      render(<Checkbox label="Click me" />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
      
      await user.click(screen.getByText('Click me'));
      expect(checkbox).toBeChecked();
    });

    it('should not toggle when disabled', async () => {
      const handleChange = vi.fn<(checked: boolean) => void>();
      const user = userEvent.setup();
      
      render(<Checkbox disabled={true} onCheckedChange={handleChange} />);
      
      await user.click(screen.getByRole('checkbox'));
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes when error is present', () => {
      render(<Checkbox error="Error message" />);
      const checkbox = screen.getByRole('checkbox');
      
      expect(checkbox).toHaveAttribute('aria-invalid', 'true');
      expect(checkbox).toHaveAttribute('aria-describedby');
    });

    it('should link helper text with aria-describedby', () => {
      render(<Checkbox helperText="Helper text" id="test-checkbox" />);
      const checkbox = screen.getByRole('checkbox');
      
      expect(checkbox).toHaveAttribute('aria-describedby', 'test-checkbox-helper');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<Checkbox label="Keyboard test" />);
      
      const checkbox = screen.getByRole('checkbox');
      checkbox.focus();
      expect(checkbox).toHaveFocus();
      
      await user.keyboard(' ');
      expect(checkbox).toBeChecked();
    });

    it('should have focus styles', () => {
      render(<Checkbox />);
      const checkbox = screen.getByRole('checkbox');
      
      expect(checkbox).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-primary');
    });
  });

  describe('Custom Props', () => {
    it('should accept custom id', () => {
      render(<Checkbox id="custom-id" />);
      expect(screen.getByRole('checkbox')).toHaveAttribute('id', 'custom-id');
    });

    it('should accept custom className', () => {
      render(<Checkbox className="custom-class" />);
      expect(screen.getByRole('checkbox')).toHaveClass('custom-class');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<React.ElementRef<typeof CheckboxPrimitive.Root>>();
      render(<Checkbox ref={ref} />);
      expect(ref.current).not.toBeNull();
    });
  });
});

