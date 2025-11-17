/**
 * Helper functions for Server Components API calls
 * 
 * AI_DECISION: Create server-side API helpers for consistency
 * Justificación: Provides consistent API access in Server Components using apiCall
 * Impacto: Easier migration to Server Components, consistent error handling
 */

import { apiCall } from './api-server';
import type { ApiResponse } from './api-client';
import type {
  ContactsMetricsResponse,
  MonthlyGoal,
} from '@/types/metrics';
import type { Team } from '@/types/team';

/**
 * Get authenticated user from /auth/me endpoint
 * 
 * AI_DECISION: Cache user data for 60 seconds
 * Justificación: User data changes infrequently, caching reduces API load
 * Impacto: Reduces redundant /auth/me requests, improves page load performance
 */
export async function getCurrentUser(): Promise<ApiResponse<{
  user: {
    id: string;
    email: string;
    role: string;
  };
}>> {
  return apiCall('/v1/auth/me', { revalidate: 60 });
}

/**
 * Get contacts metrics
 * 
 * AI_DECISION: Cache metrics for 30 seconds
 * Justificación: Metrics change frequently but don't need real-time updates
 * Impacto: Reduces API load while keeping data reasonably fresh
 */
export async function getContactsMetricsServer(
  month?: number,
  year?: number
): Promise<ApiResponse<ContactsMetricsResponse>> {
  const params = new URLSearchParams();
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());
  
  const query = params.toString();
  const endpoint = query ? `/v1/metrics/contacts?${query}` : '/v1/metrics/contacts';
  
  return apiCall(endpoint, { revalidate: 30 });
}

/**
 * Get monthly goals
 * 
 * AI_DECISION: Cache goals for 60 seconds
 * Justificación: Goals change less frequently than metrics
 * Impacto: Reduces API load while keeping goals reasonably fresh
 */
export async function getMonthlyGoalsServer(
  month?: number,
  year?: number
): Promise<ApiResponse<MonthlyGoal | null>> {
  const params = new URLSearchParams();
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());
  
  const query = params.toString();
  const endpoint = query ? `/v1/metrics/goals?${query}` : '/v1/metrics/goals';
  
  return apiCall(endpoint, { revalidate: 60 });
}

/**
 * Get teams
 * 
 * AI_DECISION: Cache teams for 120 seconds
 * Justificación: Teams change very infrequently, can cache longer
 * Impacto: Significantly reduces API load for rarely-changing data
 */
export async function getTeamsServer(): Promise<ApiResponse<Team[]>> {
  return apiCall('/v1/teams', { revalidate: 120 });
}

/**
 * Get contacts
 */
export async function getContactsServer(params?: {
  assignedAdvisorId?: string;
  pipelineStageId?: string;
  tagIds?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<import('@/types/contact').Contact[]>> {
  const queryParams = new URLSearchParams();
  if (params?.assignedAdvisorId) queryParams.append('assignedAdvisorId', params.assignedAdvisorId);
  if (params?.pipelineStageId) queryParams.append('pipelineStageId', params.pipelineStageId);
  if (params?.tagIds?.length) queryParams.append('tagIds', params.tagIds.join(','));
  if (params?.search) queryParams.append('search', params.search);
  if (params?.limit) queryParams.append('limit', String(params.limit));
  if (params?.offset) queryParams.append('offset', String(params.offset));

  const endpoint = `/v1/contacts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return apiCall(endpoint);
}

/**
 * Get pipeline stages
 */
export async function getPipelineStagesServer(): Promise<ApiResponse<import('@/types').PipelineStage[]>> {
  return apiCall('/pipeline/stages');
}

/**
 * Get advisors
 */
export async function getAdvisorsServer(): Promise<ApiResponse<import('@/types').Advisor[]>> {
  return apiCall('/users/advisors');
}

/**
 * Get tags
 */
export async function getTagsServer(scope: string = 'contact'): Promise<ApiResponse<import('@/types').Tag[]>> {
  return apiCall(`/v1/tags?scope=${scope}`);
}

