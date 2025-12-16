'use client';

import React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
// AI_DECISION: Importar componentes en un solo statement para simplificar resoluci?n de webpack
// Justificaci?n: Webpack tiene problemas resolviendo @cactus/ui cuando hay m?ltiples imports separados
// Impacto: Un solo import statement ayuda a webpack a resolver todos los m?dulos de una vez
import { Button, Icon, Text, Badge } from '@cactus/ui';
// Utility function para combinar clases (similar a cn de @cactus/ui)
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
import type { PipelineStage, Tag } from '@/types';

export interface FiltersDropdownProps {
  selectedStage: string;
  selectedTags: string[];
  pipelineStages: PipelineStage[];
  allTags: Tag[];
  onStageChange: (stageId: string) => void;
  onTagToggle: (tagId: string) => void;
  onManageTagsClick: () => void;
}

// AI_DECISION: Componente unificado para optimizar espacio en barra de filtros
// Justificaci?n: Combina dos selectores separados en un solo dropdown con dos columnas
// Impacto: Reduce espacio horizontal, mejora UX con filtros relacionados agrupados
function FiltersDropdownComponent({
  selectedStage,
  selectedTags,
  pipelineStages,
  allTags,
  onStageChange,
  onTagToggle,
  onManageTagsClick,
}: FiltersDropdownProps) {
  // Calcular texto del trigger basado en selecciones
  const getTriggerText = () => {
    const stageText =
      selectedStage === 'all'
        ? 'Todas las etapas'
        : pipelineStages.find((s) => s.id === selectedStage)?.name || 'Etapas';

    const tagsCount = selectedTags.length;
    const tagsText = tagsCount > 0 ? `Etiquetas (${tagsCount})` : 'Etiquetas';

    return `${stageText} • ${tagsText}`;
  };

  const triggerText = getTriggerText();
  const hasActiveFilters = selectedStage !== 'all' || selectedTags.length > 0;

  return (
    <div className="shrink-0">
      <DropdownMenuPrimitive.Root>
        <DropdownMenuPrimitive.Trigger asChild>
          <Button variant="outline" size="sm">
            <span className="text-sm">{triggerText}</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] px-1.5 text-xs">
                {selectedTags.length + (selectedStage !== 'all' ? 1 : 0)}
              </Badge>
            )}
            <Icon name="chevron-down" size={16} className="ml-2" />
          </Button>
        </DropdownMenuPrimitive.Trigger>
        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.Content
            align="start"
            side="bottom"
            sideOffset={4}
            className={cn(
              'z-50 min-w-[400px] overflow-hidden rounded-md border border-border',
              'bg-background p-1 text-text shadow-md',
              'animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2',
              'data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2',
              'data-[side=top]:slide-in-from-bottom-2'
            )}
          >
            {/* Contenedor con dos columnas */}
            <div className="grid grid-cols-2 gap-0">
              {/* Columna izquierda: Etapas */}
              <div className="border-r border-border pr-2">
                <DropdownMenuPrimitive.Label className="px-2 py-1.5 text-xs font-semibold text-text-secondary uppercase">
                  Etapas
                </DropdownMenuPrimitive.Label>
                <DropdownMenuPrimitive.RadioGroup
                  value={selectedStage}
                  onValueChange={onStageChange}
                >
                  <DropdownMenuPrimitive.RadioItem
                    value="all"
                    className={cn(
                      'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                      'transition-colors focus:bg-surface-hover focus:text-text',
                      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
                    )}
                  >
                    <div className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      <DropdownMenuPrimitive.ItemIndicator>
                        <Icon name="check" size={14} />
                      </DropdownMenuPrimitive.ItemIndicator>
                    </div>
                    <Text size="sm" className="pl-6">
                      Todas las etapas
                    </Text>
                  </DropdownMenuPrimitive.RadioItem>
                  {Array.isArray(pipelineStages) && pipelineStages.length > 0 && (
                    <>
                      <DropdownMenuPrimitive.Separator className="my-1 h-px bg-border" />
                      {pipelineStages.map((stage: PipelineStage) => (
                        <DropdownMenuPrimitive.RadioItem
                          key={stage.id}
                          value={stage.id}
                          className={cn(
                            'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                            'transition-colors focus:bg-surface-hover focus:text-text',
                            'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
                          )}
                        >
                          <div className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                            <DropdownMenuPrimitive.ItemIndicator>
                              <Icon name="check" size={14} />
                            </DropdownMenuPrimitive.ItemIndicator>
                          </div>
                          <div className="flex items-center w-full pl-6">
                            <div
                              className="w-3 h-3 rounded-full mr-2 shrink-0"
                              style={{ backgroundColor: stage.color || '#6B7280' }}
                            />
                            <Text size="sm">{stage.name}</Text>
                          </div>
                        </DropdownMenuPrimitive.RadioItem>
                      ))}
                    </>
                  )}
                </DropdownMenuPrimitive.RadioGroup>
              </div>

              {/* Columna derecha: Etiquetas */}
              <div className="pl-2">
                <DropdownMenuPrimitive.Label className="px-2 py-1.5 text-xs font-semibold text-text-secondary uppercase">
                  Etiquetas
                </DropdownMenuPrimitive.Label>
                <div className="max-h-[300px] overflow-y-auto">
                  {Array.isArray(allTags) && allTags.length > 0 ? (
                    allTags.map((tag: Tag) => (
                      <DropdownMenuPrimitive.CheckboxItem
                        key={tag.id}
                        checked={selectedTags.includes(tag.id)}
                        onCheckedChange={() => onTagToggle(tag.id)}
                        className={cn(
                          'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                          'transition-colors focus:bg-surface-hover focus:text-text',
                          'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
                        )}
                      >
                        <div className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                          <DropdownMenuPrimitive.ItemIndicator>
                            <Icon name="check" size={14} />
                          </DropdownMenuPrimitive.ItemIndicator>
                        </div>
                        <div className="flex items-center w-full pl-6">
                          <div
                            className="w-3 h-3 rounded-full mr-2 shrink-0"
                            style={{ backgroundColor: tag.color || '#6B7280' }}
                          />
                          <Text size="sm">{tag.name}</Text>
                        </div>
                      </DropdownMenuPrimitive.CheckboxItem>
                    ))
                  ) : (
                    <div className="px-2 py-2">
                      <Text size="sm" color="secondary">
                        No hay etiquetas disponibles
                      </Text>
                    </div>
                  )}
                </div>
                {Array.isArray(allTags) && allTags.length > 0 && (
                  <>
                    <DropdownMenuPrimitive.Separator className="my-1 h-px bg-border" />
                    <DropdownMenuPrimitive.Item
                      onClick={onManageTagsClick}
                      className={cn(
                        'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                        'transition-colors focus:bg-surface-hover focus:text-text',
                        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
                      )}
                    >
                      <Icon name="edit" size={16} className="mr-2" />
                      <Text size="sm">Gestionar etiquetas</Text>
                    </DropdownMenuPrimitive.Item>
                  </>
                )}
              </div>
            </div>
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>
    </div>
  );
}

const FiltersDropdown = React.memo(FiltersDropdownComponent);
FiltersDropdown.displayName = 'FiltersDropdown';

export default FiltersDropdown;
