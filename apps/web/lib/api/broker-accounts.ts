/**
 * API methods para broker accounts
 */

import { apiClient } from '../api-client';
import type { ApiResponse } from '../api-client';
import type { BrokerAccount, CreateBrokerAccountRequest } from '@/types/broker-account';

// ==========================================================
// API Methods
// ==========================================================

/**
 * Listar cuentas de broker
 */
export async function getBrokerAccounts(params?: {
  contactId?: string;
}): Promise<ApiResponse<BrokerAccount[]>> {
  const queryParams = new URLSearchParams();
  if (params?.contactId) queryParams.append('contactId', params.contactId);

  const endpoint = `/v1/broker-accounts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return apiClient.get<BrokerAccount[]>(endpoint);
}

/**
 * Crear cuenta de broker
 */
export async function createBrokerAccount(
  data: CreateBrokerAccountRequest
): Promise<ApiResponse<BrokerAccount>> {
  return apiClient.post<BrokerAccount>('/v1/broker-accounts', data);
}

/**
 * Eliminar cuenta de broker
 */
export async function deleteBrokerAccount(id: string): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/v1/broker-accounts/${id}`);
}

