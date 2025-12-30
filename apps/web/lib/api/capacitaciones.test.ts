/**
 * Tests para capacitaciones API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './client';
import * as apiIndex from './capacitaciones';

vi.mock('./client', () => {
  return {
    apiClient: {
      get: vi.fn(async (_p: string) => ({ success: true })),
      post: vi.fn(async (_p: string, _b?: unknown) => ({ success: true })),
      put: vi.fn(async (_p: string, _b?: unknown) => ({ success: true })),
      delete: vi.fn(async (_p: string) => ({ success: true })),
    },
  };
});

describe('capacitaciones api client endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls get capacitaciones endpoint', async () => {
    await apiIndex.getCapacitaciones();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/capacitaciones');
  });

  it('calls get capacitaciones endpoint with filters', async () => {
    await apiIndex.getCapacitaciones({ tema: 'test', search: 'query', limit: 10, offset: 0 });
    expect(apiClient.get).toHaveBeenCalledWith(
      '/v1/capacitaciones?tema=test&search=query&limit=10&offset=0'
    );
  });

  it('calls get capacitacion by id endpoint', async () => {
    await apiIndex.getCapacitacionById('cap-123');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/capacitaciones/cap-123');
  });

  it('calls create capacitacion endpoint', async () => {
    const data = { tema: 'Test', fecha: '2024-01-01' };
    await apiIndex.createCapacitacion(data);
    expect(apiClient.post).toHaveBeenCalledWith('/v1/capacitaciones', data);
  });

  it('calls update capacitacion endpoint', async () => {
    const data = { tema: 'Updated' };
    await apiIndex.updateCapacitacion('cap-123', data);
    expect(apiClient.put).toHaveBeenCalledWith('/v1/capacitaciones/cap-123', data);
  });

  it('calls delete capacitacion endpoint', async () => {
    await apiIndex.deleteCapacitacion('cap-123');
    expect(apiClient.delete).toHaveBeenCalledWith('/v1/capacitaciones/cap-123');
  });

  it('calls import capacitaciones CSV endpoint', async () => {
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    await apiIndex.importCapacitacionesCSV(file);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/v1/capacitaciones/import',
      expect.any(FormData),
      expect.objectContaining({ retries: 0 })
    );
  });
});
