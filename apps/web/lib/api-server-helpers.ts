/**
 * Helper functions for Server Components API calls
 *
 * AI_DECISION: Create server-side API helpers for consistency
 * Justificación: Provides consistent API access in Server Components using apiCall
 * Impacto: Easier migration to Server Components, consistent error handling
 */

import { apiCall } from './api-server';
import type { ApiResponse } from './api-client';
import type { ContactsMetricsResponse, MonthlyGoal } from '@/types/metrics';
import type { Team } from '@/types/team';
import type { UserApiResponse } from '@/types';

/**
 * Get authenticated user (perfil completo)
 *
 * AI_DECISION: Usar /v1/users/me para datos completos
 * Justificación: /users/me devuelve perfil desde DB (phone, isActive, timestamps)
 * Impacto: Consistencia entre Server Components y AuthProvider
 */
export async function getCurrentUser(): Promise<ApiResponse<UserApiResponse>> {
  return apiCall('/v1/users/me', { revalidate: 60 });
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
