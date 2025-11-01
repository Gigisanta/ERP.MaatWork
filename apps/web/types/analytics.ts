/**
 * Tipos relacionados con analytics y performance
 */

import type { TimePeriod } from './common';

export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

export interface PerformanceDataPoint {
  date: string;
  value: number; // Normalizado a base 100
}

export interface PortfolioPerformance {
  portfolioId: string;
  portfolioName: string;
  period: TimePeriod;
  performance: PerformanceDataPoint[];
  metrics: PerformanceMetrics;
  components?: Array<{
    symbol: string;
    name: string;
    weight: number;
  }>;
}

export interface ComparisonResult {
  id: string;
  name: string;
  type: 'portfolio' | 'benchmark';
  performance: PerformanceDataPoint[];
  metrics: PerformanceMetrics;
}

export interface CompareRequest {
  portfolioIds?: string[];
  benchmarkIds?: string[];
  period: TimePeriod;
}

export interface CompareResponse {
  period: TimePeriod;
  results: ComparisonResult[];
  count: number;
}

/**
 * Dashboard KPIs
 */
export interface DashboardKPIs {
  totalAUM?: number;
  clientCount?: number;
  portfolioCount?: number;
  avgReturn?: number;
  deviationAlerts?: number;
  // Manager específicos
  teamAUM?: number;
  advisorCount?: number;
  // Admin específicos
  activeTemplates?: number;
  clientsWithoutPortfolio?: number;
  instrumentsWithoutPrice?: number;
}

