'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Icon, Badge } from '@cactus/ui';
import { useSearchShortcut } from '@/hooks/useKeyboardShortcuts';
import FiltersDropdown from './FiltersDropdown';
import type { PipelineStage, Tag } from '@/types';

interface ContactsFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedStage: string;
  selectedTags: string[];
  pipelineStages: PipelineStage[];
  allTags: Tag[];
  advisorIdFilter: string | null;
  filteredAdvisor: { name: string } | null;
  onStageChange: (stage: string) => void;
  onTagToggle: (tagId: string) => void;
  onClearStage: () => void;
  onClearTag: (tagId: string) => void;
  onClearAdvisorFilter: () => void;
  onClearAllFilters: () => void;
  onManageTagsClick: () => void;
}

export default function ContactsFilters({
  searchTerm,
  onSearchChange,
  selectedStage,
  selectedTags,
  pipelineStages,
  allTags,
  advisorIdFilter,
  filteredAdvisor,
  onStageChange,
  onTagToggle,
  onClearStage,
  onClearTag,
  onClearAdvisorFilter,
  onClearAllFilters,
  onManageTagsClick,
}: ContactsFiltersProps) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  useSearchShortcut(searchInputRef as React.RefObject<HTMLInputElement>, true);

  return (
    <div className="sticky top-0 z-10 bg-white border border-neutral-200 rounded-md shadow-sm">
      <div className="p-2 md:p-3">
        <div className="flex flex-col gap-2">
          {/* Primera fila: Controles en línea horizontal */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Input de búsqueda compacto con icono */}
            <div className="relative w-[200px] shrink-0">
              <Input
                ref={searchInputRef}
                placeholder="Buscar contactos... (Ctrl+K)"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                leftIcon="search"
                size="sm"
                className="w-full"
              />
            </div>

            {/* Filtros unificados: Etapas y Etiquetas */}
            <FiltersDropdown
              selectedStage={selectedStage}
              selectedTags={selectedTags}
              pipelineStages={pipelineStages}
              allTags={allTags}
              onStageChange={onStageChange}
              onTagToggle={onTagToggle}
              onManageTagsClick={onManageTagsClick}
            />

            {/* Botón Automatizaciones */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/automations')}
              title="Abrir Automatizaciones"
            >
              <Icon name="Settings" size={16} className="mr-1.5" />
              Automatizaciones
            </Button>

            {/* Botón Métricas */}
            <Button variant="outline" size="sm" onClick={() => router.push('/contacts/metrics')}>
              Métricas
            </Button>

            {/* Botón Nuevo Contacto */}
            <Button variant="outline" size="sm" onClick={() => router.push('/contacts/new')}>
              <Icon name="plus" size={16} className="mr-1.5" />
              Nuevo Contacto
            </Button>
          </div>

          {/* Segunda fila: Badges de filtros activos */}
          {(filteredAdvisor || selectedStage !== 'all' || selectedTags.length > 0) && (
            <div className="flex items-center gap-1 flex-wrap">
              {filteredAdvisor && (
                <Badge className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs">
                  Asesor: {filteredAdvisor.name}
                  <button
                    onClick={onClearAdvisorFilter}
                    className="ml-0.5 hover:opacity-70"
                    aria-label="Remover filtro de asesor"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {selectedStage !== 'all' && (
                <Badge className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs">
                  Etapa: {pipelineStages.find((s) => s.id === selectedStage)?.name || ''}
                  <button onClick={onClearStage} className="ml-0.5 hover:opacity-70">
                    ×
                  </button>
                </Badge>
              )}
              {selectedTags.map((tagId) => {
                const tag = allTags.find((t) => t.id === tagId);
                return tag ? (
                  <Badge
                    key={tagId}
                    className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs"
                    style={{ backgroundColor: tag.color, color: 'white' }}
                  >
                    {tag.name}
                    <button onClick={() => onClearTag(tagId)} className="ml-0.5 hover:opacity-70">
                      ×
                    </button>
                  </Badge>
                ) : null;
              })}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAllFilters}
                className="text-xs h-6 px-2"
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
