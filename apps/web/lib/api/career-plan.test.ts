/**
 * Tests para career-plan API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './client';
import * as apiIndex from './career-plan';

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

describe('career-plan api client endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls get career plan levels endpoint', async () => {
    await apiIndex.getCareerPlanLevels();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/career-plan/levels');
  });

  it('calls get career plan level by id endpoint', async () => {
    await apiIndex.getCareerPlanLevel('level-123');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/career-plan/levels/level-123');
  });

  it('calls create career plan level endpoint', async () => {
    const data = { name: 'Test Level', minProduction: 100000 };
    await apiIndex.createCareerPlanLevel(data);
    expect(apiClient.post).toHaveBeenCalledWith('/v1/career-plan/levels', data);
  });

  it('calls update career plan level endpoint', async () => {
    const data = { name: 'Updated Level' };
    await apiIndex.updateCareerPlanLevel('level-123', data);
    expect(apiClient.put).toHaveBeenCalledWith('/v1/career-plan/levels/level-123', data);
  });

  it('calls delete career plan level endpoint', async () => {
    await apiIndex.deleteCareerPlanLevel('level-123');
    expect(apiClient.delete).toHaveBeenCalledWith('/v1/career-plan/levels/level-123');
  });

  it('calls get user career progress endpoint', async () => {
    await apiIndex.getUserCareerProgress();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/career-plan/user-progress');
  });
});
