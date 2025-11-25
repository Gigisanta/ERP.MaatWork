/**
 * useAumRowsState Hook
 * 
 * AI_DECISION: Consolidar 10+ estados en un reducer pattern con acciones claras
 * Justificación: Reducer pattern simplifica manejo de estado complejo y mejora testability
 * Impacto: Código más mantenible, predecible y fácil de testear
 */

import { useReducer, useCallback } from 'react';
import type { Row } from '@/types';

// ==========================================================
// Types
// ==========================================================

export interface AumRowsState {
  // Pagination
  pagination: {
    limit: number;
    offset: number;
  };

  // Filters
  filters: {
    broker: string;
    status: string;
  };

  // Search
  search: {
    term: string;
    debounced: string;
  };

  // File upload
  uploadedFileId: string | null;

  // Flags
  onlyUpdated: boolean;

  // Modals
  modals: {
    duplicate: {
      open: boolean;
      accountNumber: string | null;
    };
    advisor: {
      open: boolean;
      row: Row | null;
    };
  };

  // Loading states
  loading: {
    cleaning: boolean;
    resetting: boolean;
    waitingUpload: boolean;
  };
}

// ==========================================================
// Actions
// ==========================================================

type AumRowsAction =
  | { type: 'SET_PAGINATION'; payload: { limit?: number; offset?: number } }
  | { type: 'SET_FILTERS'; payload: { broker?: string; status?: string } }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_DEBOUNCED_SEARCH'; payload: string }
  | { type: 'SET_UPLOADED_FILE_ID'; payload: string | null }
  | { type: 'SET_ONLY_UPDATED'; payload: boolean }
  | { type: 'OPEN_DUPLICATE_MODAL'; payload: string }
  | { type: 'CLOSE_DUPLICATE_MODAL' }
  | { type: 'OPEN_ADVISOR_MODAL'; payload: Row }
  | { type: 'CLOSE_ADVISOR_MODAL' }
  | { type: 'SET_LOADING'; payload: { key: keyof AumRowsState['loading']; value: boolean } }
  | { type: 'RESET_FILTERS' }
  | { type: 'RESET_PAGINATION' };

// ==========================================================
// Initial State
// ==========================================================

const initialState: AumRowsState = {
  pagination: {
    limit: 50,
    offset: 0
  },
  filters: {
    broker: 'all',
    status: 'all'
  },
  search: {
    term: '',
    debounced: ''
  },
  uploadedFileId: null,
  onlyUpdated: false,
  modals: {
    duplicate: {
      open: false,
      accountNumber: null
    },
    advisor: {
      open: false,
      row: null
    }
  },
  loading: {
    cleaning: false,
    resetting: false,
    waitingUpload: false
  }
};

// ==========================================================
// Reducer
// ==========================================================

function aumRowsReducer(state: AumRowsState, action: AumRowsAction): AumRowsState {
  switch (action.type) {
    case 'SET_PAGINATION':
      return {
        ...state,
        pagination: {
          ...state.pagination,
          ...action.payload
        }
      };

    case 'SET_FILTERS':
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload
        },
        // Reset pagination when filters change
        pagination: {
          ...state.pagination,
          offset: 0
        }
      };

    case 'SET_SEARCH_TERM':
      return {
        ...state,
        search: {
          ...state.search,
          term: action.payload
        }
      };

    case 'SET_DEBOUNCED_SEARCH':
      return {
        ...state,
        search: {
          ...state.search,
          debounced: action.payload
        },
        // Reset pagination when search changes
        pagination: {
          ...state.pagination,
          offset: 0
        }
      };

    case 'SET_UPLOADED_FILE_ID':
      return {
        ...state,
        uploadedFileId: action.payload
      };

    case 'SET_ONLY_UPDATED':
      return {
        ...state,
        onlyUpdated: action.payload
      };

    case 'OPEN_DUPLICATE_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          duplicate: {
            open: true,
            accountNumber: action.payload
          }
        }
      };

    case 'CLOSE_DUPLICATE_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          duplicate: {
            open: false,
            accountNumber: null
          }
        }
      };

    case 'OPEN_ADVISOR_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          advisor: {
            open: true,
            row: action.payload
          }
        }
      };

    case 'CLOSE_ADVISOR_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          advisor: {
            open: false,
            row: null
          }
        }
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value
        }
      };

    case 'RESET_FILTERS':
      return {
        ...state,
        filters: initialState.filters,
        search: initialState.search,
        onlyUpdated: initialState.onlyUpdated,
        uploadedFileId: null,
        pagination: initialState.pagination
      };

    case 'RESET_PAGINATION':
      return {
        ...state,
        pagination: initialState.pagination
      };

    default:
      return state;
  }
}

// ==========================================================
// Hook
// ==========================================================

export function useAumRowsState(initialFileId?: string | null) {
  const [state, dispatch] = useReducer(aumRowsReducer, {
    ...initialState,
    uploadedFileId: initialFileId || null
  });

  // Action creators with useCallback for stable references
  const setPagination = useCallback((pagination: { limit?: number; offset?: number }) => {
    dispatch({ type: 'SET_PAGINATION', payload: pagination });
  }, []);

  const setFilters = useCallback((filters: { broker?: string; status?: string }) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const setSearchTerm = useCallback((term: string) => {
    dispatch({ type: 'SET_SEARCH_TERM', payload: term });
  }, []);

  const setDebouncedSearch = useCallback((term: string) => {
    dispatch({ type: 'SET_DEBOUNCED_SEARCH', payload: term });
  }, []);

  const setUploadedFileId = useCallback((fileId: string | null) => {
    dispatch({ type: 'SET_UPLOADED_FILE_ID', payload: fileId });
  }, []);

  const setOnlyUpdated = useCallback((value: boolean) => {
    dispatch({ type: 'SET_ONLY_UPDATED', payload: value });
  }, []);

  const openDuplicateModal = useCallback((accountNumber: string) => {
    dispatch({ type: 'OPEN_DUPLICATE_MODAL', payload: accountNumber });
  }, []);

  const closeDuplicateModal = useCallback(() => {
    dispatch({ type: 'CLOSE_DUPLICATE_MODAL' });
  }, []);

  const openAdvisorModal = useCallback((row: Row) => {
    dispatch({ type: 'OPEN_ADVISOR_MODAL', payload: row });
  }, []);

  const closeAdvisorModal = useCallback(() => {
    dispatch({ type: 'CLOSE_ADVISOR_MODAL' });
  }, []);

  const setLoading = useCallback((key: keyof AumRowsState['loading'], value: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: { key, value } });
  }, []);

  const resetFilters = useCallback(() => {
    dispatch({ type: 'RESET_FILTERS' });
  }, []);

  const resetPagination = useCallback(() => {
    dispatch({ type: 'RESET_PAGINATION' });
  }, []);

  return {
    state,
    actions: {
      setPagination,
      setFilters,
      setSearchTerm,
      setDebouncedSearch,
      setUploadedFileId,
      setOnlyUpdated,
      openDuplicateModal,
      closeDuplicateModal,
      openAdvisorModal,
      closeAdvisorModal,
      setLoading,
      resetFilters,
      resetPagination
    }
  };
}

