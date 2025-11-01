/**
 * Helper para llamadas API en Server Components
 * 
 * AI_DECISION: Crear helper separado para Server Components
 * Justificación: Server Components no pueden usar localStorage del apiClient
 * Impacto: Permite usar cliente centralizado también en Server Components
 */

import type { ApiResponse } from './api-client';
import { config } from './config';

/**
 * Cliente API para Server Components que acepta token explícito
 */
export async function apiCallWithToken<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    token: string;
    headers?: Record<string, string>;
  }
): Promise<ApiResponse<T>> {
  const url = `${config.apiUrl}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${options.token}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Helper para obtener contacto en Server Components
 */
export async function getContactByIdWithToken(
  id: string,
  token: string
): Promise<ApiResponse<import('@/types/contact').Contact>> {
  return apiCallWithToken(`/v1/contacts/${id}`, { token });
}

