/**
 * Hook for managing contacts page filter state
 * 
 * Handles search, stage, tag filters and URL sync
 */

import { useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedValue } from '../../admin/aum/rows/hooks/useDebouncedState';
import type { Contact, PipelineStage, Tag, Advisor } from '@/types';

export interface ContactsFiltersState {
  searchTerm: string;
  debouncedSearchTerm: string;
  selectedStage: string;
  selectedTags: string[];
  viewMode: 'table' | 'kanban';
  advisorIdFilter: string | null;
  filteredAdvisor: Advisor | null;
}

export interface ContactsFiltersActions {
  setSearchTerm: (term: string) => void;
  setSelectedStage: (stage: string) => void;
  handleTagToggle: (tagId: string) => void;
  setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>;
  setViewMode: (mode: 'table' | 'kanban') => void;
  clearAllFilters: () => void;
  clearAdvisorFilter: () => void;
}

export interface UseContactsFiltersProps {
  advisors?: Advisor[];
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

  return {
    // State
    searchTerm,
    debouncedSearchTerm,
    selectedStage,
    selectedTags,
    viewMode,
    advisorIdFilter,
    filteredAdvisor,
    // Actions
    setSearchTerm,
    setSelectedStage,
    handleTagToggle,
    setSelectedTags,
    setViewMode,
    clearAllFilters,
    clearAdvisorFilter
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
