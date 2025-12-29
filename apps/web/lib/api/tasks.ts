/**
 * API methods para tasks
 */

import { apiClient } from './client';
import type { ApiResponse } from '../api-client';
import type { Task, CreateTaskRequest, UpdateTaskRequest } from '@/types';

// ==========================================================
// API Methods
// ==========================================================

/**
 * Listar tareas
 */
export async function getTasks(params?: {
  contactId?: string;
  assignedToId?: string;
  status?: string;
}): Promise<ApiResponse<Task[]>> {
  const queryParams = new URLSearchParams();
  if (params?.contactId) queryParams.append('contactId', params.contactId);
  if (params?.assignedToId) queryParams.append('assignedToId', params.assignedToId);
  if (params?.status) queryParams.append('status', params.status);

  const endpoint = `/v1/tasks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return apiClient.get<Task[]>(endpoint);
}

/**
 * Crear tarea
 */
export async function createTask(data: CreateTaskRequest): Promise<ApiResponse<Task>> {
  return apiClient.post<Task>('/v1/tasks', data);
}

/**
 * Actualizar tarea
 */
export async function updateTask(id: string, data: UpdateTaskRequest): Promise<ApiResponse<Task>> {
  return apiClient.put<Task>(`/v1/tasks/${id}`, data);
}

/**
 * Eliminar tarea
 */
export async function deleteTask(id: string): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/v1/tasks/${id}`);
}
