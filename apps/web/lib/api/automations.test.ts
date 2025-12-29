/**
 * Tests para automations API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './client';
import * as apiIndex from './automations';

vi.mock('./client', () => {
  return {
    apiClient: {
      get: vi.fn(async (_p: string) => ({ success: true })),
      post: vi.fn(async (_p: string, _b?: unknown) => ({ success: true })),
      patch: vi.fn(async (_p: string, _b?: unknown) => ({ success: true })),
      delete: vi.fn(async (_p: string) => ({ success: true })),
    },
  };
});

describe('automations api client endpoints', () => {
  

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls list automation configs endpoint', async () => {
    await apiIndex.getAutomationConfigs();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/automations');
  });

  it('calls get automation config by id endpoint', async () => {
    await apiIndex.getAutomationConfigById('auto-123');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/automations/auto-123');
  });

  it('calls get automation config by name endpoint', async () => {
    await apiIndex.getAutomationConfigByName('welcome-email');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/automations/by-name/welcome-email');
  });

  it('calls create automation config endpoint', async () => {
    const data = { name: 'test', displayName: 'Test', triggerType: 'contact_created' };
    await apiIndex.createAutomationConfig(data);
    expect(apiClient.post).toHaveBeenCalledWith('/v1/automations', data);
  });

  it('calls update automation config endpoint', async () => {
    const data = { displayName: 'Updated' };
    await apiIndex.updateAutomationConfig('auto-123', data);
    expect(apiClient.patch).toHaveBeenCalledWith('/v1/automations/auto-123', data);
  });

  it('calls delete automation config endpoint', async () => {
    await apiIndex.deleteAutomationConfig('auto-123');
    expect(apiClient.delete).toHaveBeenCalledWith('/v1/automations/auto-123');
  });
});
