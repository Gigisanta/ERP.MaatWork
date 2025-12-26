/**
 * API methods para plan de carrera comercial
 */

import { apiClient } from '../api-client';
import type { ApiResponse } from '../api-client';
import type {
  CareerPlanLevel,
  CareerPlanLevelCreateRequest,
  CareerPlanLevelUpdateRequest,
  UserCareerProgress,
} from '@/types';

// ==========================================================
// API Methods
// ==========================================================

/**
 * Listar todos los niveles del plan de carrera
 */
export async function getCareerPlanLevels(): Promise<ApiResponse<CareerPlanLevel[]>> {
  return apiClient.get<CareerPlanLevel[]>('/v1/career-plan/levels');
}

/**
 * Obtener nivel específico por ID
 */
export async function getCareerPlanLevel(id: string): Promise<ApiResponse<CareerPlanLevel>> {
  return apiClient.get<CareerPlanLevel>(`/v1/career-plan/levels/${id}`);
}

/**
 * Crear nuevo nivel (solo admin)
 */
export async function createCareerPlanLevel(
  data: CareerPlanLevelCreateRequest
): Promise<ApiResponse<CareerPlanLevel>> {
  return apiClient.post<CareerPlanLevel>('/v1/career-plan/levels', data);
}

/**
 * Actualizar nivel existente (solo admin)
 */
export async function updateCareerPlanLevel(
  id: string,
  data: CareerPlanLevelUpdateRequest
): Promise<ApiResponse<CareerPlanLevel>> {
  return apiClient.put<CareerPlanLevel>(`/v1/career-plan/levels/${id}`, data);
}

/**
 * Eliminar nivel (solo admin)
 */
export async function deleteCareerPlanLevel(id: string): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/v1/career-plan/levels/${id}`);
}

/**
 * Obtener progreso del usuario actual en el plan de carrera
 */
export async function getUserCareerProgress(): Promise<ApiResponse<UserCareerProgress>> {
  return apiClient.get<UserCareerProgress>('/v1/career-plan/user-progress');
}
