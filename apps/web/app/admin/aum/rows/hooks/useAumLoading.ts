/**
 * Hook especializado para manejar estados de carga de AUM rows
 */

import { useReducer, useCallback } from 'react';

export interface AumLoadingState {
  cleaning: boolean;
  resetting: boolean;
  waitingUpload: boolean;
}

type AumLoadingAction = {
  type: 'SET_LOADING';
  payload: { key: keyof AumLoadingState; value: boolean };
};

const initialLoadingState: AumLoadingState = {
  cleaning: false,
  resetting: false,
  waitingUpload: false,
};

function aumLoadingReducer(state: AumLoadingState, action: AumLoadingAction): AumLoadingState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        [action.payload.key]: action.payload.value,
      };
    default:
      return state;
  }
}

export function useAumLoading() {
  const [loading, dispatch] = useReducer(aumLoadingReducer, initialLoadingState);

  const setLoading = useCallback((key: keyof AumLoadingState, value: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: { key, value } });
  }, []);

  return {
    loading,
    setLoading,
  };
}








