/**
 * Tests para useBenchmarks hook
 *
 * AI_DECISION: Tests para hook de gestión de benchmarks
 * Justificación: Validar fetching, creación, actualización y eliminación de benchmarks
 * Impacto: Prevenir errores en gestión de benchmarks
 */
import { useEntityWithComponents } from './useEntityWithComponents';
import { useRequireAuth } from '@/auth/useRequireAuth';
import {
  getBenchmarks,
  getBenchmarkComponentsBatch,
  createBenchmark,
  updateBenchmark,
  deleteBenchmark,
} from '@/lib/api';

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBenchmarks } from './useBenchmarks';

// Mock dependencies
vi.mock('./useEntityWithComponents', () => ({
  useEntityWithComponents: vi.fn(),
}));

vi.mock('../../auth/useRequireAuth', () => ({
  useRequireAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com', role: 'admin' },
    loading: false,
  })),
}));

vi.mock('@/lib/api', () => ({
  getBenchmarks: vi.fn(),
  getBenchmarkComponentsBatch: vi.fn(),
  createBenchmark: vi.fn(),
  updateBenchmark: vi.fn(),
  deleteBenchmark: vi.fn(),
}));

describe('useBenchmarks', () => {
  const mockUseEntityWithComponents = vi.fn();
  const mockUseRequireAuth = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    useEntityWithComponents.mockImplementation(mockUseEntityWithComponents);

    mockUseRequireAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com', role: 'admin' },
      loading: false,
    });
    useRequireAuth.mockImplementation(mockUseRequireAuth);
  });

  it('debería retornar benchmarks y funciones de gestión', () => {
    mockUseEntityWithComponents.mockReturnValue({
      entities: [{ id: 'bench-1', code: 'MERVAL', name: 'Merval Index' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      createEntity: vi.fn(),
      updateEntity: vi.fn(),
      deleteEntity: vi.fn(),
    });

    const { result } = renderHook(() => useBenchmarks());

    expect(result.current.benchmarks).toBeDefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.canManageBenchmarks).toBe(true);
    expect(result.current.createBenchmark).toBeDefined();
    expect(result.current.updateBenchmark).toBeDefined();
    expect(result.current.deleteBenchmark).toBeDefined();
  });

  it('debería permitir gestión para admin', () => {
    mockUseEntityWithComponents.mockReturnValue({
      entities: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      createEntity: vi.fn(),
      updateEntity: vi.fn(),
      deleteEntity: vi.fn(),
    });

    mockUseRequireAuth.mockReturnValue({
      user: { id: 'user-1', role: 'admin' },
      loading: false,
    });

    const { result } = renderHook(() => useBenchmarks());

    expect(result.current.canManageBenchmarks).toBe(true);
  });

  it('debería permitir gestión para manager', () => {
    mockUseEntityWithComponents.mockReturnValue({
      entities: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      createEntity: vi.fn(),
      updateEntity: vi.fn(),
      deleteEntity: vi.fn(),
    });

    mockUseRequireAuth.mockReturnValue({
      user: { id: 'user-1', role: 'manager' },
      loading: false,
    });

    const { result } = renderHook(() => useBenchmarks());

    expect(result.current.canManageBenchmarks).toBe(true);
  });

  it('NO debería permitir gestión para advisor', () => {
    mockUseEntityWithComponents.mockReturnValue({
      entities: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      createEntity: vi.fn(),
      updateEntity: vi.fn(),
      deleteEntity: vi.fn(),
    });

    mockUseRequireAuth.mockReturnValue({
      user: { id: 'user-1', role: 'advisor' },
      loading: false,
    });

    const { result } = renderHook(() => useBenchmarks());

    expect(result.current.canManageBenchmarks).toBe(false);
  });

  it('debería pasar configuración correcta a useEntityWithComponents', () => {
    mockUseEntityWithComponents.mockReturnValue({
      entities: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      createEntity: vi.fn(),
      updateEntity: vi.fn(),
      deleteEntity: vi.fn(),
    });

    renderHook(() => useBenchmarks());

    expect(mockUseEntityWithComponents).toHaveBeenCalledWith(
      expect.objectContaining({
        fetchEntities: getBenchmarks,
        fetchComponentsBatch: getBenchmarkComponentsBatch,
        createEntity: createBenchmark,
        updateEntity: updateBenchmark,
        deleteEntity: deleteBenchmark,
        entityName: 'benchmarks',
      })
    );
  });

  it('debería retornar loading state', () => {
    mockUseEntityWithComponents.mockReturnValue({
      entities: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
      createEntity: vi.fn(),
      updateEntity: vi.fn(),
      deleteEntity: vi.fn(),
    });

    const { result } = renderHook(() => useBenchmarks());

    expect(result.current.isLoading).toBe(true);
  });

  it('debería retornar error state', () => {
    mockUseEntityWithComponents.mockReturnValue({
      entities: [],
      isLoading: false,
      error: 'Failed to fetch',
      refetch: vi.fn(),
      createEntity: vi.fn(),
      updateEntity: vi.fn(),
      deleteEntity: vi.fn(),
    });

    const { result } = renderHook(() => useBenchmarks());

    expect(result.current.error).toBe('Failed to fetch');
  });
});
