/**
 * Tests para metrics API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiIndex from './metrics';

vi.mock('../api-client', () => {
  return {
    apiClient: {
      get: vi.fn(async (_p: string) => ({ success: true })),
      post: vi.fn(async (_p: string, _b?: unknown) => ({ success: true })),
    },
  };
});

describe('metrics api client endpoints', () => {
  const { apiClient } = require('../api-client');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls get contacts metrics endpoint', async () => {
    await apiIndex.getContactsMetrics();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/metrics/contacts');
  });

  it('calls get contacts metrics endpoint with month and year', async () => {
    await apiIndex.getContactsMetrics(1, 2024);
    expect(apiClient.get).toHaveBeenCalledWith('/v1/metrics/contacts?month=1&year=2024');
  });

  it('calls get monthly goals endpoint', async () => {
    await apiIndex.getMonthlyGoals();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/metrics/goals');
  });

  it('calls get monthly goals endpoint with month and year', async () => {
    await apiIndex.getMonthlyGoals(1, 2024);
    expect(apiClient.get).toHaveBeenCalledWith('/v1/metrics/goals?month=1&year=2024');
  });

  it('calls save monthly goals endpoint', async () => {
    const data = { month: 1, year: 2024, newProspects: 10, meetings: 5, newClients: 2 };
    await apiIndex.saveMonthlyGoals(data);
    expect(apiClient.post).toHaveBeenCalledWith('/v1/metrics/goals', data);
  });
});
