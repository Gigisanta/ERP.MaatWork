/**
 * Tests para broker-accounts API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './client';
import * as apiIndex from './broker-accounts';

vi.mock('./client', () => {
  return {
    apiClient: {
      get: vi.fn(async (_p: string) => ({ success: true })),
      post: vi.fn(async (_p: string, _b?: unknown) => ({ success: true })),
      delete: vi.fn(async (_p: string) => ({ success: true })),
    },
  };
});

describe('broker-accounts api client endpoints', () => {
  

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls get broker accounts endpoint', async () => {
    await apiIndex.getBrokerAccounts();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/broker-accounts');
  });

  it('calls get broker accounts endpoint with contactId filter', async () => {
    await apiIndex.getBrokerAccounts({ contactId: 'contact-123' });
    expect(apiClient.get).toHaveBeenCalledWith('/v1/broker-accounts?contactId=contact-123');
  });

  it('calls create broker account endpoint', async () => {
    const data = { contactId: 'contact-123', broker: 'test', accountNumber: '12345' };
    await apiIndex.createBrokerAccount(data);
    expect(apiClient.post).toHaveBeenCalledWith('/v1/broker-accounts', data);
  });

  it('calls delete broker account endpoint', async () => {
    await apiIndex.deleteBrokerAccount('account-123');
    expect(apiClient.delete).toHaveBeenCalledWith('/v1/broker-accounts/account-123');
  });
});
