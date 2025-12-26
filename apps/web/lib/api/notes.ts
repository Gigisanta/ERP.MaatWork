/**
 * API methods para notes
 */

import { apiClient } from '../api-client';
import type { ApiResponse } from '../api-client';
import type { Note, CreateNoteRequest, UpdateNoteRequest } from '@/types';

// ==========================================================
// API Methods
// ==========================================================

/**
 * Listar notas
 */
export async function getNotes(params?: { contactId?: string }): Promise<ApiResponse<Note[]>> {
  const queryParams = new URLSearchParams();
  if (params?.contactId) queryParams.append('contactId', params.contactId);

  const endpoint = `/v1/notes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return apiClient.get<Note[]>(endpoint);
}

/**
 * Crear nota
 */
export async function createNote(data: CreateNoteRequest): Promise<ApiResponse<Note>> {
  return apiClient.post<Note>('/v1/notes', data);
}

/**
 * Actualizar nota
 */
export async function updateNote(id: string, data: UpdateNoteRequest): Promise<ApiResponse<Note>> {
  return apiClient.put<Note>(`/v1/notes/${id}`, data);
}

/**
 * Eliminar nota
 */
export async function deleteNote(id: string): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/v1/notes/${id}`);
}
