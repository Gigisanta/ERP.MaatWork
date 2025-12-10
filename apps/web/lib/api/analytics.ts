/**
 * API methods para analytics
 */

import { apiClient } from '../api-client';
import type {
  ApiResponse,
  PortfolioPerformance,
  CompareRequest,
  CompareResponse,
  DashboardKPIs,
  TimePeriod,
} from '@/types';

/**
 * Obtener KPIs del dashboard
 */
import type { DashboardData } from '@/types';

export async function getDashboardKPIs(): Promise<ApiResponse<DashboardData>> {
  return apiClient.get<DashboardData>('/v1/analytics/dashboard');
}

/**
 * Obtener performance de un portfolio
 */
export async function getPortfolioPerformance(
  portfolioId: string,
  period: TimePeriod = '1Y'
): Promise<ApiResponse<PortfolioPerformance>> {
  return apiClient.get<PortfolioPerformance>(
    `/v1/analytics/performance/${portfolioId}?period=${period}`
  );
}

/**
 * Comparar múltiples portfolios y benchmarks
 */
export async function comparePortfolios(
  data: CompareRequest
): Promise<ApiResponse<CompareResponse>> {
  return apiClient.post<CompareResponse>('/v1/analytics/compare', data);
}
