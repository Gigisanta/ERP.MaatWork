/**
 * Hook especializado para manejar filtros de AUM rows
 */

import { useReducer, useCallback } from 'react';

export interface AumFiltersState {
  broker: string;
  status: string;
}

type AumFiltersAction =
  | { type: 'SET_FILTERS'; payload: { broker?: string; status?: string } }
  | { type: 'RESET_FILTERS' };

const initialFiltersState: AumFiltersState = {
  broker: 'all',
  status: 'all',
};

function aumFiltersReducer(state: AumFiltersState, action: AumFiltersAction): AumFiltersState {
  switch (action.type) {
    case 'SET_FILTERS':
      return {
        ...state,
        ...action.payload,
      };
    case 'RESET_FILTERS':
      return initialFiltersState;
    default:
      return state;
  }
}

export function useAumFilters() {
  const [filters, dispatch] = useReducer(aumFiltersReducer, initialFiltersState);

  const setFilters = useCallback((payload: { broker?: string; status?: string }) => {
    dispatch({ type: 'SET_FILTERS', payload });
  }, []);

  const resetFilters = useCallback(() => {
    dispatch({ type: 'RESET_FILTERS' });
  }, []);

  return {
    filters,
    setFilters,
    resetFilters,
  };
}



























