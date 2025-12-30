/**
 * Hook especializado para manejar modales de AUM rows
 */

import { useReducer, useCallback } from 'react';
import type { AumRow } from '@/types';

export interface AumModalsState {
  duplicate: {
    open: boolean;
    accountNumber: string | null;
  };
  advisor: {
    open: boolean;
    row: AumRow | null;
  };
}

type AumModalsAction =
  | { type: 'OPEN_DUPLICATE_MODAL'; payload: string }
  | { type: 'CLOSE_DUPLICATE_MODAL' }
  | { type: 'OPEN_ADVISOR_MODAL'; payload: AumRow }
  | { type: 'CLOSE_ADVISOR_MODAL' };

const initialModalsState: AumModalsState = {
  duplicate: {
    open: false,
    accountNumber: null,
  },
  advisor: {
    open: false,
    row: null,
  },
};

function aumModalsReducer(state: AumModalsState, action: AumModalsAction): AumModalsState {
  switch (action.type) {
    case 'OPEN_DUPLICATE_MODAL':
      return {
        ...state,
        duplicate: {
          open: true,
          accountNumber: action.payload,
        },
      };
    case 'CLOSE_DUPLICATE_MODAL':
      return {
        ...state,
        duplicate: {
          open: false,
          accountNumber: null,
        },
      };
    case 'OPEN_ADVISOR_MODAL':
      return {
        ...state,
        advisor: {
          open: true,
          row: action.payload,
        },
      };
    case 'CLOSE_ADVISOR_MODAL':
      return {
        ...state,
        advisor: {
          open: false,
          row: null,
        },
      };
    default:
      return state;
  }
}

export function useAumModals() {
  const [modals, dispatch] = useReducer(aumModalsReducer, initialModalsState);

  const openDuplicateModal = useCallback((accountNumber: string) => {
    dispatch({ type: 'OPEN_DUPLICATE_MODAL', payload: accountNumber });
  }, []);

  const closeDuplicateModal = useCallback(() => {
    dispatch({ type: 'CLOSE_DUPLICATE_MODAL' });
  }, []);

  const openAdvisorModal = useCallback((row: AumRow) => {
    dispatch({ type: 'OPEN_ADVISOR_MODAL', payload: row });
  }, []);

  const closeAdvisorModal = useCallback(() => {
    dispatch({ type: 'CLOSE_ADVISOR_MODAL' });
  }, []);

  return {
    modals,
    openDuplicateModal,
    closeDuplicateModal,
    openAdvisorModal,
    closeAdvisorModal,
  };
}
