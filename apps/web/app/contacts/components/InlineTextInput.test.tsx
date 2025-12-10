import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InlineTextInput from './InlineTextInput';

describe('InlineTextInput', () => {
  const mockContact = {
    id: 'contact-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  } as any;

  const defaultProps = {
    contact: mockContact,
    field: 'firstName',
    placeholder: 'Nombre',
    isSaving: false,
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería mostrar valor del campo cuando no está editando', () => {
    render(<InlineTextInput {...defaultProps} />);

    expect(screen.getByText('John')).toBeInTheDocument();
  });

  it('debería mostrar placeholder cuando el campo está vacío', () => {
    render(
      <InlineTextInput
        {...defaultProps}
        contact={{ ...mockContact, firstName: '' }}
        placeholder="Nombre"
      />
    );

    expect(screen.getByText('Nombre')).toBeInTheDocument();
  });

  it('debería mostrar input cuando se hace click', () => {
    render(<InlineTextInput {...defaultProps} />);

    const display = screen.getByText('John');
    fireEvent.click(display);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('debería llamar onSave cuando se presiona Enter', async () => {
    const onSave = vi.fn();
    render(<InlineTextInput {...defaultProps} onSave={onSave} />);

    const display = screen.getByText('John');
    fireEvent.click(display);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Jane' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('contact-1', 'firstName', 'Jane');
    });
  });

  it('debería cancelar edición cuando se presiona Escape', () => {
    render(<InlineTextInput {...defaultProps} />);

    const display = screen.getByText('John');
    fireEvent.click(display);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Jane' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('debería llamar onSave cuando se hace blur', async () => {
    const onSave = vi.fn();
    render(<InlineTextInput {...defaultProps} onSave={onSave} />);

    const display = screen.getByText('John');
    fireEvent.click(display);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Jane' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('contact-1', 'firstName', 'Jane');
    });
  });

  it('debería mostrar spinner cuando está guardando', () => {
    render(<InlineTextInput {...defaultProps} isSaving={true} />);

    expect(screen.getByText(/Guardando/i)).toBeInTheDocument();
  });

  it('debería no guardar si el valor no cambió', () => {
    const onSave = vi.fn();
    render(<InlineTextInput {...defaultProps} onSave={onSave} />);

    const display = screen.getByText('John');
    fireEvent.click(display);

    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('debería actualizar valor cuando cambia el contacto', () => {
    const { rerender } = render(<InlineTextInput {...defaultProps} />);

    expect(screen.getByText('John')).toBeInTheDocument();

    rerender(<InlineTextInput {...defaultProps} contact={{ ...mockContact, firstName: 'Jane' }} />);

    expect(screen.getByText('Jane')).toBeInTheDocument();
  });
});
