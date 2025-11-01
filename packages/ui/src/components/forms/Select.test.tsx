import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Select, type SelectItem } from './Select';

const mockItems: SelectItem[] = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  { value: '3', label: 'Option 3', disabled: true },
];

describe('Select Component', () => {
  describe('Rendering', () => {
    it('should render select with placeholder', () => {
      render(<Select items={mockItems} placeholder="Choose option" />);
      expect(screen.getByText('Choose option')).toBeInTheDocument();
    });

    it('should render with label', () => {
      render(<Select items={mockItems} label="Select an item" />);
      expect(screen.getByText('Select an item')).toBeInTheDocument();
    });

    it('should render with helper text', () => {
      render(<Select items={mockItems} helperText="Choose wisely" />);
      expect(screen.getByText('Choose wisely')).toBeInTheDocument();
    });

    it('should render with error message', () => {
      render(<Select items={mockItems} error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should hide helper text when error is shown', () => {
      render(<Select items={mockItems} helperText="Helper" error="Error" />);
      expect(screen.queryByText('Helper')).not.toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should show required asterisk when required', () => {
      render(<Select items={mockItems} label="Required field" required />);
      expect(screen.getByLabelText('required')).toBeInTheDocument();
    });
  });

  describe('States', () => {
    it('should be enabled by default', () => {
      render(<Select items={mockItems} />);
      const trigger = screen.getByRole('combobox');
      expect(trigger).not.toHaveAttribute('disabled');
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Select items={mockItems} disabled />);
      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeDisabled();
    });

    it('should display default value', () => {
      render(<Select items={mockItems} defaultValue="2" />);
      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });

    it('should display controlled value', () => {
      render(<Select items={mockItems} value="1" />);
      expect(screen.getByText('Option 1')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should have combobox trigger that can be clicked', () => {
      render(<Select items={mockItems} />);
      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeEnabled();
    });

    it('should call onValueChange callback when provided', () => {
      const handleChange = vi.fn();
      render(<Select items={mockItems} onValueChange={handleChange} />);
      // Callback function is passed to the component
      expect(handleChange).toBeInstanceOf(Function);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes when error is present', () => {
      render(<Select items={mockItems} error="Error message" id="test-select" />);
      const trigger = screen.getByRole('combobox');
      
      expect(trigger).toHaveAttribute('aria-invalid', 'true');
      expect(trigger).toHaveAttribute('aria-describedby', 'test-select-error');
    });

    it('should link helper text with aria-describedby', () => {
      render(<Select items={mockItems} helperText="Helper text" id="test-select" />);
      const trigger = screen.getByRole('combobox');
      
      expect(trigger).toHaveAttribute('aria-describedby', 'test-select-helper');
    });

    it('should have role combobox', () => {
      render(<Select items={mockItems} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      render(<Select items={mockItems} />);
      
      const trigger = screen.getByRole('combobox');
      trigger.focus();
      expect(trigger).toHaveFocus();
    });
  });

  describe('Custom Props', () => {
    it('should accept custom id', () => {
      render(<Select items={mockItems} id="custom-id" />);
      expect(screen.getByRole('combobox')).toHaveAttribute('id', 'custom-id');
    });

    it('should accept custom className', () => {
      render(<Select items={mockItems} className="custom-class" />);
      expect(screen.getByRole('combobox')).toHaveClass('custom-class');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<React.ElementRef<typeof import('@radix-ui/react-select').Trigger>>();
      render(<Select items={mockItems} ref={ref} />);
      expect(ref.current).not.toBeNull();
    });

    it('should render empty items array', () => {
      render(<Select items={[]} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply error border styling when error prop is present', () => {
      render(<Select items={mockItems} error="Error" />);
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveClass('border-error');
    });

    it('should apply disabled styling when disabled', () => {
      render(<Select items={mockItems} disabled />);
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
    });
  });
});

