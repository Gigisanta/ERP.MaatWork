/**
 * Hook especializado para manejar búsqueda de AUM rows
 */

import { useReducer, useCallback } from 'react';

interface AumSearchState {
  term: string;
  debounced: string;
}

type AumSearchAction =
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_DEBOUNCED_SEARCH'; payload: string };

const initialSearchState: AumSearchState = {
  term: '',
  debounced: '',
};

function aumSearchReducer(state: AumSearchState, action: AumSearchAction): AumSearchState {
  switch (action.type) {
    case 'SET_SEARCH_TERM':
      return {
        ...state,
        term: action.payload,
      };
    case 'SET_DEBOUNCED_SEARCH':
      return {
        ...state,
        debounced: action.payload,
      };
    default:
      return state;
  }
}

export function useAumSearch() {
  const [search, dispatch] = useReducer(aumSearchReducer, initialSearchState);

  const setSearchTerm = useCallback((term: string) => {
    dispatch({ type: 'SET_SEARCH_TERM', payload: term });
  }, []);

  const setDebouncedSearch = useCallback((term: string) => {
    dispatch({ type: 'SET_DEBOUNCED_SEARCH', payload: term });
  }, []);

  return {
    search,
    setSearchTerm,
    setDebouncedSearch,
  };
}
