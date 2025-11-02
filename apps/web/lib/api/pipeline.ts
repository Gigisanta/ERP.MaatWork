/**
 * API methods para pipeline
 */

import { apiClient } from '../api-client';
import type { ApiResponse } from '../api-client';
import type { PipelineStage, PipelineStageWithContacts, PipelineBoard } from '@/types/pipeline';

// ==========================================================
// API Methods
// ==========================================================

/**
 * Listar etapas de pipeline
 */
export async function getPipelineStages(): Promise<ApiResponse<PipelineStage[]>> {
  return apiClient.get<PipelineStage[]>('/v1/pipeline/stages');
}

/**
 * Mover contacto entre etapas
 */
export async function moveContactToStage(
  contactId: string,
  stageId: string
): Promise<ApiResponse<void>> {
  return apiClient.post<void>(`/v1/pipeline/move`, {
    contactId,
    stageId
  });
}

/**
 * Obtener board de pipeline (etapas con contactos agrupados)
 */
export async function getPipelineBoard(): Promise<ApiResponse<PipelineStageWithContacts[]>> {
  return apiClient.get<PipelineStageWithContacts[]>('/v1/pipeline/board');
}

