/**
 * AumFiltersBar Component Tests
 *
 * AI_DECISION: Tests de UI component con Testing Library
 * Justificación: Verifica interacción del usuario y llamadas a callbacks
 * Impacto: Confianza en comportamiento de filtros
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';
import { AumFiltersBar } from './AumFiltersBar';

describe('AumFiltersBar', () => {
  const defaultProps = {
    broker: 'all',
    status: 'all',
    searchTerm: '',
    onlyUpdated: false,
    onBrokerChange: vi.fn(),
    onStatusChange: vi.fn(),
    onSearchChange: vi.fn(),
    onOnlyUpdatedChange: vi.fn(),
  };

  it('renders all filter controls', () => {
    render(<AumFiltersBar {...defaultProps} />);

    // Check for select elements (by their placeholder text if visible)
    expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument();
    expect(screen.getByText(/solo actualizados/i)).toBeInTheDocument();
  });

  it('calls onSearchChange when typing in search input', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();

    render(<AumFiltersBar {...defaultProps} onSearchChange={onSearchChange} />);

    const searchInput = screen.getByPlaceholderText(/buscar/i);
    await user.type(searchInput, 'test');

    expect(onSearchChange).toHaveBeenCalled();
  });

  it('calls onOnlyUpdatedChange when checkbox is toggled', async () => {
    const user = userEvent.setup();
    const onOnlyUpdatedChange = vi.fn();

    render(<AumFiltersBar {...defaultProps} onOnlyUpdatedChange={onOnlyUpdatedChange} />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    expect(onOnlyUpdatedChange).toHaveBeenCalledWith(true);
  });

  it('displays current search term', () => {
    render(<AumFiltersBar {...defaultProps} searchTerm="cuenta 12345" />);

    const searchInput = screen.getByPlaceholderText(/buscar/i) as HTMLInputElement;
    expect(searchInput.value).toBe('cuenta 12345');
  });

  it('shows checked state for onlyUpdated', () => {
    render(<AumFiltersBar {...defaultProps} onlyUpdated={true} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('data-state', 'checked');
  });
});
