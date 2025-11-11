import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiIndex from './users';

// Mock apiClient methods
vi.mock('../api-client', () => {
  return {
    apiClient: {
      get: vi.fn(async (_p: string) => ({ success: true })),
      post: vi.fn(async (_p: string, _b?: unknown) => ({ success: true })),
      patch: vi.fn(async (_p: string, _b?: unknown) => ({ success: true }))
    }
  };
});

describe('users api client endpoints', () => {
  const { apiClient } = require('../api-client');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls pending users endpoint', async () => {
    await apiIndex.getPendingUsers();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/users/pending');
  });

  it('calls approve endpoint', async () => {
    await apiIndex.approveUser('u1');
    expect(apiClient.post).toHaveBeenCalledWith('/v1/users/u1/approve', {});
  });

  it('calls reject endpoint', async () => {
    await apiIndex.rejectUser('u2');
    expect(apiClient.post).toHaveBeenCalledWith('/v1/users/u2/reject', {});
  });

  it('calls status patch endpoint', async () => {
    await apiIndex.updateUserStatus('u3', true);
    expect(apiClient.patch).toHaveBeenCalledWith('/v1/users/u3/status', { isActive: true });
  });

  it('calls role patch endpoint', async () => {
    await apiIndex.updateUserRole('u4', 'manager');
    expect(apiClient.patch).toHaveBeenCalledWith('/v1/users/u4/role', { role: 'manager' });
  });
});







