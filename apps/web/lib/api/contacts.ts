/**
 * API methods para contacts
 */

import { apiClient } from '../api-client';
import type { ApiResponse } from '../api-client';
import type {
  Contact,
  CreateContactRequest,
  UpdateContactRequest,
  ContactFieldValue,
  ContactFieldUpdate
} from '@/types/contact';
import type { AssignPortfolioRequest, AssignPortfolioResponse, PortfolioAssignment } from '@/types/portfolio-assignment';

// ==========================================================
// API Methods
// ==========================================================

/**
 * Listar contactos
 */
export async function getContacts(params?: {
  advisorId?: string;
  stageId?: string;
  tagIds?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<Contact[]>> {
  const queryParams = new URLSearchParams();
  if (params?.advisorId) queryParams.append('advisorId', params.advisorId);
  if (params?.stageId) queryParams.append('stageId', params.stageId);
  if (params?.tagIds?.length) queryParams.append('tagIds', params.tagIds.join(','));
  if (params?.search) queryParams.append('search', params.search);
  if (params?.limit) queryParams.append('limit', String(params.limit));
  if (params?.offset) queryParams.append('offset', String(params.offset));

  const endpoint = `/v1/contacts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return apiClient.get<Contact[]>(endpoint);
}

/**
 * Obtener contacto por ID
 */
export async function getContactById(id: string): Promise<ApiResponse<Contact>> {
  return apiClient.get<Contact>(`/v1/contacts/${id}`);
}

/**
 * Crear contacto
 */
export async function createContact(data: CreateContactRequest): Promise<ApiResponse<Contact>> {
  return apiClient.post<Contact>('/v1/contacts', data);
}

/**
 * Actualizar contacto
 */
export async function updateContact(
  id: string,
  data: UpdateContactRequest
): Promise<ApiResponse<Contact>> {
  return apiClient.patch<Contact>(`/v1/contacts/${id}`, data);
}

/**
 * Eliminar contacto
 */
export async function deleteContact(id: string): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/v1/contacts/${id}`);
}

/**
 * Actualizar campos específicos de contacto
 */
export async function updateContactField(
  contactId: string,
  field: string,
  value: ContactFieldValue
): Promise<ApiResponse<Contact>> {
  return apiClient.patch<Contact>(`/v1/contacts/${contactId}`, {
    fields: [{ field, value }]
  });
}

/**
 * Asignar portfolio a contacto
 */
export async function assignPortfolioToContact(
  contactId: string,
  data: AssignPortfolioRequest
): Promise<ApiResponse<AssignPortfolioResponse>> {
  return apiClient.post<AssignPortfolioResponse>(`/v1/contacts/${contactId}/portfolio-assignments`, data);
}

/**
 * Eliminar asignación de portfolio
 */
export async function removePortfolioAssignment(assignmentId: string): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/v1/portfolio-assignments/${assignmentId}`);
}

/**
 * Actualizar estado de asignación de portfolio
 */
export async function updatePortfolioAssignmentStatus(
  assignmentId: string,
  status: 'active' | 'paused' | 'ended'
): Promise<ApiResponse<PortfolioAssignment>> {
  return apiClient.patch<PortfolioAssignment>(`/v1/portfolio-assignments/${assignmentId}`, { status });
}

