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
  totalAum?: number; // Alias usado por la API
  clientCount?: number;
  portfolioCount?: number;
  clientsWithPortfolio?: number; // Usado por la API
  avgReturn?: number;
  deviationAlerts?: number;
  // Manager específicos
  teamAUM?: number;
  teamAum?: number; // Alias usado por la API
  advisorCount?: number;
  // Admin específicos
  activeTemplates?: number;
  globalAum?: number; // Usado por la API
  clientsWithoutPortfolio?: number;
  instrumentsWithoutPrice?: number;
  // Owner específicos - Vista ejecutiva de toda la agencia
  totalTeams?: number;
  totalAdvisors?: number;
  totalClients?: number;
}

/**
 * Datos completos del dashboard (incluye KPIs + datos adicionales)
 */
export interface DashboardData {
  role: string;
  kpis: DashboardKPIs;
  riskDistribution?: Array<{
    riskLevel: string;
    count: number;
  }>;
  topClients?: Array<{
    contactId: string;
    contactName: string;
    aum: number;
  }>;
  aumTrend?: Array<{
    date: string;
    value: number;
  }>;
}
