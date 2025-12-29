/**
 * Tests para ConfirmDialog component
 *
 * AI_DECISION: Tests para componente de confirmación reutilizable
 * Justificación: Validar comportamiento de modal de confirmación
 * Impacto: Prevenir errores en confirmaciones críticas
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('debería renderizar cuando está abierto', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirmar acción"
      />
    );

    expect(screen.getByText(/Confirmar acción/i)).toBeInTheDocument();
  });

  it('NO debería renderizar cuando está cerrado', () => {
    render(
      <ConfirmDialog
        open={false}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirmar acción"
      />
    );

    expect(screen.queryByText(/Confirmar acción/i)).not.toBeInTheDocument();
  });

  it('debería mostrar descripción cuando se proporciona', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirmar acción"
        description="¿Estás seguro?"
      />
    );

    expect(screen.getByText(/¿Estás seguro?/i)).toBeInTheDocument();
  });

  it('debería llamar onConfirm al hacer click en confirmar', () => {
    const mockOnConfirm = vi.fn();
    const mockOnOpenChange = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
        title="Confirmar acción"
      />
    );

    const confirmButton = screen.getByRole('button', { name: /^Confirmar$/i });
    fireEvent.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('debería cerrar al hacer click en cancelar', () => {
    const mockOnOpenChange = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={vi.fn()}
        title="Confirmar acción"
      />
    );

    const cancelButton = screen.getByText(/Cancelar/i);
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('debería usar labels personalizados', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirmar acción"
        confirmLabel="Aceptar"
        cancelLabel="Rechazar"
      />
    );

    expect(screen.getByText(/Aceptar/i)).toBeInTheDocument();
    expect(screen.getByText(/Rechazar/i)).toBeInTheDocument();
  });

  it('debería aplicar variant danger', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        title="Eliminar"
        variant="danger"
      />
    );

    const confirmButton = screen.getByRole('button', { name: /^Confirmar$/i });
    expect(confirmButton).toHaveClass('bg-red-600');
  });
});
