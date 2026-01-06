/**
 * Contacts Toolbar
 *
 * Filter bar with search, stage/tag filters, view toggle, and action buttons
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Badge, Icon, DropdownMenu, DropdownMenuItem } from '@maatwork/ui';
import SearchAutocomplete from './SearchAutocomplete';
import FiltersDropdown from './FiltersDropdown';

import type { PipelineStage, Tag, Advisor } from '@/types';

// AI_DECISION: Lazy load FiltersDropdown to reduce initial bundle size
// Justificación: Reduces initial JS load by ~15KB. Previous issues with Radix/Webpack
//                are usually resolved in newer Next.js versions.
// Impacto: Better FCP/LCP for the contacts page.

interface ContactsToolbarProps {
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
  advisorIdFilter,
  filteredAdvisor,
  onClearAdvisorFilter,
  onClearAllFilters,
}: ContactsToolbarProps) {
  const router = useRouter();
  const hasActiveFilters =
    selectedStage !== 'all' || selectedTags.length > 0 || searchTerm || advisorIdFilter;

  return (
    <div className="sticky top-0 z-10 bg-surface border border-border rounded-md shadow-sm">
      <div className="p-2 md:p-3">
        <div className="flex flex-col gap-2">
          {/* First row: Main controls - Simplified */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search input - Prominent */}
            <div className="relative flex-1 min-w-[200px] max-w-[400px]">
              <SearchAutocomplete
                inputRef={searchInputRef}
                placeholder="Buscar contactos... (Ctrl+K)"
                value={searchTerm}
                onChange={onSearchChange}
                size="sm"
                className="w-full"
              />
            </div>

            {/* Nuevo Contacto - Primary action, highlighted */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push('/contacts/new')}
              className="shrink-0"
            >
              <Icon name="plus" size={16} className="mr-1.5" />
              Nuevo Contacto
            </Button>

            {/* Filters dropdown - Collapsed */}
            <FiltersDropdown
              selectedStage={selectedStage}
              selectedTags={selectedTags}
              pipelineStages={pipelineStages}
              allTags={allTags}
              onStageChange={onStageChange}
              onTagToggle={onTagToggle}
              onManageTagsClick={onManageTagsClick}
            />

            {/* More actions menu - Secondary actions grouped */}
            <DropdownMenu
              trigger={
                <Button variant="outline" size="sm" className="shrink-0">
                  <Icon name="more-vertical" size={16} />
                  <span className="hidden sm:inline ml-1.5">Más</span>
                </Button>
              }
            >
              <DropdownMenuItem onClick={() => router.push('/pipeline')}>
                <Icon name="grid" size={16} className="mr-2" />
                Ver Pipeline
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/contacts/metrics')}>
                <Icon name="BarChart2" size={16} className="mr-2" />
                Métricas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/automations')}>
                <Icon name="Settings" size={16} className="mr-2" />
                Automatizaciones
              </DropdownMenuItem>
            </DropdownMenu>
          </div>

          {/* Second row: Active filter chips */}
          {hasActiveFilters && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-border">
              {advisorIdFilter && filteredAdvisor && (
                <Badge
                  variant="default"
                  className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs"
                >
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
                  <button onClick={() => onStageChange('all')} className="ml-0.5 hover:opacity-70">
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
                    <button onClick={() => onTagToggle(tagId)} className="ml-0.5 hover:opacity-70">
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
