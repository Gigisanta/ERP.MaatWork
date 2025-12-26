/**
 * API methods para users/advisors
 */

import { apiClient } from '../api-client';
import type { ApiResponse } from '../api-client';
import type { UserApiResponse, Advisor } from '@/types';

// ==========================================================
// API Methods
// ==========================================================

/**
 * Listar advisors
 */
export async function getAdvisors(): Promise<ApiResponse<Advisor[]>> {
  return apiClient.get<Advisor[]>('/v1/users/advisors');
}

/**
 * Listar usuarios
 */
async function getUsers(): Promise<ApiResponse<UserApiResponse[]>> {
  return apiClient.get<UserApiResponse[]>('/v1/users');
}

/**
 * Obtener usuario por ID
 */
export async function getUserById(id: string): Promise<ApiResponse<UserApiResponse>> {
  return apiClient.get<UserApiResponse>(`/v1/users/${id}`);
}

/**
 * Obtener información del usuario actual
 */
export async function getCurrentUser(): Promise<ApiResponse<UserApiResponse>> {
  return apiClient.get<UserApiResponse>('/v1/users/me');
}

/**
 * Actualizar perfil del usuario actual
 */
export async function updateUserProfile(data: {
  phone: string;
  fullName?: string;
}): Promise<ApiResponse<UserApiResponse>> {
  return apiClient.patch<UserApiResponse>('/v1/users/me', data);
}

/**
 * Cambiar contraseña del usuario actual
 */
export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<ApiResponse<void>> {
  return apiClient.post<void>('/v1/users/change-password', data);
}

/**
 * Obtener managers
 */
export async function getManagers(): Promise<ApiResponse<UserApiResponse[]>> {
  return apiClient.get<UserApiResponse[]>('/v1/users/managers');
}

/**
 * Actualizar rol de usuario
 */
export async function updateUserRole(
  userId: string,
  role: 'admin' | 'manager' | 'advisor' | 'owner' | 'staff'
): Promise<ApiResponse<UserApiResponse>> {
  return apiClient.patch<UserApiResponse>(`/v1/users/${userId}/role`, { role });
}

/**
 * Actualizar estado de usuario (active/inactive)
 */
export async function updateUserStatus(
  userId: string,
  isActive: boolean
): Promise<ApiResponse<UserApiResponse>> {
  return apiClient.patch<UserApiResponse>(`/v1/users/${userId}/status`, { isActive });
}

/**
 * Eliminar usuario
 */
export async function deleteUser(id: string): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/v1/users/${id}`);
}

/**
 * Listar usuarios pendientes de aprobación (admin)
 */
export async function getPendingUsers(): Promise<ApiResponse<UserApiResponse[]>> {
  return apiClient.get<UserApiResponse[]>('/v1/users/pending');
}

/**
 * Aprobar usuario pendiente (admin)
 */
export async function approveUser(id: string): Promise<ApiResponse<UserApiResponse>> {
  return apiClient.post<UserApiResponse>(`/v1/users/${id}/approve`, {});
}

/**
 * Rechazar usuario pendiente (admin)
 */
export async function rejectUser(id: string): Promise<ApiResponse<void>> {
  return apiClient.post<void>(`/v1/users/${id}/reject`, {});
}
