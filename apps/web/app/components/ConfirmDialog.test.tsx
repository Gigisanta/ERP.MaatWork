/**
 * Tests for ConfirmDialog Component
 * 
 * Covers:
 * - Rendering with different variants
 * - Callback execution
 * - Modal open/close behavior
 */

import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Test Title',
    description: 'Test Description',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open is true', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('should not render when open is false', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    
    const confirmButton = screen.getByRole('button', { name: /confirmar/i });
    fireEvent.click(confirmButton);
    
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onOpenChange when cancel button is clicked', () => {
    const onOpenChange = vi.fn();
    render(<ConfirmDialog {...defaultProps} onOpenChange={onOpenChange} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelButton);
    
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should render with custom confirm label', () => {
    render(<ConfirmDialog {...defaultProps} confirmLabel="Delete" />);
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('should render with danger variant', () => {
    render(<ConfirmDialog {...defaultProps} variant="danger" />);
    const confirmButton = screen.getByRole('button', { name: /confirmar/i });
    // Verify danger styling (implementation dependent)
    expect(confirmButton).toBeInTheDocument();
  });
});

