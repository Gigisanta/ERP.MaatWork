/**
 * API methods para AUM (Assets Under Management)
 * 
 * AI_DECISION: Centralizar métodos de AUM siguiendo patrón de otros dominios
 * Justificación: Elimina fetch directo, mejor error handling y retry automático
 * Impacto: Código más mantenible y consistente con resto de la aplicación
 */

import { apiClient } from '../api-client';
import type { ApiResponse } from '../api-client';

// ==========================================================
// Types
// ==========================================================

export interface AumFile {
  id: string;
  broker: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByUserId: string;
  status: string;
  totalParsed: number;
  totalMatched: number;
  totalUnmatched: number;
  createdAt: string;
}

export interface AumRow {
  id: string;
  fileId: string;
  accountNumber: string | null;
  holderName: string | null;
  advisorRaw: string | null;
  matchedContactId: string | null;
  matchedUserId: string | null;
  matchStatus: 'matched' | 'ambiguous' | 'unmatched';
  isPreferred: boolean;
  conflictDetected: boolean;
  rowCreatedAt: string;
  file?: AumFile;
  contact?: {
    id: string;
    fullName: string;
    firstName: string;
    lastName: string;
  } | null;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface AumUploadResponse {
  ok: boolean;
  fileId: string;
  filename: string;
  totals: {
    parsed: number;
    matched: number;
    ambiguous: number;
    conflicts: number;
    unmatched: number;
  };
}

export interface AumMatchRequest {
  rowId: string;
  matchedContactId?: string | null;
  matchedUserId?: string | null;
  isPreferred?: boolean;
}

export interface AumRowsResponse {
  rows: AumRow[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface AumDuplicatesResponse {
  ok: boolean;
  accountNumber: string;
  rows: AumRow[];
  hasConflicts: boolean;
}

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
}): Promise<ApiResponse<AumRowsResponse>> {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', String(params.limit));
  if (params?.offset) queryParams.append('offset', String(params.offset));
  if (params?.broker) queryParams.append('broker', params.broker);
  if (params?.status) queryParams.append('status', params.status);

  const endpoint = `/v1/admin/aum/rows/all${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return apiClient.get<AumRowsResponse>(endpoint);
}

/**
 * Subir archivo AUM
 */
export async function uploadAumFile(
  file: File,
  broker: string = 'balanz'
): Promise<ApiResponse<AumUploadResponse>> {
  const formData = new FormData();
  formData.append('file', file);

  // Para FormData, necesitamos usar fetch directamente ya que apiClient usa JSON.stringify
  // Pero mejoramos el manejo de errores
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const response = await fetch(`${apiUrl}/v1/admin/aum/uploads?broker=${broker}`, {
    method: 'POST',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Error al subir archivo');
  }

  const data = await response.json();
  return data;
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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return `${apiUrl}/v1/admin/aum/uploads/${fileId}/export`;
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

