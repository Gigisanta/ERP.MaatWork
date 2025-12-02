/**
 * API Module - Barrel Export
 * 
 * Exports all API functions and the ApiClient:
 * 
 * Client components (refactored from api-client.ts):
 * - client.ts - Main ApiClient class
 * - auth-manager.ts - Token refresh management
 * - retry-handler.ts - Retry logic with exponential backoff
 * - request-builder.ts - Header building, body serialization
 * - types.ts - Shared types
 * 
 * Domain-specific API functions:
 * - analytics.ts, aum.ts, automations.ts, benchmarks.ts, bloomberg.ts
 * - broker-accounts.ts, capacitaciones.ts, career-plan.ts, contacts.ts
 * - instruments.ts, metrics.ts, notes.ts, notifications.ts, pipeline.ts
 * - portfolios.ts, settings.ts, tags.ts, tasks.ts, teams.ts, users.ts
 */

// ApiClient and related
export { ApiClient } from './client';
export type { RequestOptions, RequestConfig } from './types';

// Re-export commonly used items from api-error
export { ApiError } from '../api-error';
export type { ApiResponse } from '@/types';

// Singleton instance
import { ApiClient } from './client';
export const apiClient = new ApiClient();

// Domain-specific API functions
export * from './analytics';
export * from './aum';
export * from './aum-validation';
export * from './automations';
export * from './benchmarks';
export * from './bloomberg';
export * from './broker-accounts';
export * from './capacitaciones';
export * from './career-plan';
export * from './contacts';
export * from './instruments';
export * from './metrics';
export * from './notes';
// notifications.ts is empty - no exports needed
export * from './pipeline';
export * from './portfolios';
export * from './settings';
export * from './tags';
export * from './tasks';
export * from './teams';
export * from './users';
