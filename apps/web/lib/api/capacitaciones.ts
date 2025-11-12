/**
 * API methods para capacitaciones
 */

import { apiClient } from '../api-client';
import type { ApiResponse } from '../api-client';
import type {
  Capacitacion,
  CreateCapacitacionRequest,
  UpdateCapacitacionRequest,
  ImportCapacitacionesResponse,
  ListCapacitacionesParams,
  CapacitacionesListResponse
} from '@/types/capacitaciones';

// ==========================================================
// API Methods
// ==========================================================

/**
 * Listar capacitaciones con filtros y paginación
 */
export async function getCapacitaciones(
  params?: ListCapacitacionesParams
): Promise<ApiResponse<CapacitacionesListResponse>> {
  const queryParams = new URLSearchParams();
  if (params?.tema) queryParams.append('tema', params.tema);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.limit) queryParams.append('limit', String(params.limit));
  if (params?.offset) queryParams.append('offset', String(params.offset));

  const endpoint = `/v1/capacitaciones${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await apiClient.get<CapacitacionesListResponse>(endpoint);
  return response;
}

/**
 * Obtener capacitación por ID
 */
export async function getCapacitacionById(id: string): Promise<ApiResponse<Capacitacion>> {
  return apiClient.get<Capacitacion>(`/v1/capacitaciones/${id}`);
}

/**
 * Crear capacitación manual
 */
export async function createCapacitacion(
  data: CreateCapacitacionRequest
): Promise<ApiResponse<Capacitacion>> {
  return apiClient.post<Capacitacion>('/v1/capacitaciones', data);
}

/**
 * Actualizar capacitación
 */
export async function updateCapacitacion(
  id: string,
  data: UpdateCapacitacionRequest
): Promise<ApiResponse<Capacitacion>> {
  return apiClient.put<Capacitacion>(`/v1/capacitaciones/${id}`, data);
}

/**
 * Eliminar capacitación
 */
export async function deleteCapacitacion(id: string): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/v1/capacitaciones/${id}`);
}

/**
 * Importar capacitaciones desde CSV
 * 
 * Similar a uploadAumFile, maneja FormData para subida de archivos
 */
export async function importCapacitacionesCSV(
  file: File,
  maxRetries: number = 3
): Promise<ApiResponse<ImportCapacitacionesResponse>> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const data = await apiClient.post<ImportCapacitacionesResponse>(
        '/v1/capacitaciones/import',
        formData,
        { retries: 0 } // manual retry handled here
      );
      return data;
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx) except 408, 429
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status as number;
        if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
          throw error;
        }
      }

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  // All retries exhausted
  throw lastError;
}










