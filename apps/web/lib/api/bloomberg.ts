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
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  high52w: number | null;
  low52w: number | null;
  pe?: number | null;
  evEbitda?: number | null;
  margin?: number | null;
  roe?: number | null;
  debtEbitda?: number | null;
  currency: string;
  source: string;
  asof: string | null;
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

export interface MacroSeries {
  id: string;
  name: string;
  provider?: string;
  country?: string;
  category?: string;
  unit?: string;
  frequency?: string;
  [key: string]: unknown;
}

export interface MacroSeriesListItem {
  id: string;
  name: string;
  provider?: string;
  country?: string;
  category?: string;
  unit?: string;
  frequency?: string;
  description?: string;
  [key: string]: unknown;
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
 * Get batch asset snapshots
 */
export async function getAssetSnapshotsBatch(
  symbols: string[]
): Promise<ApiResponse<AssetSnapshot[]>> {
  return apiClient.post<AssetSnapshot[]>('/v1/bloomberg/assets/snapshots-batch', { symbols });
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

  // AI_DECISION: Normalize response data for OHLCV
  // Justificación: The API returns { data: [...], count: N } but the client expects { data: [...] }
  // We need to extract the array from the data property if it's wrapped
  const response = await apiClient.get<any>(`/v1/bloomberg/assets/${symbol}/ohlcv?${params}`);

  if (
    response.success &&
    response.data &&
    !Array.isArray(response.data) &&
    Array.isArray(response.data.data)
  ) {
    return {
      ...response,
      data: response.data.data as OHLCVPoint[],
    };
  }

  return response as ApiResponse<OHLCVPoint[]>;
}

/**
 * Get macro series data
 */
export async function getMacroSeries(
  seriesId: string,
  from?: string,
  to?: string
): Promise<ApiResponse<{ series: MacroSeries; points: MacroSeriesPoint[] }>> {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  const query = params.toString();
  return apiClient.get<{ series: MacroSeries; points: MacroSeriesPoint[] }>(
    `/v1/bloomberg/macro/${seriesId}${query ? `?${query}` : ''}`
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

  return apiClient.get<YieldCurve>(`/v1/bloomberg/yields?${params}`);
}

/**
 * Get yield spreads (2s10s, 3m-10y, etc.)
 */
export async function getYieldSpreads(
  country: string = 'US',
  date?: string
): Promise<
  ApiResponse<{
    date: string;
    country: string;
    spreads: Record<string, number>;
    yields: Record<string, number>;
  }>
> {
  const params = new URLSearchParams({ country });
  if (date) params.append('date', date);

  return apiClient.get<{
    date: string;
    country: string;
    spreads: Record<string, number>;
    yields: Record<string, number>;
  }>(`/v1/bloomberg/yields/spreads?${params}`);
}

/**
 * List available macro series
 */
export async function getMacroSeriesList(
  provider?: string,
  country?: string,
  category?: string
): Promise<ApiResponse<MacroSeriesListItem[]>> {
  const params = new URLSearchParams();
  if (provider) params.append('provider', provider);
  if (country) params.append('country', country);
  if (category) params.append('category', category);

  const query = params.toString();
  return apiClient.get<MacroSeriesListItem[]>(
    `/v1/bloomberg/macro/series${query ? `?${query}` : ''}`
  );
}
