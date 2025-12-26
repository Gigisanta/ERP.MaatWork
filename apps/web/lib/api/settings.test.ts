/**
 * Tests para settings API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './client';
import * as apiIndex from './settings';

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

describe('settings api client endpoints', () => {
  

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls list advisor aliases endpoint', async () => {
    await apiIndex.listAdvisorAliases();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/admin/settings/advisors/aliases');
  });

  it('calls create advisor alias endpoint', async () => {
    const data = { alias: 'test-alias', userId: 'user-123' };
    await apiIndex.createAdvisorAlias(data);
    expect(apiClient.post).toHaveBeenCalledWith('/v1/admin/settings/advisors/aliases', data);
  });

  it('calls update advisor alias endpoint', async () => {
    const data = { alias: 'updated-alias' };
    await apiIndex.updateAdvisorAlias('alias-123', data);
    expect(apiClient.put).toHaveBeenCalledWith(
      '/v1/admin/settings/advisors/aliases/alias-123',
      data
    );
  });

  it('calls delete advisor alias endpoint', async () => {
    await apiIndex.deleteAdvisorAlias('alias-123');
    expect(apiClient.delete).toHaveBeenCalledWith('/v1/admin/settings/advisors/aliases/alias-123');
  });
});
