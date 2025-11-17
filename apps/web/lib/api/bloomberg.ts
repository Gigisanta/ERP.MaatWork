/**
 * Bloomberg Terminal API client
 * 
 * AI_DECISION: Centralized API client for Bloomberg Terminal data
 * Justificación: Consistent API access pattern, error handling, type safety
 * Impacto: Easier to maintain and extend Bloomberg Terminal features
 */

import { apiClient } from '../api-client';
import type { ApiResponse } from '../api-client';

// ==========================================================
// Types
// ==========================================================

export interface AssetSnapshot {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high52w: number;
  low52w: number;
  pe?: number;
  evEbitda?: number;
  margin?: number;
  roe?: number;
  debtEbitda?: number;
  currency: string;
  source: string;
  asof: string;
}

export interface OHLCVPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose?: number;
  volume: number;
}

export interface MacroSeriesPoint {
  date: string;
  value: number;
}

export interface YieldPoint {
  tenor: string;
  value: number;
  provider: string;
}

export interface YieldCurve {
  date: string;
  country: string;
  yields: Record<string, YieldPoint>;
  spreads?: Record<string, number>;
}

// ==========================================================
// API Methods
// ==========================================================

/**
 * Get asset snapshot (current price, metrics, signals)
 */
export async function getAssetSnapshot(symbol: string): Promise<ApiResponse<AssetSnapshot>> {
  return apiClient.get<AssetSnapshot>(`/v1/bloomberg/assets/${symbol}/snapshot`);
}

/**
 * Get OHLCV data for an asset
 */
export async function getOHLCV(
  symbol: string,
  timeframe: string = '1d',
  from?: string,
  to?: string
): Promise<ApiResponse<OHLCVPoint[]>> {
  const params = new URLSearchParams({ timeframe });
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  
  return apiClient.get<OHLCVPoint[]>(`/v1/bloomberg/assets/${symbol}/ohlcv?${params}`);
}

/**
 * Get macro series data
 */
export async function getMacroSeries(
  seriesId: string,
  from?: string,
  to?: string
): Promise<ApiResponse<{ series: any; points: MacroSeriesPoint[] }>> {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  
  const query = params.toString();
  return apiClient.get<{ series: any; points: MacroSeriesPoint[] }>(
    `/v1/macro/${seriesId}${query ? `?${query}` : ''}`
  );
}

/**
 * Get yield curve data
 */
export async function getYieldCurve(
  country: string = 'US',
  date?: string
): Promise<ApiResponse<YieldCurve>> {
  const params = new URLSearchParams({ country });
  if (date) params.append('date', date);
  
  return apiClient.get<YieldCurve>(`/v1/yields?${params}`);
}

/**
 * Get yield spreads (2s10s, 3m-10y, etc.)
 */
export async function getYieldSpreads(
  country: string = 'US',
  date?: string
): Promise<ApiResponse<{ date: string; country: string; spreads: Record<string, number>; yields: Record<string, number> }>> {
  const params = new URLSearchParams({ country });
  if (date) params.append('date', date);
  
  return apiClient.get<{ date: string; country: string; spreads: Record<string, number>; yields: Record<string, number> }>(
    `/v1/yields/spreads?${params}`
  );
}

/**
 * List available macro series
 */
export async function getMacroSeriesList(
  provider?: string,
  country?: string,
  category?: string
): Promise<ApiResponse<any[]>> {
  const params = new URLSearchParams();
  if (provider) params.append('provider', provider);
  if (country) params.append('country', country);
  if (category) params.append('category', category);
  
  const query = params.toString();
  return apiClient.get<any[]>(`/v1/macro/series${query ? `?${query}` : ''}`);
}



