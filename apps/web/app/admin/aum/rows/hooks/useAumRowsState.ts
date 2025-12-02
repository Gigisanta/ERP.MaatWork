/**
 * useAumRowsState Hook - Orquestador
 *
 * AI_DECISION: Refactorizar hook grande (340 líneas) en hooks especializados
 * Justificación: Mejora mantenibilidad, testabilidad y separación de responsabilidades
 * Impacto: Código más modular, fácil de entender y mantener
 */

import { useState, useCallback } from 'react';
import { useAumPagination } from './useAumPagination';
import { useAumFilters } from './useAumFilters';
import { useAumSearch } from './useAumSearch';
import { useAumModals, type AumModalsState } from './useAumModals';
import { useAumLoading, type AumLoadingState } from './useAumLoading';

// Re-export types for backward compatibility
export type { AumPaginationState } from './useAumPagination';
export type { AumFiltersState } from './useAumFilters';
export type { AumSearchState } from './useAumSearch';
export type { AumModalsState } from './useAumModals';
export type { AumLoadingState } from './useAumLoading';

export interface AumRowsState {
  pagination: {
    limit: number;
    offset: number;
  };
  filters: {
    broker: string;
    status: string;
  };
  search: {
    term: string;
    debounced: string;
  };
  uploadedFileId: string | null;
  onlyUpdated: boolean;
  modals: AumModalsState;
  loading: AumLoadingState;
}

export function useAumRowsState(initialFileId?: string | null) {
  // Specialized hooks
  const { pagination, setPagination, resetPagination } = useAumPagination();
  const { filters, setFilters, resetFilters: resetFiltersInternal } = useAumFilters();
  const { search, setSearchTerm, setDebouncedSearch } = useAumSearch();
  const { modals, openDuplicateModal, closeDuplicateModal, openAdvisorModal, closeAdvisorModal } =
    useAumModals();
  const { loading, setLoading } = useAumLoading();

  // Local state for file upload and flags
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(initialFileId || null);
  const [onlyUpdated, setOnlyUpdated] = useState(false);

  // Composite state for backward compatibility
  const state: AumRowsState = {
    pagination,
    filters,
    search,
    uploadedFileId,
    onlyUpdated,
    modals,
    loading,
  };

  // Action creators with useCallback for stable references
  const setUploadedFileIdAction = useCallback((fileId: string | null) => {
    setUploadedFileId(fileId);
  }, []);

  const setOnlyUpdatedAction = useCallback((value: boolean) => {
    setOnlyUpdated(value);
  }, []);

  // Enhanced resetFilters that also resets pagination and search
  const resetFilters = useCallback(() => {
    resetFiltersInternal();
    resetPagination();
    setSearchTerm('');
    setDebouncedSearch('');
    setOnlyUpdated(false);
    setUploadedFileId(null);
  }, [resetFiltersInternal, resetPagination, setSearchTerm, setDebouncedSearch]);

  // Enhanced setFilters that resets pagination
  const setFiltersWithReset = useCallback(
    (payload: { broker?: string; status?: string }) => {
      setFilters(payload);
      resetPagination();
    },
    [setFilters, resetPagination]
  );

  // Enhanced setDebouncedSearch that resets pagination
  const setDebouncedSearchWithReset = useCallback(
    (term: string) => {
      setDebouncedSearch(term);
      resetPagination();
    },
    [setDebouncedSearch, resetPagination]
  );

  return {
    state,
    actions: {
      setPagination,
      setFilters: setFiltersWithReset,
      setSearchTerm,
      setDebouncedSearch: setDebouncedSearchWithReset,
      setUploadedFileId: setUploadedFileIdAction,
      setOnlyUpdated: setOnlyUpdatedAction,
      openDuplicateModal,
      closeDuplicateModal,
      openAdvisorModal,
      closeAdvisorModal,
      setLoading,
      resetFilters,
      resetPagination,
    },
  };
}
