import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InlineTagsEditor from './InlineTagsEditor';
import { useRouter } from 'next/navigation';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

describe('InlineTagsEditor', () => {
  const mockRouter = {
    push: vi.fn(),
  };

  const mockContact = {
    id: 'contact-1',
    firstName: 'John',
    lastName: 'Doe',
    tags: [],
  } as any;

  const mockTags = [
    { id: 'tag-1', name: 'VIP', color: '#0000FF', businessLine: null },
    { id: 'tag-2', name: 'Zurich', color: '#FF0000', businessLine: 'zurich' },
  ];

  const defaultProps = {
    contact: mockContact,
    allTags: mockTags,
    isSaving: false,
    onTagsChange: vi.fn(),
    onManageTagsClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue(mockRouter);
  });

  it('debería mostrar botón para agregar etiquetas', () => {
    render(<InlineTagsEditor {...defaultProps} />);

    const addButton = screen.getByRole('button');
    expect(addButton).toBeInTheDocument();
  });

  it('debería mostrar etiquetas del contacto', () => {
    render(
      <InlineTagsEditor {...defaultProps} contact={{ ...mockContact, tags: [mockTags[0]] }} />
    );

    expect(screen.getByText('VIP')).toBeInTheDocument();
  });

  it('debería llamar onTagsChange cuando se agrega etiqueta', async () => {
    const onTagsChange = vi.fn();
    render(<InlineTagsEditor {...defaultProps} onTagsChange={onTagsChange} />);

    // Abrir dropdown
    const addButton = screen.getByRole('button');
    fireEvent.click(addButton);

    // Seleccionar etiqueta
    const tagOption = screen.getByText('VIP');
    fireEvent.click(tagOption);

    await waitFor(() => {
      expect(onTagsChange).toHaveBeenCalledWith('contact-1', ['tag-1'], []);
    });
  });

  it('debería llamar onTagsChange cuando se remueve etiqueta', async () => {
    const onTagsChange = vi.fn();
    render(
      <InlineTagsEditor
        {...defaultProps}
        contact={{ ...mockContact, tags: [mockTags[0]] }}
        onTagsChange={onTagsChange}
      />
    );

    // Abrir dropdown
    const addButton = screen.getByRole('button');
    fireEvent.click(addButton);

    // Deseleccionar etiqueta (ya está seleccionada)
    const tagOption = screen.getByText('VIP');
    fireEvent.click(tagOption);

    await waitFor(() => {
      expect(onTagsChange).toHaveBeenCalledWith('contact-1', [], ['tag-1']);
    });
  });

  it('debería navegar cuando se hace click en etiqueta Zurich', () => {
    render(
      <InlineTagsEditor {...defaultProps} contact={{ ...mockContact, tags: [mockTags[1]] }} />
    );

    const zurichTag = screen.getByText('Zurich');
    fireEvent.click(zurichTag);

    expect(mockRouter.push).toHaveBeenCalledWith('/contacts/contact-1/tags/tag-2');
  });

  it('debería mostrar spinner cuando está guardando', () => {
    render(<InlineTagsEditor {...defaultProps} isSaving={true} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('debería llamar onManageTagsClick cuando se hace click en gestionar', () => {
    const onManageTagsClick = vi.fn();
    render(<InlineTagsEditor {...defaultProps} onManageTagsClick={onManageTagsClick} />);

    // Abrir dropdown
    const addButton = screen.getByRole('button');
    fireEvent.click(addButton);

    // Buscar y hacer click en gestionar
    const manageOption = screen.getByText(/Gestionar etiquetas/i);
    fireEvent.click(manageOption);

    expect(onManageTagsClick).toHaveBeenCalled();
  });
});
