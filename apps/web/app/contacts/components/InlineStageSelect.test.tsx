import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InlineStageSelect from './InlineStageSelect';
import { moveContactToStage, getNextPipelineStage } from '@/lib/api/pipeline';
import { logger } from '@/lib/logger';

vi.mock('@/lib/api/pipeline', () => ({
  moveContactToStage: vi.fn(),
  getNextPipelineStage: vi.fn(),
}));

vi.mock('@/lib/logger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/logger')>();
  return {
    ...actual,
    logger: {
      error: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    },
  };
});

describe('InlineStageSelect', () => {
  const mockPipelineStages = [
    { id: 'stage-1', name: 'Prospecto', color: '#FF0000', order: 1 },
    { id: 'stage-2', name: 'Cliente', color: '#00FF00', order: 2 },
  ];

  const mockContact = {
    id: 'contact-1',
    firstName: 'John',
    lastName: 'Doe',
    pipelineStageId: 'stage-1',
  } as any;

  const defaultProps = {
    contact: mockContact,
    pipelineStages: mockPipelineStages,
    isSaving: false,
    onStageChange: vi.fn(),
    onMutate: vi.fn(),
    onError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getNextPipelineStage as any).mockReturnValue(mockPipelineStages[1]);
  });

  it('debería mostrar nombre de etapa actual', () => {
    render(<InlineStageSelect {...defaultProps} />);

    expect(screen.getByText('Prospecto')).toBeInTheDocument();
  });

  it('debería mostrar "Sin etapa" cuando no hay etapa asignada', () => {
    render(
      <InlineStageSelect {...defaultProps} contact={{ ...mockContact, pipelineStageId: null }} />
    );

    expect(screen.getByText(/Sin etapa/i)).toBeInTheDocument();
  });

  it('debería mostrar spinner cuando está guardando', () => {
    render(<InlineStageSelect {...defaultProps} isSaving={true} />);

    expect(screen.getByText(/Guardando/i)).toBeInTheDocument();
  });

  it('debería mostrar botón avanzar cuando hay siguiente etapa', () => {
    render(<InlineStageSelect {...defaultProps} />);

    // El botón avanzar debería estar presente
    const advanceButton = screen.getByTitle(/Avanzar/i);
    expect(advanceButton).toBeInTheDocument();
  });

  it('debería llamar moveContactToStage cuando se avanza etapa', async () => {
    (moveContactToStage as any).mockResolvedValue({ success: true });

    render(<InlineStageSelect {...defaultProps} />);

    const advanceButton = screen.getByTitle(/Avanzar/i);
    fireEvent.click(advanceButton);

    await waitFor(() => {
      expect(moveContactToStage).toHaveBeenCalledWith('contact-1', 'stage-2');
    });
  });

  it('debería mostrar confirmación cuando se intenta cambiar a etapa Cliente', async () => {
    render(<InlineStageSelect {...defaultProps} />);

    // Abrir dropdown y seleccionar etapa Cliente
    const stageButton = screen.getByText('Prospecto');
    fireEvent.click(stageButton);

    // Buscar y hacer click en Cliente
    const clienteOption = screen.getByText('Cliente');
    fireEvent.click(clienteOption);

    // Debería mostrar diálogo de confirmación
    await waitFor(() => {
      expect(screen.getByText(/Confirmar cambio a Cliente/i)).toBeInTheDocument();
    });
  });
});
