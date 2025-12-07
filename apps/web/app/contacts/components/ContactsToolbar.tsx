/**
 * Contacts Toolbar
 * 
 * Filter bar with search, stage/tag filters, view toggle, and action buttons
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button, Badge, Icon, Spinner } from '@cactus/ui';
import SearchAutocomplete from './SearchAutocomplete';
import type { PipelineStage, Tag, Advisor } from '@/types';

// Lazy load FiltersDropdown
const FiltersDropdown = dynamic(() => import('./FiltersDropdown'), {
  ssr: false,
  loading: () => (
    <div className="shrink-0">
      <Button variant="outline" size="sm" disabled>
        <Spinner size="sm" />
      </Button>
    </div>
  )
});

export interface ContactsToolbarProps {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedStage: string;
  selectedTags: string[];
  pipelineStages: PipelineStage[];
  allTags: Tag[];
  onStageChange: (stage: string) => void;
  onTagToggle: (tagId: string) => void;
  onManageTagsClick: () => void;
  viewMode: 'table' | 'kanban';
  onViewModeChange: (mode: 'table' | 'kanban') => void;
  advisorIdFilter: string | null;
  filteredAdvisor: Advisor | null;
  onClearAdvisorFilter: () => void;
  onClearAllFilters: () => void;
}

export default function ContactsToolbar({
  searchInputRef,
  searchTerm,
  onSearchChange,
  selectedStage,
  selectedTags,
  pipelineStages,
  allTags,
  onStageChange,
  onTagToggle,
  onManageTagsClick,
  viewMode,
  onViewModeChange,
  advisorIdFilter,
  filteredAdvisor,
  onClearAdvisorFilter,
  onClearAllFilters
}: ContactsToolbarProps) {
  const router = useRouter();
  const hasActiveFilters = selectedStage !== 'all' || selectedTags.length > 0 || searchTerm || advisorIdFilter;

  return (
    <div className="sticky top-0 z-10 bg-surface border border-border rounded-md shadow-sm">
      <div className="p-2 md:p-3">
        <div className="flex flex-col gap-2">
          {/* First row: Controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Search input with autocomplete */}
            <div className="relative w-[220px] shrink-0">
              <SearchAutocomplete
                inputRef={searchInputRef}
                placeholder="Buscar contactos... (Ctrl+K)"
                value={searchTerm}
                onChange={onSearchChange}
                size="sm"
                className="w-full"
              />
            </div>

            {/* Filters dropdown */}
            <FiltersDropdown
              selectedStage={selectedStage}
              selectedTags={selectedTags}
              pipelineStages={pipelineStages}
              allTags={allTags}
              onStageChange={onStageChange}
              onTagToggle={onTagToggle}
              onManageTagsClick={onManageTagsClick}
            />

            {/* View mode toggle */}
            <div className="shrink-0 flex items-center border border-border rounded-md overflow-hidden bg-surface-hover p-0.5">
              <button
                onClick={() => onViewModeChange('table')}
                className={`px-2 py-1 text-xs font-medium flex items-center gap-1 transition-all rounded ${
                  viewMode === 'table'
                    ? 'bg-surface text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text'
                }`}
                aria-pressed={viewMode === 'table'}
                aria-label="Vista de tabla"
              >
                <Icon name="list" size={14} />
                <span className="hidden sm:inline">Tabla</span>
              </button>
              <div className="w-px h-4 bg-border mx-0.5" aria-hidden="true" />
              <button
                onClick={() => onViewModeChange('kanban')}
                className={`px-2 py-1 text-xs font-medium flex items-center gap-1 transition-all rounded ${
                  viewMode === 'kanban'
                    ? 'bg-surface text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text'
                }`}
                aria-pressed={viewMode === 'kanban'}
                aria-label="Vista kanban"
              >
                <Icon name="grid" size={14} />
                <span className="hidden sm:inline">Kanban</span>
              </button>
            </div>

            {/* Action buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/automations')}
              title="Abrir Automatizaciones"
            >
              <Icon name="Settings" size={16} className="mr-1.5" />
              Automatizaciones
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/contacts/metrics')}
            >
              Métricas
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/contacts/new')}
            >
              <Icon name="plus" size={16} className="mr-1.5" />
              Nuevo Contacto
            </Button>
          </div>

          {/* Second row: Active filter chips */}
          {hasActiveFilters && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-border">
              {advisorIdFilter && filteredAdvisor && (
                <Badge className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs">
                  Asesor: {filteredAdvisor?.fullName || filteredAdvisor?.email || 'Desconocido'}
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
                  Etapa: {pipelineStages.find((s) => s.id === selectedStage)?.name ?? ''}
                  <button 
                    onClick={() => onStageChange('all')}
                    className="ml-0.5 hover:opacity-70"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {selectedTags.map(tagId => {
                const tag = allTags.find((t) => t.id === tagId);
                return tag ? (
                  <Badge 
                    key={tagId} 
                    className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs"
                    style={{ backgroundColor: tag.color, color: 'white' }}
                  >
                    {tag.name}
                    <button 
                      onClick={() => onTagToggle(tagId)}
                      className="ml-0.5 hover:opacity-70"
                    >
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

