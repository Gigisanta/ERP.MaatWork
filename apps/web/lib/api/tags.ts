/**
 * API methods para tags
 */

import { apiClient } from '../api-client';
import type { ApiResponse } from '../api-client';
import type {
  Tag,
  CreateTagRequest,
  UpdateTagRequest,
  ContactTagWithDetails,
  UpdateContactTagRequest,
} from '@/types/tag';

// ==========================================================
// API Methods
// ==========================================================

/**
 * Mapear entityType (frontend) a scope (backend)
 *
 * AI_DECISION: Mapeo entityType → scope para compatibilidad
 * Justificación: Frontend usa entityType pero backend requiere scope
 * Impacto: Transformación transparente en cliente API
 */
function mapEntityTypeToScope(
  entityType: 'contact' | 'task' | 'note'
): 'contact' | 'meeting' | 'note' {
  const mapping: Record<'contact' | 'task' | 'note', 'contact' | 'meeting' | 'note'> = {
    contact: 'contact',
    task: 'meeting',
    note: 'note',
  };
  return mapping[entityType];
}

/**
 * Listar tags
 *
 * @param entityType - Tipo de entidad (frontend). Se mapea a 'scope' para el backend
 */
export async function getTags(
  entityType?: 'contact' | 'task' | 'note'
): Promise<ApiResponse<Tag[]>> {
  const endpoint = entityType ? `/v1/tags?scope=${mapEntityTypeToScope(entityType)}` : '/v1/tags';
  return apiClient.get<Tag[]>(endpoint);
}

/**
 * Crear tag
 *
 * Transforma entityType (frontend) a scope (backend) antes de enviar.
 * Si se proporciona scope explícitamente, se usa directamente (override).
 *
 * @param data - Request con entityType (se transforma internamente a scope)
 */
export async function createTag(data: CreateTagRequest): Promise<ApiResponse<Tag>> {
  // Transformar entityType → scope para el backend
  // Si scope está presente, usarlo directamente (override del mapeo)
  const { entityType, scope, ...rest } = data;
  const requestBody = {
    ...rest,
    scope: scope ?? mapEntityTypeToScope(entityType),
  };

  return apiClient.post<Tag>('/v1/tags', requestBody);
}

/**
 * Actualizar tag
 */
export async function updateTag(id: string, data: UpdateTagRequest): Promise<ApiResponse<Tag>> {
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
 *
 * @param contactId - ID del contacto
 * @param add - Array de tag IDs o nombres a agregar
 * @param remove - Array de tag IDs a remover
 */
export async function updateContactTags(
  contactId: string,
  add: string[],
  remove: string[]
): Promise<ApiResponse<Tag[]>> {
  return apiClient.put<Tag[]>(`/v1/tags/contacts/${contactId}`, { add, remove });
}

/**
 * Obtener datos de relación contacto-etiqueta específica
 *
 * @param contactId - ID del contacto
 * @param tagId - ID de la etiqueta
 */
export async function getContactTag(
  contactId: string,
  tagId: string
): Promise<ApiResponse<ContactTagWithDetails>> {
  return apiClient.get<ContactTagWithDetails>(`/v1/tags/contacts/${contactId}/tags/${tagId}`);
}

/**
 * Actualizar datos de relación contacto-etiqueta
 * Solo disponible para etiquetas con businessLine 'zurich'
 *
 * @param contactId - ID del contacto
 * @param tagId - ID de la etiqueta
 * @param data - Datos a actualizar (monthlyPremium, policyNumber)
 */
export async function updateContactTag(
  contactId: string,
  tagId: string,
  data: UpdateContactTagRequest
): Promise<ApiResponse<ContactTagWithDetails>> {
  return apiClient.put<ContactTagWithDetails>(`/v1/tags/contacts/${contactId}/tags/${tagId}`, data);
}
