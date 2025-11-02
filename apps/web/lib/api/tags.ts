/**
 * API methods para tags
 */

import { apiClient } from '../api-client';
import type { ApiResponse } from '../api-client';
import type { Tag, CreateTagRequest, UpdateTagRequest } from '@/types/tag';

// ==========================================================
// API Methods
// ==========================================================

/**
 * Listar tags
 */
export async function getTags(entityType?: 'contact' | 'task' | 'note'): Promise<ApiResponse<Tag[]>> {
  const endpoint = entityType 
    ? `/v1/tags?entityType=${entityType}`
    : '/v1/tags';
  return apiClient.get<Tag[]>(endpoint);
}

/**
 * Crear tag
 */
export async function createTag(data: CreateTagRequest): Promise<ApiResponse<Tag>> {
  return apiClient.post<Tag>('/v1/tags', data);
}

/**
 * Actualizar tag
 */
export async function updateTag(
  id: string,
  data: UpdateTagRequest
): Promise<ApiResponse<Tag>> {
  return apiClient.put<Tag>(`/v1/tags/${id}`, data);
}

/**
 * Eliminar tag
 */
export async function deleteTag(id: string): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/v1/tags/${id}`);
}

/**
 * Actualizar tags de un contacto
 */
export async function updateContactTags(
  contactId: string,
  tagIds: string[]
): Promise<ApiResponse<void>> {
  return apiClient.put<void>(`/v1/tags/contacts/${contactId}`, { tagIds });
}

