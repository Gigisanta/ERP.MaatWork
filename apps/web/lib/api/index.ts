/**
 * Barrel export para todos los métodos de API
 * 
 * Uso:
 *   import { getPortfolios, searchInstruments, apiClient } from '@/lib/api';
 */

// Re-export client
export { apiClient, ApiError } from '../api-client';
export type { ApiResponse } from '../api-client';

// Portfolio methods
export * from './portfolios';

// Benchmark methods
export * from './benchmarks';

// Instrument methods
export * from './instruments';

// Analytics methods
export * from './analytics';

// AUM methods
export * from './aum';

