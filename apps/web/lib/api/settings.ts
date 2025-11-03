import { apiClient } from '../api-client';
import type { ApiResponse } from '../api-client';

export interface AdvisorAliasDto {
  id: string;
  aliasRaw: string;
  aliasNormalized: string;
  userId: string;
  createdAt: string;
}

export async function listAdvisorAliases(): Promise<ApiResponse<{ aliases: AdvisorAliasDto[] }>> {
  return apiClient.get<{ aliases: AdvisorAliasDto[] }>('/v1/admin/settings/advisors/aliases');
}

export async function createAdvisorAlias(data: { alias: string; userId: string }): Promise<ApiResponse<{ alias: AdvisorAliasDto }>> {
  return apiClient.post<{ alias: AdvisorAliasDto }>('/v1/admin/settings/advisors/aliases', data);
}

export async function updateAdvisorAlias(id: string, data: { alias?: string; userId?: string }): Promise<ApiResponse<void>> {
  return apiClient.put<void>(`/v1/admin/settings/advisors/aliases/${id}`, data);
}

export async function deleteAdvisorAlias(id: string): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/v1/admin/settings/advisors/aliases/${id}`);
}


