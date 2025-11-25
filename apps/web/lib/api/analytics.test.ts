/**
 * Tests para analytics API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiIndex from './analytics';

vi.mock('../api-client', () => {
  return {
    apiClient: {
      get: vi.fn(async (_p: string) => ({ success: true })),
      post: vi.fn(async (_p: string, _b?: unknown) => ({ success: true }))
    }
  };
});

describe('analytics api client endpoints', () => {
  const { apiClient } = require('../api-client');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls dashboard KPIs endpoint', async () => {
    await apiIndex.getDashboardKPIs();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/analytics/dashboard');
  });

  it('calls portfolio performance endpoint', async () => {
    await apiIndex.getPortfolioPerformance('portfolio-123', '1Y');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/analytics/performance/portfolio-123?period=1Y');
  });

  it('calls compare portfolios endpoint', async () => {
    const data = { portfolioIds: ['p1'], benchmarkIds: ['b1'], period: '1Y' };
    await apiIndex.comparePortfolios(data);
    expect(apiClient.post).toHaveBeenCalledWith('/v1/analytics/compare', data);
  });
});

