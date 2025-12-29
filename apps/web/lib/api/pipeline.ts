/**
 * API methods para pipeline
 */

import { apiClient } from '../api-client';
import type { ApiResponse } from '../api-client';
import type { PipelineStage, PipelineStageWithContacts, PipelineBoard } from '@/types';

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
    toStageId: stageId,
  });
}

/**
 * Obtener board de pipeline (etapas con contactos agrupados)
 */
export async function getPipelineBoard(): Promise<ApiResponse<PipelineStageWithContacts[]>> {
  return apiClient.get<PipelineStageWithContacts[]>('/v1/pipeline/board');
}

// ==========================================================
// Helper Functions
// ==========================================================

/**
 * Obtiene la siguiente etapa del pipeline basada en el order
 *
 * @param stages - Array de etapas ordenadas por order
 * @param currentStageId - ID de la etapa actual (puede ser null)
 * @returns La siguiente etapa o null si no hay siguiente etapa
 */
export function getNextPipelineStage(
  stages: PipelineStage[],
  currentStageId: string | null
): PipelineStage | null {
  if (!currentStageId) {
    // Si no hay etapa actual, retornar la primera etapa
    const sortedStages = [...stages].sort((a, b) => a.order - b.order);
    return sortedStages[0] || null;
  }

  const currentStage = stages.find((s) => s.id === currentStageId);
  if (!currentStage) {
    return null;
  }

  // Ordenar etapas por order
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  // Encontrar el índice de la etapa actual
  const currentIndex = sortedStages.findIndex((s) => s.id === currentStageId);

  // Retornar la siguiente etapa (order + 1)
  if (currentIndex >= 0 && currentIndex < sortedStages.length - 1) {
    return sortedStages[currentIndex + 1];
  }

  return null;
}
