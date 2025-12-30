import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FiltersDropdown from './FiltersDropdown';

interface MockComponentProps {
  children?: React.ReactNode;
  [key: string]: unknown;
}

// Mock Radix UI DropdownMenu to avoid Portal issues in tests
vi.mock('@radix-ui/react-dropdown-menu', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@radix-ui/react-dropdown-menu')>();
  return {
    ...actual,
    Root: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
      <div data-testid="dropdown-root" data-state={open ? 'open' : 'closed'}>
        {children}
      </div>
    ),
    Trigger: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="dropdown-trigger">{children}</div>
    ),
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Content: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="dropdown-content">{children}</div>
    ),
    RadioGroup: ({
      children,
      onValueChange,
    }: {
      children: React.ReactNode;
      onValueChange: (v: string) => void;
    }) => (
      <div
        data-testid="radio-group"
        onClick={(e: React.MouseEvent) => {
          const target = (e.target as HTMLElement).closest('[data-value]');
          if (target) onValueChange(target.getAttribute('data-value') || '');
        }}
      >
        {children}
      </div>
    ),
    RadioItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
      <div data-value={value}>{children}</div>
    ),
    CheckboxItem: ({
      children,
      checked,
      onCheckedChange,
    }: {
      children: React.ReactNode;
      checked: boolean;
      onCheckedChange: (c: boolean) => void;
    }) => <div onClick={() => onCheckedChange(!checked)}>{children}</div>,
    ItemIndicator: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Item: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
      <div onClick={onClick}>{children}</div>
    ),
  };
});

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

    expect(screen.getAllByText(/Todas las etapas/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Etiquetas/i).length).toBeGreaterThan(0);
  });

  it('debería mostrar badge cuando hay filtros activos', () => {
    render(<FiltersDropdown {...defaultProps} selectedStage="stage-1" selectedTags={['tag-1']} />);

    // Debería mostrar badge con número de filtros activos
    const badge = screen.getByText('2');
    expect(badge).toBeInTheDocument();
  });

  it('debería mostrar nombre de etapa cuando está seleccionada', () => {
    render(<FiltersDropdown {...defaultProps} selectedStage="stage-1" />);

    expect(screen.getAllByText(/Prospecto/i).length).toBeGreaterThan(0);
  });

  it('debería mostrar contador de etiquetas cuando hay seleccionadas', () => {
    render(<FiltersDropdown {...defaultProps} selectedTags={['tag-1', 'tag-2']} />);

    expect(screen.getAllByText(/Etiquetas \(2\)/i).length).toBeGreaterThan(0);
  });

  it('debería llamar onStageChange cuando se selecciona una etapa', async () => {
    const onStageChange = vi.fn();
    render(<FiltersDropdown {...defaultProps} onStageChange={onStageChange} />);

    // Abrir dropdown y hacer click en etapa
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    // Buscar y hacer click en una etapa (usamos el del dropdown content)
    const stageOptions = await screen.findAllByText('Prospecto');
    fireEvent.click(stageOptions[0]);

    expect(onStageChange).toHaveBeenCalledWith('stage-1');
  });

  it('debería llamar onTagToggle cuando se hace toggle de etiqueta', async () => {
    const onTagToggle = vi.fn();
    render(<FiltersDropdown {...defaultProps} onTagToggle={onTagToggle} />);

    // Abrir dropdown
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    // Buscar y hacer click en una etiqueta
    const tagOptions = await screen.findAllByText('VIP');
    fireEvent.click(tagOptions[0]);

    expect(onTagToggle).toHaveBeenCalledWith('tag-1');
  });

  it('debería llamar onManageTagsClick cuando se hace click en gestionar etiquetas', async () => {
    const onManageTagsClick = vi.fn();
    render(<FiltersDropdown {...defaultProps} onManageTagsClick={onManageTagsClick} />);

    // Abrir dropdown
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    // Buscar y hacer click en gestionar etiquetas
    const manageOption = await screen.findByText(/Gestionar etiquetas/i);
    fireEvent.click(manageOption);

    expect(onManageTagsClick).toHaveBeenCalled();
  });

  it('debería mostrar mensaje cuando no hay etiquetas disponibles', async () => {
    render(<FiltersDropdown {...defaultProps} allTags={[]} />);

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    expect(await screen.findByText(/No hay etiquetas disponibles/i)).toBeInTheDocument();
  });

  it('debería mostrar todas las etapas en el dropdown', async () => {
    render(<FiltersDropdown {...defaultProps} />);

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    expect((await screen.findAllByText('Todas las etapas')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Prospecto')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Cliente')).length).toBeGreaterThan(0);
  });
});
