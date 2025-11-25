/**
 * API methods para AUM (Assets Under Management)
 * 
 * AI_DECISION: Centralizar métodos de AUM siguiendo patrón de otros dominios + validación Zod
 * Justificación: Elimina fetch directo, mejor error handling, retry automático, runtime validation
 * Impacto: Código más mantenible, consistente y robusto contra cambios de API
 */

import { apiClient } from '../api-client';
import type { ApiResponse } from '../api-client';
import { API_BASE_URL } from '../api-url';
import type {
  AumFile,
  AumRow,
  AumUploadResponse,
  AumMatchRequest,
  AumRowsResponse,
  AumDuplicatesResponse
} from '@/types/aum';
import {
  aumRowsResponseSchema,
  aumUploadResponseSchema,
  aumHistoryResponseSchema,
  aumMatchRowResponseSchema
} from './aum-validation';

// ==========================================================
// API Methods
// ==========================================================

/**
 * Listar todas las filas AUM con paginación y filtros
 */
export async function getAumRows(params?: {
  limit?: number;
  offset?: number;
  broker?: string;
  status?: string;
  fileId?: string;
  preferredOnly?: boolean;
  search?: string;
  onlyUpdated?: boolean;
}): Promise<ApiResponse<AumRowsResponse>> {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', String(params.limit));
  if (params?.offset) queryParams.append('offset', String(params.offset));
  if (params?.broker) queryParams.append('broker', params.broker);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.fileId) queryParams.append('fileId', params.fileId);
  const preferredOnly = params?.preferredOnly ?? false;
  queryParams.append('preferredOnly', String(preferredOnly));
  if (params?.search) queryParams.append('search', params.search);
  const onlyUpdated = params?.onlyUpdated ?? false;
  queryParams.append('onlyUpdated', String(onlyUpdated));

  const endpoint = `/v1/admin/aum/rows/all${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await apiClient.get<AumRowsResponse>(endpoint);
  
  // AI_DECISION: Validar respuesta en runtime con Zod
  // Justificación: Previene errores silenciosos por cambios en API, mejora debugging
  // Impacto: Mayor robustez, mensajes de error claros
  try {
    const validated = aumRowsResponseSchema.parse(response.data);
    return { ...response, data: validated } as ApiResponse<AumRowsResponse>;
  } catch (error) {
    console.error('[AUM API] Validation error:', error);
    throw new Error(`API response validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Subir archivo AUM con retry logic
 * 
 * AI_DECISION: Implementar retry con exponential backoff para FormData uploads
 * Justificación: FormData no tiene retry automático como apiClient, necesitamos manejarlo manualmente
 * Impacto: Mejor resiliencia ante errores de red temporales
 */
export async function uploadAumFile(
  file: File,
  broker: string = 'balanz',
  maxRetries: number = 3
): Promise<ApiResponse<AumUploadResponse>> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const data = await apiClient.post<AumUploadResponse>(
        `/v1/admin/aum/uploads?broker=${broker}`,
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

/**
 * Obtener vista previa de archivo AUM
 */
export async function getAumFilePreview(fileId: string): Promise<ApiResponse<{
  ok: boolean;
  file: AumFile;
  rows: AumRow[];
}>> {
  return apiClient.get<{ ok: boolean; file: AumFile; rows: AumRow[] }>(
    `/v1/admin/aum/uploads/${fileId}/preview`
  );
}

/**
 * Exportar archivo AUM a CSV
 */
export function getAumFileExportUrl(fileId: string): string {
  return `${API_BASE_URL}/v1/admin/aum/uploads/${fileId}/export`;
}

/**
 * Matchear fila AUM con contacto/usuario
 */
export async function matchAumRow(
  fileId: string,
  matchData: AumMatchRequest
): Promise<ApiResponse<void>> {
  return apiClient.post<void>(
    `/v1/admin/aum/uploads/${fileId}/match`,
    matchData
  );
}

/**
 * Obtener filas duplicadas por número de cuenta
 */
export async function getAumDuplicates(
  accountNumber: string
): Promise<ApiResponse<AumDuplicatesResponse>> {
  return apiClient.get<AumDuplicatesResponse>(
    `/v1/admin/aum/rows/duplicates/${accountNumber}`
  );
}

/**
 * Commit archivo AUM (confirmar sincronización)
 */
export async function commitAumFile(fileId: string): Promise<ApiResponse<void>> {
  // Este endpoint usa POST sin body
  return apiClient.post<void>(`/v1/admin/aum/uploads/${fileId}/commit`);
}

/**
 * Limpiar duplicados AUM manteniendo solo la fila más reciente por broker+accountNumber
 */
export async function cleanupAumDuplicates(): Promise<ApiResponse<{
  ok: boolean;
  message: string;
  deletedCount: number;
}>> {
  return apiClient.post<{
    ok: boolean;
    message: string;
    deletedCount: number;
  }>('/v1/admin/aum/cleanup-duplicates');
}

/**
 * Resetear completamente el sistema AUM (eliminar todo)
 */
export async function resetAumSystem(): Promise<ApiResponse<{
  ok: boolean;
  message: string;
}>> {
  return apiClient.post<{
    ok: boolean;
    message: string;
  }>('/v1/admin/aum/reset-all');
}

/**
 * Actualizar asesor de una fila AUM y marcarla como normalizada
 * 
 * @param rowId - ID de la fila AUM a actualizar
 * @param advisorRaw - Nombre del asesor (fullName o email)
 * @param matchedUserId - ID del usuario asesor asignado
 * @returns Promise con la respuesta de la API
 * @throws Error si la actualización falla
 * 
 * AI_DECISION: Función dedicada para actualización de asesor
 * Justificación: Encapsula la lógica de actualización y permite mejor manejo de errores
 * Impacto: Mejor trazabilidad y manejo de errores consistente
 */
export async function updateAumRowAdvisor(
  rowId: string,
  advisorRaw: string,
  matchedUserId: string
): Promise<ApiResponse<void>> {
  // Validación temprana de parámetros
  if (!rowId || rowId.trim().length === 0) {
    throw new Error('El ID de la fila es requerido');
  }
  
  if (!advisorRaw || advisorRaw.trim().length === 0) {
    throw new Error('El nombre del asesor es requerido');
  }
  
  if (!matchedUserId || matchedUserId.trim().length === 0) {
    throw new Error('El ID del usuario asesor es requerido');
  }

  return apiClient.patch<void>(
    `/v1/admin/aum/rows/${rowId}`,
    { 
      advisorRaw: advisorRaw.trim(), 
      matchedUserId: matchedUserId.trim() 
    }
  );
}

/**
 * Subir archivo de mapeo asesor-cuenta
 * 
 * AI_DECISION: Implementar retry con exponential backoff para FormData uploads
 * Justificación: FormData no tiene retry automático como apiClient, necesitamos manejarlo manualmente
 * Impacto: Mejor resiliencia ante errores de red temporales
 */
export async function uploadAdvisorMapping(
  file: File,
  maxRetries: number = 3
): Promise<ApiResponse<{
  ok: boolean;
  message: string;
  totals: {
    inserted: number;
    updated: number;
    errors: number;
    total: number;
  };
}>> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const data = await apiClient.post<{
        ok: boolean;
        message: string;
        totals: {
          inserted: number;
          updated: number;
          errors: number;
          total: number;
        };
      }>(
        `/v1/admin/aum/advisor-mapping/upload`,
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

