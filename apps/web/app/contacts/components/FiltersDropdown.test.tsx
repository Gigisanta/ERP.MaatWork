import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FiltersDropdown from './FiltersDropdown';

describe('FiltersDropdown', () => {
  const mockPipelineStages = [
    { id: 'stage-1', name: 'Prospecto', color: '#FF0000' },
    { id: 'stage-2', name: 'Cliente', color: '#00FF00' },
  ];

  const mockTags = [
    { id: 'tag-1', name: 'VIP', color: '#0000FF' },
    { id: 'tag-2', name: 'Hot', color: '#FFFF00' },
  ];

  const defaultProps = {
    selectedStage: 'all',
    selectedTags: [],
    pipelineStages: mockPipelineStages,
    allTags: mockTags,
    onStageChange: vi.fn(),
    onTagToggle: vi.fn(),
    onManageTagsClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar trigger con texto correcto cuando no hay filtros', () => {
    render(<FiltersDropdown {...defaultProps} />);

    expect(screen.getByText(/Todas las etapas/i)).toBeInTheDocument();
    expect(screen.getByText(/Etiquetas/i)).toBeInTheDocument();
  });

  it('debería mostrar badge cuando hay filtros activos', () => {
    render(<FiltersDropdown {...defaultProps} selectedStage="stage-1" selectedTags={['tag-1']} />);

    // Debería mostrar badge con número de filtros activos
    const badge = screen.getByText('2');
    expect(badge).toBeInTheDocument();
  });

  it('debería mostrar nombre de etapa cuando está seleccionada', () => {
    render(<FiltersDropdown {...defaultProps} selectedStage="stage-1" />);

    expect(screen.getByText(/Prospecto/i)).toBeInTheDocument();
  });

  it('debería mostrar contador de etiquetas cuando hay seleccionadas', () => {
    render(<FiltersDropdown {...defaultProps} selectedTags={['tag-1', 'tag-2']} />);

    expect(screen.getByText(/Etiquetas \(2\)/i)).toBeInTheDocument();
  });

  it('debería llamar onStageChange cuando se selecciona una etapa', () => {
    const onStageChange = vi.fn();
    render(<FiltersDropdown {...defaultProps} onStageChange={onStageChange} />);

    // Abrir dropdown y hacer click en etapa
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    // Buscar y hacer click en una etapa
    const stageOption = screen.getByText('Prospecto');
    fireEvent.click(stageOption);

    expect(onStageChange).toHaveBeenCalledWith('stage-1');
  });

  it('debería llamar onTagToggle cuando se hace toggle de etiqueta', () => {
    const onTagToggle = vi.fn();
    render(<FiltersDropdown {...defaultProps} onTagToggle={onTagToggle} />);

    // Abrir dropdown
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    // Buscar y hacer click en una etiqueta
    const tagOption = screen.getByText('VIP');
    fireEvent.click(tagOption);

    expect(onTagToggle).toHaveBeenCalledWith('tag-1');
  });

  it('debería llamar onManageTagsClick cuando se hace click en gestionar etiquetas', () => {
    const onManageTagsClick = vi.fn();
    render(<FiltersDropdown {...defaultProps} onManageTagsClick={onManageTagsClick} />);

    // Abrir dropdown
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    // Buscar y hacer click en gestionar etiquetas
    const manageOption = screen.getByText(/Gestionar etiquetas/i);
    fireEvent.click(manageOption);

    expect(onManageTagsClick).toHaveBeenCalled();
  });

  it('debería mostrar mensaje cuando no hay etiquetas disponibles', () => {
    render(<FiltersDropdown {...defaultProps} allTags={[]} />);

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    expect(screen.getByText(/No hay etiquetas disponibles/i)).toBeInTheDocument();
  });

  it('debería mostrar todas las etapas en el dropdown', () => {
    render(<FiltersDropdown {...defaultProps} />);

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    expect(screen.getByText('Todas las etapas')).toBeInTheDocument();
    expect(screen.getByText('Prospecto')).toBeInTheDocument();
    expect(screen.getByText('Cliente')).toBeInTheDocument();
  });
});
