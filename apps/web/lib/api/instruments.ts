/**
 * API methods para instruments
 */

import { apiClient } from '../api-client';
import type {
  ApiResponse,
  Instrument,
  InstrumentSearchResult,
  InstrumentValidation,
  CreateInstrumentRequest,
  CreateInstrumentResponse,
} from '@/types';

/**
 * Buscar instrumentos
 */
export async function searchInstruments(
  query: string
): Promise<ApiResponse<InstrumentSearchResult[]>> {
  return apiClient.post<InstrumentSearchResult[]>('/v1/instruments/search', { query });
}

/**
 * Validar símbolo
 */
export async function validateSymbol(symbol: string): Promise<ApiResponse<InstrumentValidation>> {
  return apiClient.get<InstrumentValidation>(`/v1/instruments/search/validate/${symbol}`);
}

/**
 * Obtener todos los instrumentos
 */
export async function getInstruments(params?: {
  search?: string;
  assetClass?: string;
  active?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<{ instruments: Instrument[]; total: number }>> {
  const queryParams = new URLSearchParams();

  if (params?.search) queryParams.append('search', params.search);
  if (params?.assetClass) queryParams.append('assetClass', params.assetClass);
  if (params?.active !== undefined) queryParams.append('active', String(params.active));
  if (params?.limit) queryParams.append('limit', String(params.limit));
  if (params?.offset) queryParams.append('offset', String(params.offset));

  const endpoint = `/v1/instruments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return apiClient.get<{ instruments: Instrument[]; total: number }>(endpoint);
}

/**
 * Obtener instrumento por ID
 */
export async function getInstrumentById(id: string): Promise<ApiResponse<Instrument>> {
  return apiClient.get<Instrument>(`/v1/instruments/${id}`);
}

/**
 * Crear instrumento con backfill
 */
export async function createInstrument(
  data: CreateInstrumentRequest
): Promise<ApiResponse<CreateInstrumentResponse>> {
  return apiClient.post<CreateInstrumentResponse>('/v1/instruments', data);
}

/**
 * Actualizar instrumento
 */
export async function updateInstrument(
  id: string,
  data: Partial<Omit<Instrument, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<ApiResponse<Instrument>> {
  return apiClient.put<Instrument>(`/v1/instruments/${id}`, data);
}

/**
 * Eliminar instrumento (soft delete)
 */
export async function deleteInstrument(id: string): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/v1/instruments/${id}`);
}
