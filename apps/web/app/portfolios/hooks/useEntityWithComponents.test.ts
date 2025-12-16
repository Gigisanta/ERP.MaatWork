/**
 * Tests para useEntityWithComponents hook
 *
 * AI_DECISION: Tests para hook genérico de gestión de entidades con componentes
 * Justificación: Validar fetching batch, manejo de errores y operaciones CRUD
 * Impacto: Prevenir errores en gestión de portfolios y benchmarks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEntityWithComponents } from './useEntityWithComponents';

// Mock dependencies
vi.mock('../../auth/useRequireAuth', () => ({
  useRequireAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com', role: 'admin' },
    loading: false,
  })),
}));

vi.mock('../../../lib/logger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/logger')>();
  return {
    ...actual,
    logger: {
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
    },
  };
});

describe('useEntityWithComponents', () => {
  const mockFetchEntities = vi.fn();
  const mockFetchComponentsBatch = vi.fn();
  const mockCreateEntity = vi.fn();
  const mockUpdateEntity = vi.fn();
  const mockDeleteEntity = vi.fn();
  const mockGetEntityId = vi.fn((entity: { id: string }) => entity.id);
  const mockUseRequireAuth = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    const { useRequireAuth } = require('../../auth/useRequireAuth');
    mockUseRequireAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com', role: 'admin' },
      loading: false,
    });
    useRequireAuth.mockImplementation(mockUseRequireAuth);
  });

  it('debería fetch entities y components exitosamente', async () => {
    const mockEntities = [
      { id: 'entity-1', name: 'Entity 1' },
      { id: 'entity-2', name: 'Entity 2' },
    ];

    const mockComponents = {
      'entity-1': [{ id: 'comp-1', name: 'Component 1' }],
      'entity-2': [{ id: 'comp-2', name: 'Component 2' }],
    };

    mockFetchEntities.mockResolvedValue({
      success: true,
      data: mockEntities,
    });

    mockFetchComponentsBatch.mockResolvedValue({
      success: true,
      data: mockComponents,
    });

    const { result } = renderHook(() =>
      useEntityWithComponents({
        fetchEntities: mockFetchEntities,
        fetchComponentsBatch: mockFetchComponentsBatch,
        createEntity: mockCreateEntity,
        updateEntity: mockUpdateEntity,
        deleteEntity: mockDeleteEntity,
        getEntityId: mockGetEntityId,
        entityName: 'test-entities',
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.entities).toHaveLength(2);
    expect(result.current.entities[0]).toHaveProperty('components');
    expect(result.current.entities[0]).toHaveProperty('lines');
    expect(result.current.error).toBeNull();
  });

  it('debería manejar error al fetch entities', async () => {
    mockFetchEntities.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useEntityWithComponents({
        fetchEntities: mockFetchEntities,
        fetchComponentsBatch: mockFetchComponentsBatch,
        createEntity: mockCreateEntity,
        updateEntity: mockUpdateEntity,
        deleteEntity: mockDeleteEntity,
        getEntityId: mockGetEntityId,
        entityName: 'test-entities',
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.entities).toEqual([]);
  });

  it('debería manejar error al fetch components batch', async () => {
    const mockEntities = [{ id: 'entity-1', name: 'Entity 1' }];

    mockFetchEntities.mockResolvedValue({
      success: true,
      data: mockEntities,
    });

    mockFetchComponentsBatch.mockRejectedValue(new Error('Components error'));

    const { result } = renderHook(() =>
      useEntityWithComponents({
        fetchEntities: mockFetchEntities,
        fetchComponentsBatch: mockFetchComponentsBatch,
        createEntity: mockCreateEntity,
        updateEntity: mockUpdateEntity,
        deleteEntity: mockDeleteEntity,
        getEntityId: mockGetEntityId,
        entityName: 'test-entities',
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.entities).toHaveLength(1);
    expect(result.current.entities[0].components).toEqual([]);
  });

  it('debería crear entity y refetch', async () => {
    mockFetchEntities.mockResolvedValue({
      success: true,
      data: [],
    });

    mockCreateEntity.mockResolvedValue({
      success: true,
      data: { id: 'entity-1', name: 'New Entity' },
    });

    const { result } = renderHook(() =>
      useEntityWithComponents({
        fetchEntities: mockFetchEntities,
        fetchComponentsBatch: mockFetchComponentsBatch,
        createEntity: mockCreateEntity,
        updateEntity: mockUpdateEntity,
        deleteEntity: mockDeleteEntity,
        getEntityId: mockGetEntityId,
        entityName: 'test-entities',
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.createEntity({ name: 'New Entity' });

    expect(mockCreateEntity).toHaveBeenCalledWith({ name: 'New Entity' });
    expect(mockFetchEntities).toHaveBeenCalledTimes(2); // Initial + after create
  });

  it('debería actualizar entity y refetch', async () => {
    mockFetchEntities.mockResolvedValue({
      success: true,
      data: [{ id: 'entity-1', name: 'Entity 1' }],
    });

    mockUpdateEntity.mockResolvedValue({
      success: true,
      data: { id: 'entity-1', name: 'Updated Entity' },
    });

    const { result } = renderHook(() =>
      useEntityWithComponents({
        fetchEntities: mockFetchEntities,
        fetchComponentsBatch: mockFetchComponentsBatch,
        createEntity: mockCreateEntity,
        updateEntity: mockUpdateEntity,
        deleteEntity: mockDeleteEntity,
        getEntityId: mockGetEntityId,
        entityName: 'test-entities',
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.updateEntity('entity-1', { name: 'Updated Entity' });

    expect(mockUpdateEntity).toHaveBeenCalledWith('entity-1', { name: 'Updated Entity' });
    expect(mockFetchEntities).toHaveBeenCalledTimes(2); // Initial + after update
  });

  it('debería eliminar entity sin refetch', async () => {
    mockFetchEntities.mockResolvedValue({
      success: true,
      data: [
        { id: 'entity-1', name: 'Entity 1' },
        { id: 'entity-2', name: 'Entity 2' },
      ],
    });

    mockDeleteEntity.mockResolvedValue({
      success: true,
    });

    const { result } = renderHook(() =>
      useEntityWithComponents({
        fetchEntities: mockFetchEntities,
        fetchComponentsBatch: mockFetchComponentsBatch,
        createEntity: mockCreateEntity,
        updateEntity: mockUpdateEntity,
        deleteEntity: mockDeleteEntity,
        getEntityId: mockGetEntityId,
        entityName: 'test-entities',
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialCount = result.current.entities.length;
    await result.current.deleteEntity('entity-1');

    expect(mockDeleteEntity).toHaveBeenCalledWith('entity-1');
    expect(result.current.entities.length).toBe(initialCount - 1);
  });

  it('NO debería fetch cuando user no está disponible', async () => {
    mockUseRequireAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    const { result } = renderHook(() =>
      useEntityWithComponents({
        fetchEntities: mockFetchEntities,
        fetchComponentsBatch: mockFetchComponentsBatch,
        createEntity: mockCreateEntity,
        updateEntity: mockUpdateEntity,
        deleteEntity: mockDeleteEntity,
        getEntityId: mockGetEntityId,
        entityName: 'test-entities',
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetchEntities).not.toHaveBeenCalled();
    expect(result.current.entities).toEqual([]);
  });

  it('NO debería fetch cuando canManage retorna false', async () => {
    mockUseRequireAuth.mockReturnValue({
      user: { id: 'user-1', role: 'advisor' },
      loading: false,
    });

    const { result } = renderHook(() =>
      useEntityWithComponents({
        fetchEntities: mockFetchEntities,
        fetchComponentsBatch: mockFetchComponentsBatch,
        createEntity: mockCreateEntity,
        updateEntity: mockUpdateEntity,
        deleteEntity: mockDeleteEntity,
        getEntityId: mockGetEntityId,
        canManage: () => false,
        entityName: 'test-entities',
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetchEntities).not.toHaveBeenCalled();
    expect(result.current.entities).toEqual([]);
  });

  it('debería manejar respuesta sin data', async () => {
    mockFetchEntities.mockResolvedValue({
      success: true,
      data: undefined,
    });

    const { result } = renderHook(() =>
      useEntityWithComponents({
        fetchEntities: mockFetchEntities,
        fetchComponentsBatch: mockFetchComponentsBatch,
        createEntity: mockCreateEntity,
        updateEntity: mockUpdateEntity,
        deleteEntity: mockDeleteEntity,
        getEntityId: mockGetEntityId,
        entityName: 'test-entities',
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.entities).toEqual([]);
  });

  it('debería manejar respuesta con success false', async () => {
    mockFetchEntities.mockResolvedValue({
      success: false,
      error: 'Failed to fetch',
    });

    const { result } = renderHook(() =>
      useEntityWithComponents({
        fetchEntities: mockFetchEntities,
        fetchComponentsBatch: mockFetchComponentsBatch,
        createEntity: mockCreateEntity,
        updateEntity: mockUpdateEntity,
        deleteEntity: mockDeleteEntity,
        getEntityId: mockGetEntityId,
        entityName: 'test-entities',
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.entities).toEqual([]);
  });
});
