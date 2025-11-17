/**
 * API methods para automatizaciones
 */

import { apiClient } from '../api-client';
import type { ApiResponse } from '../api-client';
import type { 
  AutomationConfig, 
  CreateAutomationConfigRequest, 
  UpdateAutomationConfigRequest 
} from '@/types/automation';

// ==========================================================
// API Methods
// ==========================================================

/**
 * Listar configuraciones de automatización
 */
export async function getAutomationConfigs(): Promise<ApiResponse<AutomationConfig[]>> {
  return apiClient.get<AutomationConfig[]>('/v1/automations');
}

/**
 * Obtener configuración de automatización por ID
 */
export async function getAutomationConfigById(id: string): Promise<ApiResponse<AutomationConfig>> {
  return apiClient.get<AutomationConfig>(`/v1/automations/${id}`);
}

/**
 * Obtener configuración de automatización por nombre
 */
export async function getAutomationConfigByName(name: string): Promise<ApiResponse<AutomationConfig>> {
  return apiClient.get<AutomationConfig>(`/v1/automations/by-name/${name}`);
}

/**
 * Crear configuración de automatización
 */
export async function createAutomationConfig(
  data: CreateAutomationConfigRequest
): Promise<ApiResponse<AutomationConfig>> {
  return apiClient.post<AutomationConfig>('/v1/automations', data);
}

/**
 * Actualizar configuración de automatización
 */
export async function updateAutomationConfig(
  id: string,
  data: UpdateAutomationConfigRequest
): Promise<ApiResponse<AutomationConfig>> {
  return apiClient.patch<AutomationConfig>(`/v1/automations/${id}`, data);
}

/**
 * Eliminar configuración de automatización
 */
export async function deleteAutomationConfig(id: string): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/v1/automations/${id}`);
}






