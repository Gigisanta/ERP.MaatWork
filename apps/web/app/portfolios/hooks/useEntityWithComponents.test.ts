
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useEntityWithComponents } from './useEntityWithComponents';
import { useRequireAuth } from '@/auth/useRequireAuth';

vi.mock('@/auth/useRequireAuth', () => ({
  useRequireAuth: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
  toLogContext: vi.fn((c) => c),
}));

describe('useEntityWithComponents expanded', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useRequireAuth as any).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
    });
  });

  it('should implement optimistic updates', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ success: true, data: [{ id: '1', name: 'Old' }] });
    const mockUpdate = vi.fn().mockResolvedValue({ success: true, data: { id: '1', name: 'New' } });

    const { result } = renderHook(() =>
      useEntityWithComponents({
        fetchEntities: mockFetch,
        fetchComponentsBatch: vi.fn().mockResolvedValue({ success: true, data: {} }),
        createEntity: vi.fn(),
        updateEntity: mockUpdate,
        deleteEntity: vi.fn(),
        getEntityId: (e: any) => e.id,
        entityName: 'test',
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.updateEntity('1', { name: 'New' });
    });

    expect(result.current.entities[0].name).toBe('New');
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
  });

});
