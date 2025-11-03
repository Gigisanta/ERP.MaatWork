/**
 * API methods para AUM (Assets Under Management)
 * 
 * AI_DECISION: Centralizar métodos de AUM siguiendo patrón de otros dominios
 * Justificación: Elimina fetch directo, mejor error handling y retry automático
 * Impacto: Código más mantenible y consistente con resto de la aplicación
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
}): Promise<ApiResponse<AumRowsResponse>> {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', String(params.limit));
  if (params?.offset) queryParams.append('offset', String(params.offset));
  if (params?.broker) queryParams.append('broker', params.broker);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.fileId) queryParams.append('fileId', params.fileId);
  const preferredOnly = params?.preferredOnly ?? true;
  queryParams.append('preferredOnly', String(preferredOnly));

  const endpoint = `/v1/admin/aum/rows/all${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return apiClient.get<AumRowsResponse>(endpoint);
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

