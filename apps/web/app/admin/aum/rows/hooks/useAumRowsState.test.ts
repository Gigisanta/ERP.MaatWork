/**
 * useAumRowsState Tests
 * 
 * AI_DECISION: Tests completos de hook con reducer pattern
 * Justificación: Verifica todas las acciones y transiciones de estado
 * Impacto: Confianza en lógica de estado crítica
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useAumRowsState } from './useAumRowsState';

describe('useAumRowsState', () => {
  describe('Pagination', () => {
    it('should initialize with default pagination', () => {
      const { result } = renderHook(() => useAumRowsState());
      
      expect(result.current.state.pagination).toEqual({
        limit: 50,
        offset: 0
      });
    });

    it('should update pagination', () => {
      const { result } = renderHook(() => useAumRowsState());
      
      act(() => {
        result.current.actions.setPagination({ limit: 100, offset: 50 });
      });
      
      expect(result.current.state.pagination).toEqual({
        limit: 100,
        offset: 50
      });
    });

    it('should reset offset when filters change', () => {
      const { result } = renderHook(() => useAumRowsState());
      
      act(() => {
        result.current.actions.setPagination({ offset: 50 });
        result.current.actions.setFilters({ broker: 'balanz' });
      });
      
      expect(result.current.state.pagination.offset).toBe(0);
    });
  });

  describe('Filters', () => {
    it('should initialize with default filters', () => {
      const { result } = renderHook(() => useAumRowsState());
      
      expect(result.current.state.filters).toEqual({
        broker: 'all',
        status: 'all'
      });
    });

    it('should update filters', () => {
      const { result } = renderHook(() => useAumRowsState());
      
      act(() => {
        result.current.actions.setFilters({ broker: 'balanz', status: 'matched' });
      });
      
      expect(result.current.state.filters).toEqual({
        broker: 'balanz',
        status: 'matched'
      });
    });

    it('should reset filters', () => {
      const { result } = renderHook(() => useAumRowsState());
      
      act(() => {
        result.current.actions.setFilters({ broker: 'balanz' });
        result.current.actions.resetFilters();
      });
      
      expect(result.current.state.filters).toEqual({
        broker: 'all',
        status: 'all'
      });
    });
  });

  describe('Search', () => {
    it('should update search term', () => {
      const { result } = renderHook(() => useAumRowsState());
      
      act(() => {
        result.current.actions.setSearchTerm('test search');
      });
      
      expect(result.current.state.search.term).toBe('test search');
    });

    it('should update debounced search', () => {
      const { result } = renderHook(() => useAumRowsState());
      
      act(() => {
        result.current.actions.setDebouncedSearch('debounced');
      });
      
      expect(result.current.state.search.debounced).toBe('debounced');
    });

    it('should reset offset when debounced search changes', () => {
      const { result } = renderHook(() => useAumRowsState());
      
      act(() => {
        result.current.actions.setPagination({ offset: 100 });
        result.current.actions.setDebouncedSearch('search term');
      });
      
      expect(result.current.state.pagination.offset).toBe(0);
    });
  });

  describe('Modals', () => {
    it('should open and close duplicate modal', () => {
      const { result } = renderHook(() => useAumRowsState());
      
      act(() => {
        result.current.actions.openDuplicateModal('12345');
      });
      
      expect(result.current.state.modals.duplicate.open).toBe(true);
      expect(result.current.state.modals.duplicate.accountNumber).toBe('12345');
      
      act(() => {
        result.current.actions.closeDuplicateModal();
      });
      
      expect(result.current.state.modals.duplicate.open).toBe(false);
      expect(result.current.state.modals.duplicate.accountNumber).toBeNull();
    });

    it('should open and close advisor modal', () => {
      const { result } = renderHook(() => useAumRowsState());
      const mockRow = { id: '123', holderName: 'Test' } as any;
      
      act(() => {
        result.current.actions.openAdvisorModal(mockRow);
      });
      
      expect(result.current.state.modals.advisor.open).toBe(true);
      expect(result.current.state.modals.advisor.row).toEqual(mockRow);
      
      act(() => {
        result.current.actions.closeAdvisorModal();
      });
      
      expect(result.current.state.modals.advisor.open).toBe(false);
      expect(result.current.state.modals.advisor.row).toBeNull();
    });
  });

  describe('Loading states', () => {
    it('should set loading states', () => {
      const { result } = renderHook(() => useAumRowsState());
      
      act(() => {
        result.current.actions.setLoading('cleaning', true);
      });
      
      expect(result.current.state.loading.cleaning).toBe(true);
      
      act(() => {
        result.current.actions.setLoading('cleaning', false);
      });
      
      expect(result.current.state.loading.cleaning).toBe(false);
    });
  });

  describe('File upload', () => {
    it('should set uploaded file ID', () => {
      const { result } = renderHook(() => useAumRowsState());
      
      act(() => {
        result.current.actions.setUploadedFileId('file-123');
      });
      
      expect(result.current.state.uploadedFileId).toBe('file-123');
    });

    it('should accept initial file ID', () => {
      const { result } = renderHook(() => useAumRowsState('initial-file'));
      
      expect(result.current.state.uploadedFileId).toBe('initial-file');
    });
  });
});

