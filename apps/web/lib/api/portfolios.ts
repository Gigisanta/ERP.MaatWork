/**
 * API methods para portfolios
 *
 * AI_DECISION: Separar métodos de API por dominio
 * Justificación: Mantiene archivos pequeños, fácil de encontrar métodos
 * Impacto: Mejor organización del código
 */

import { apiClient } from '../api-client';
import type {
  ApiResponse,
  Portfolio,
  PortfolioLine,
  PortfolioWithLines,
  CreatePortfolioRequest,
  UpdatePortfolioRequest,
  AddPortfolioLineRequest,
} from '@/types';

/**
 * Parámetros para listar portfolios
 */
export interface GetPortfoliosParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'clientCount' | 'lineCount';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Metadata de paginación
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Respuesta paginada de portfolios
 */
export interface PaginatedPortfoliosResponse {
  data: Portfolio[];
  pagination: PaginationMeta;
}

/**
 * Obtener portfolios con soporte para paginación, búsqueda y filtros
 * 
 * @param params - Opciones de consulta
 * @returns Respuesta paginada con portfolios y metadata
 */
export async function getPortfolios(params?: GetPortfoliosParams): Promise<ApiResponse<PaginatedPortfoliosResponse>> {
  const queryParams = new URLSearchParams();
  
  // Add pagination params
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));
  
  // Add search
  if (params?.search) queryParams.append('search', params.search);
  
  // Add sorting
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

  return apiClient.get<PaginatedPortfoliosResponse>(`/v1/portfolios?${queryParams.toString()}`);
}


/**
 * Obtener portfolio por ID
 */
export async function getPortfolioById(id: string): Promise<ApiResponse<PortfolioWithLines>> {
  return apiClient.get<PortfolioWithLines>(`/v1/portfolios/${id}`);
}

/**
 * Obtener líneas de portfolio
 */
export async function getPortfolioLines(
  id: string
): Promise<ApiResponse<{ lines: PortfolioLine[] }>> {
  return apiClient.get<{ lines: PortfolioLine[] }>(`/v1/portfolios/${id}/lines`);
}

/**
 * Obtener líneas de múltiples portfolios (batch)
 */
export async function getPortfolioLinesBatch(
  ids: string[]
): Promise<ApiResponse<Record<string, PortfolioLine[]>>> {
  return apiClient.get<Record<string, PortfolioLine[]>>(
    `/v1/portfolios/lines/batch?ids=${ids.join(',')}`
  );
}

/**
 * Crear portfolio
 */
export async function createPortfolio(
  data: CreatePortfolioRequest
): Promise<ApiResponse<Portfolio>> {
  return apiClient.post<Portfolio>('/v1/portfolios', data);
}

/**
 * Actualizar portfolio
 */
export async function updatePortfolio(
  id: string,
  data: UpdatePortfolioRequest
): Promise<ApiResponse<Portfolio>> {
  return apiClient.put<Portfolio>(`/v1/portfolios/${id}`, data);
}

/**
 * Eliminar portfolio
 */
export async function deletePortfolio(id: string): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/v1/portfolios/${id}`);
}

/**
 * Agregar línea a portfolio
 */
export async function addPortfolioLine(
  portfolioId: string,
  data: AddPortfolioLineRequest
): Promise<ApiResponse<PortfolioLine>> {
  return apiClient.post<PortfolioLine>(`/v1/portfolios/${portfolioId}/lines`, data);
}

/**
 * Actualizar línea de portfolio
 */
export async function updatePortfolioLine(
  portfolioId: string,
  lineId: string,
  data: Partial<AddPortfolioLineRequest>
): Promise<ApiResponse<PortfolioLine>> {
  return apiClient.put<PortfolioLine>(
    `/v1/portfolios/${portfolioId}/lines/${lineId}`,
    data
  );
}

/**
 * Eliminar línea de portfolio
 */
export async function deletePortfolioLine(
  portfolioId: string,
  lineId: string
): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/v1/portfolios/${portfolioId}/lines/${lineId}`);
}
