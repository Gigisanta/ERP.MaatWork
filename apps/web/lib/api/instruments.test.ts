/**
 * Tests para instruments API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiIndex from './instruments';

vi.mock('../api-client', () => {
  return {
    apiClient: {
      get: vi.fn(async (_p: string) => ({ success: true })),
      post: vi.fn(async (_p: string, _b?: unknown) => ({ success: true })),
      put: vi.fn(async (_p: string, _b?: unknown) => ({ success: true })),
      delete: vi.fn(async (_p: string) => ({ success: true })),
    },
  };
});

describe('instruments api client endpoints', () => {
  const { apiClient } = require('../api-client');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls search instruments endpoint', async () => {
    await apiIndex.searchInstruments('AAPL');
    expect(apiClient.post).toHaveBeenCalledWith('/v1/instruments/search', { query: 'AAPL' });
  });

  it('calls validate symbol endpoint', async () => {
    await apiIndex.validateSymbol('AAPL');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/instruments/search/validate/AAPL');
  });

  it('calls get instruments endpoint', async () => {
    await apiIndex.getInstruments();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/instruments');
  });

  it('calls get instruments endpoint with filters', async () => {
    await apiIndex.getInstruments({
      search: 'test',
      assetClass: 'equity',
      active: true,
      limit: 10,
      offset: 0,
    });
    expect(apiClient.get).toHaveBeenCalledWith(
      '/v1/instruments?search=test&assetClass=equity&active=true&limit=10&offset=0'
    );
  });

  it('calls get instrument by id endpoint', async () => {
    await apiIndex.getInstrumentById('inst-123');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/instruments/inst-123');
  });

  it('calls create instrument endpoint', async () => {
    const data = { symbol: 'AAPL', name: 'Apple Inc.' };
    await apiIndex.createInstrument(data);
    expect(apiClient.post).toHaveBeenCalledWith('/v1/instruments', data);
  });

  it('calls update instrument endpoint', async () => {
    const data = { name: 'Updated Name' };
    await apiIndex.updateInstrument('inst-123', data);
    expect(apiClient.put).toHaveBeenCalledWith('/v1/instruments/inst-123', data);
  });

  it('calls delete instrument endpoint', async () => {
    await apiIndex.deleteInstrument('inst-123');
    expect(apiClient.delete).toHaveBeenCalledWith('/v1/instruments/inst-123');
  });
});
