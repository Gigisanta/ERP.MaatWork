/**
 * Tests para bloomberg API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiIndex from './bloomberg';

vi.mock('../api-client', () => {
  return {
    apiClient: {
      get: vi.fn(async (_p: string) => ({ success: true })),
    },
  };
});

describe('bloomberg api client endpoints', () => {
  const { apiClient } = require('../api-client');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls get asset snapshot endpoint', async () => {
    await apiIndex.getAssetSnapshot('AAPL');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/bloomberg/assets/AAPL/snapshot');
  });

  it('calls get OHLCV endpoint with timeframe', async () => {
    await apiIndex.getOHLCV('AAPL', '1d');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/bloomberg/assets/AAPL/ohlcv?timeframe=1d');
  });

  it('calls get OHLCV endpoint with date range', async () => {
    await apiIndex.getOHLCV('AAPL', '1d', '2024-01-01', '2024-01-31');
    expect(apiClient.get).toHaveBeenCalledWith(
      '/v1/bloomberg/assets/AAPL/ohlcv?timeframe=1d&from=2024-01-01&to=2024-01-31'
    );
  });

  it('calls get macro series endpoint', async () => {
    await apiIndex.getMacroSeries('USGDP');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/macro/USGDP');
  });

  it('calls get macro series endpoint with date range', async () => {
    await apiIndex.getMacroSeries('USGDP', '2024-01-01', '2024-01-31');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/macro/USGDP?from=2024-01-01&to=2024-01-31');
  });

  it('calls get yield curve endpoint', async () => {
    await apiIndex.getYieldCurve('US');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/yields?country=US');
  });

  it('calls get yield curve endpoint with date', async () => {
    await apiIndex.getYieldCurve('US', '2024-01-01');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/yields?country=US&date=2024-01-01');
  });

  it('calls get yield spreads endpoint', async () => {
    await apiIndex.getYieldSpreads('US');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/yields/spreads?country=US');
  });

  it('calls get macro series list endpoint', async () => {
    await apiIndex.getMacroSeriesList();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/macro/series');
  });

  it('calls get macro series list endpoint with filters', async () => {
    await apiIndex.getMacroSeriesList('bloomberg', 'US', 'gdp');
    expect(apiClient.get).toHaveBeenCalledWith(
      '/v1/macro/series?provider=bloomberg&country=US&category=gdp'
    );
  });
});
