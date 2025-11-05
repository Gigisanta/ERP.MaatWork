/**
 * API methods para métricas del pipeline
 */

import { apiClient } from '../api-client';
import type { ApiResponse } from '../api-client';
import type {
  ContactsMetricsResponse,
  MonthlyGoal,
  SaveMonthlyGoalRequest
} from '@/types/metrics';

// ==========================================================
// API Methods
// ==========================================================

/**
 * Obtener métricas de contactos
 * 
 * @param month - Mes (1-12), opcional, default: mes actual
 * @param year - Año, opcional, default: año actual
 */
export async function getContactsMetrics(
  month?: number,
  year?: number
): Promise<ApiResponse<ContactsMetricsResponse>> {
  const params = new URLSearchParams();
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());
  
  const query = params.toString();
  const endpoint = query ? `/v1/metrics/contacts?${query}` : '/v1/metrics/contacts';
  
  return apiClient.get<ContactsMetricsResponse>(endpoint);
}

/**
 * Obtener objetivos mensuales
 * 
 * @param month - Mes (1-12), opcional, default: mes actual
 * @param year - Año, opcional, default: año actual
 */
export async function getMonthlyGoals(
  month?: number,
  year?: number
): Promise<ApiResponse<MonthlyGoal | null>> {
  const params = new URLSearchParams();
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());
  
  const query = params.toString();
  const endpoint = query ? `/v1/metrics/goals?${query}` : '/v1/metrics/goals';
  
  return apiClient.get<MonthlyGoal | null>(endpoint);
}

/**
 * Guardar/actualizar objetivos mensuales
 * 
 * @param data - Datos del objetivo mensual
 */
export async function saveMonthlyGoals(
  data: SaveMonthlyGoalRequest
): Promise<ApiResponse<MonthlyGoal>> {
  return apiClient.post<MonthlyGoal>('/v1/metrics/goals', data);
}

