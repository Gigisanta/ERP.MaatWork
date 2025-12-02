/**
 * Hook especializado para manejar paginación de AUM rows
 */

import { useReducer, useCallback } from 'react';

export interface AumPaginationState {
  limit: number;
  offset: number;
}

type AumPaginationAction =
  | { type: 'SET_PAGINATION'; payload: { limit?: number; offset?: number } }
  | { type: 'RESET_PAGINATION' };

const initialPaginationState: AumPaginationState = {
  limit: 50,
  offset: 0,
};

function aumPaginationReducer(
  state: AumPaginationState,
  action: AumPaginationAction
): AumPaginationState {
  switch (action.type) {
    case 'SET_PAGINATION':
      return {
        ...state,
        ...action.payload,
      };
    case 'RESET_PAGINATION':
      return initialPaginationState;
    default:
      return state;
  }
}

export function useAumPagination() {
  const [pagination, dispatch] = useReducer(aumPaginationReducer, initialPaginationState);

  const setPagination = useCallback((payload: { limit?: number; offset?: number }) => {
    dispatch({ type: 'SET_PAGINATION', payload });
  }, []);

  const resetPagination = useCallback(() => {
    dispatch({ type: 'RESET_PAGINATION' });
  }, []);

  return {
    pagination,
    setPagination,
    resetPagination,
  };
}
