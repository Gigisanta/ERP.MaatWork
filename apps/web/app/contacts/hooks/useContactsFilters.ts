import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDebouncedValue } from '../../admin/aum/rows/hooks/useDebouncedState';
import type { Contact, PipelineStage, Tag, Advisor } from '@/types';

export function useContactsFilters(
  contacts: Contact[],
  pipelineStages: PipelineStage[],
  allTags: Tag[],
  advisors: Advisor[]
) {
  const searchParams = useSearchParams();
  const advisorIdFilter = searchParams.get('advisorId');
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Get advisor name for filter badge
  const filteredAdvisor = advisorIdFilter && advisors && Array.isArray(advisors) 
    ? (advisors as Advisor[]).find((a: Advisor) => a.id === advisorIdFilter) 
    : null;

  // Filter contacts based on search term, stage, and tags
  const filteredContacts = useMemo(() => {
    if (!Array.isArray(contacts)) return [];
    
    return contacts.filter((contact: Contact) => {
      // Search term filter
      if (debouncedSearchTerm) {
        const searchLower = debouncedSearchTerm.toLowerCase();
        const matchesSearch = 
          contact.fullName?.toLowerCase().includes(searchLower) ||
          contact.email?.toLowerCase().includes(searchLower) ||
          contact.phone?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Stage filter
      if (selectedStage !== 'all') {
        if (contact.pipelineStageId !== selectedStage) return false;
      }
      
      // Tags filter
      if (selectedTags.length > 0) {
        const contactTagIds = contact.tags?.map(t => t.id) || [];
        const hasAllSelectedTags = selectedTags.every(tagId => contactTagIds.includes(tagId));
        if (!hasAllSelectedTags) return false;
      }
      
      return true;
    });
  }, [contacts, debouncedSearchTerm, selectedStage, selectedTags]);

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedStage('all');
    setSelectedTags([]);
  };

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    selectedStage,
    setSelectedStage,
    selectedTags,
    setSelectedTags,
    advisorIdFilter,
    filteredAdvisor,
    filteredContacts,
    handleTagToggle,
    clearAllFilters,
  };
}

