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
 * Obtener todos los portfolios
 */
export async function getPortfolios(): Promise<ApiResponse<Portfolio[]>> {
  return apiClient.get<Portfolio[]>('/v1/portfolios/templates');
}

/**
 * Obtener portfolio por ID
 */
export async function getPortfolioById(id: string): Promise<ApiResponse<PortfolioWithLines>> {
  return apiClient.get<PortfolioWithLines>(`/v1/portfolios/templates/${id}`);
}

/**
 * Obtener líneas de portfolio
 */
export async function getPortfolioLines(id: string): Promise<ApiResponse<{ lines: PortfolioLine[] }>> {
  return apiClient.get<{ lines: PortfolioLine[] }>(`/v1/portfolios/templates/${id}/lines`);
}

/**
 * Obtener líneas de múltiples portfolios (batch)
 */
export async function getPortfolioLinesBatch(ids: string[]): Promise<ApiResponse<Record<string, PortfolioLine[]>>> {
  return apiClient.get<Record<string, PortfolioLine[]>>(
    `/v1/portfolios/templates/lines/batch?ids=${ids.join(',')}`
  );
}

/**
 * Crear portfolio
 */
export async function createPortfolio(data: CreatePortfolioRequest): Promise<ApiResponse<Portfolio>> {
  return apiClient.post<Portfolio>('/v1/portfolios/templates', data);
}

/**
 * Actualizar portfolio
 */
export async function updatePortfolio(
  id: string,
  data: UpdatePortfolioRequest
): Promise<ApiResponse<Portfolio>> {
  return apiClient.put<Portfolio>(`/v1/portfolios/templates/${id}`, data);
}

/**
 * Eliminar portfolio
 */
export async function deletePortfolio(id: string): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/v1/portfolios/templates/${id}`);
}

/**
 * Agregar línea a portfolio
 */
export async function addPortfolioLine(
  portfolioId: string,
  data: AddPortfolioLineRequest
): Promise<ApiResponse<PortfolioLine>> {
  return apiClient.post<PortfolioLine>(
    `/v1/portfolios/templates/${portfolioId}/lines`,
    data
  );
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
    `/v1/portfolios/templates/${portfolioId}/lines/${lineId}`,
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
  return apiClient.delete<void>(
    `/v1/portfolios/templates/${portfolioId}/lines/${lineId}`
  );
}

