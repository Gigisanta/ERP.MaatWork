/**
 * Hook for managing contacts page filter state
 * 
 * AI_DECISION: Hook centralizado para filtros con soporte para vistas guardadas
 * Justificación: Permite a usuarios guardar y reutilizar combinaciones de filtros
 * Impacto: Mejor productividad, flujos de trabajo repetitivos más rápidos
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedValue } from '../../admin/aum/rows/hooks/useDebouncedState';
import type { Contact, PipelineStage, Tag, Advisor } from '@/types';

const SAVED_VIEWS_KEY = 'contacts_saved_views';
const MAX_SAVED_VIEWS = 10;

/**
 * Saved filter view
 */
export interface SavedView {
  id: string;
  name: string;
  filters: {
    searchTerm: string;
    selectedStage: string;
    selectedTags: string[];
    viewMode: 'table' | 'kanban';
  };
  createdAt: string;
}

export interface ContactsFiltersState {
  searchTerm: string;
  debouncedSearchTerm: string;
  selectedStage: string;
  selectedTags: string[];
  viewMode: 'table' | 'kanban';
  advisorIdFilter: string | null;
  filteredAdvisor: Advisor | null;
  savedViews: SavedView[];
}

export interface ContactsFiltersActions {
  setSearchTerm: (term: string) => void;
  setSelectedStage: (stage: string) => void;
  handleTagToggle: (tagId: string) => void;
  setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>;
  setViewMode: (mode: 'table' | 'kanban') => void;
  clearAllFilters: () => void;
  clearAdvisorFilter: () => void;
  // Saved views actions
  saveCurrentView: (name: string) => SavedView;
  loadSavedView: (viewId: string) => void;
  deleteSavedView: (viewId: string) => void;
  renameSavedView: (viewId: string, newName: string) => void;
}

export interface UseContactsFiltersProps {
  advisors?: Advisor[];
}

/**
 * Get saved views from localStorage
 */
function getSavedViews(): SavedView[] {
  if (typeof window === 'undefined') return [];
  try {
    const views = localStorage.getItem(SAVED_VIEWS_KEY);
    return views ? JSON.parse(views) : [];
  } catch {
    return [];
  }
}

/**
 * Save views to localStorage
 */
function persistSavedViews(views: SavedView[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));
  } catch {
    // Ignore storage errors
  }
}

export function useContactsFilters({ advisors }: UseContactsFiltersProps): ContactsFiltersState & ContactsFiltersActions {
  const router = useRouter();
  const searchParams = useSearchParams();
  const advisorIdFilter = searchParams.get('advisorId');

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);

  // Load saved views on mount
  useEffect(() => {
    setSavedViews(getSavedViews());
  }, []);

  // Get advisor name for filter badge
  const filteredAdvisor = useMemo(() => {
    if (!advisorIdFilter || !advisors || !Array.isArray(advisors)) return null;
    return advisors.find((a: Advisor) => a.id === advisorIdFilter) ?? null;
  }, [advisorIdFilter, advisors]);

  const handleTagToggle = useCallback((tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedStage('all');
    setSelectedTags([]);
    // Clear advisor filter from URL
    if (advisorIdFilter) {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('advisorId');
      router.push(`/contacts?${newSearchParams.toString()}`);
    }
  }, [advisorIdFilter, searchParams, router]);

  const clearAdvisorFilter = useCallback(() => {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.delete('advisorId');
    router.push(`/contacts?${newSearchParams.toString()}`);
  }, [searchParams, router]);

  // Save current filters as a named view
  const saveCurrentView = useCallback((name: string): SavedView => {
    const newView: SavedView = {
      id: `view_${Date.now()}`,
      name: name.trim(),
      filters: {
        searchTerm,
        selectedStage,
        selectedTags,
        viewMode,
      },
      createdAt: new Date().toISOString(),
    };

    const updatedViews = [newView, ...savedViews].slice(0, MAX_SAVED_VIEWS);
    setSavedViews(updatedViews);
    persistSavedViews(updatedViews);
    
    return newView;
  }, [searchTerm, selectedStage, selectedTags, viewMode, savedViews]);

  // Load a saved view
  const loadSavedView = useCallback((viewId: string) => {
    const view = savedViews.find(v => v.id === viewId);
    if (!view) return;

    setSearchTerm(view.filters.searchTerm);
    setSelectedStage(view.filters.selectedStage);
    setSelectedTags(view.filters.selectedTags);
    setViewMode(view.filters.viewMode);
  }, [savedViews]);

  // Delete a saved view
  const deleteSavedView = useCallback((viewId: string) => {
    const updatedViews = savedViews.filter(v => v.id !== viewId);
    setSavedViews(updatedViews);
    persistSavedViews(updatedViews);
  }, [savedViews]);

  // Rename a saved view
  const renameSavedView = useCallback((viewId: string, newName: string) => {
    const updatedViews = savedViews.map(v => 
      v.id === viewId ? { ...v, name: newName.trim() } : v
    );
    setSavedViews(updatedViews);
    persistSavedViews(updatedViews);
  }, [savedViews]);

  return {
    // State
    searchTerm,
    debouncedSearchTerm,
    selectedStage,
    selectedTags,
    viewMode,
    advisorIdFilter,
    filteredAdvisor,
    savedViews,
    // Actions
    setSearchTerm,
    setSelectedStage,
    handleTagToggle,
    setSelectedTags,
    setViewMode,
    clearAllFilters,
    clearAdvisorFilter,
    // Saved views actions
    saveCurrentView,
    loadSavedView,
    deleteSavedView,
    renameSavedView,
  };
}

/**
 * Filter contacts based on search, stage and tags
 */
export function filterContacts(
  contacts: Contact[] | undefined,
  searchTerm: string,
  selectedStage: string,
  selectedTags: string[]
): Contact[] {
  if (!Array.isArray(contacts)) return [];
  
  return contacts.filter((contact: Contact) => {
    const matchesSearch = contact.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = selectedStage === 'all' || contact.pipelineStageId === selectedStage;
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tagId => contact.tags?.some(tag => tag.id === tagId));
    
    return matchesSearch && matchesStage && matchesTags;
  });
}
