/**
 * Helper para llamadas API en Server Components
 * 
 * AI_DECISION: Usar cookies httpOnly en lugar de Bearer token para consistencia
 * Justificación: Alinea Server Components con el patrón principal de autenticación
 * Impacto: Consistencia en toda la aplicación, más seguro
 * 
 * AI_DECISION: Mantener fetch directo en lugar de apiClient
 * Justificación: Server Components de Next.js necesitan acceso a cookies() de Next.js
 *                 que solo está disponible en el contexto del servidor. apiClient está
 *                 diseñado para Client Components y no puede acceder a cookies() de Next.js.
 * Impacto: Mantiene funcionalidad correcta de Server Components con autenticación vía cookies
 */

import type { ApiResponse } from './api-client';
import { config } from './config';
import { cookies } from 'next/headers';

/**
 * Cliente API para Server Components que usa cookies automáticamente
 * 
 * AI_DECISION: Priorizar cookies sobre token explícito
 * Justificación: Consistencia con patrón principal de autenticación
 * Impacto: Server Components usan el mismo método de auth que Client Components
 * 
 * NOTA: Este archivo usa fetch directo porque necesita acceso a cookies() de Next.js
 *       que solo está disponible en Server Components. apiClient no puede usarse aquí.
 */
export async function apiCall<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    headers?: Record<string, string>;
    timeoutMs?: number;
    cache?: RequestCache;
    revalidate?: number | false;
  } = {}
): Promise<ApiResponse<T>> {
  const url = `${config.apiUrl}${endpoint}`;

  // Obtener cookie de token automáticamente
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Si hay cookie, incluirla en el header Cookie
  // El backend prioriza cookies sobre Bearer token
  if (tokenCookie) {
    headers['Cookie'] = `token=${tokenCookie.value}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10000);

  // AI_DECISION: Use force-cache when revalidate is specified, otherwise no-store
  // Justificación: Next.js revalidate requires cache to be enabled. Default to no-store for fresh data when no revalidate.
  // Impacto: Enables proper caching with revalidation for optimized requests
  const shouldCache = options.revalidate !== undefined && options.revalidate !== false;
  const cacheStrategy: RequestCache = options.cache ?? (shouldCache ? 'force-cache' : 'no-store');

  const fetchOptions: RequestInit & { next?: { revalidate: number | false } } = {
    method: options.method || 'GET',
    headers,
    cache: cacheStrategy,
    signal: controller.signal,
  };
  
  // Next.js revalidate option
  if (shouldCache && typeof options.revalidate === 'number') {
    fetchOptions.next = { revalidate: options.revalidate };
  }
  
  if (options.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
  }
  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } finally {
    clearTimeout(timeout);
  }

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
export async function getContactById(
  id: string
): Promise<ApiResponse<import('@/types/contact').Contact>> {
  return apiCall(`/v1/contacts/${id}`);
}

/**
 * Helper para obtener dashboard KPIs en Server Components
 */
export async function getDashboardKPIs(): Promise<ApiResponse<import('@/types').DashboardData>> {
  return apiCall('/v1/analytics/dashboard');
}

/**
 * Helper para obtener equipos en Server Components
 */
export async function getTeams(): Promise<ApiResponse<import('@/types/team').Team[]>> {
  return apiCall('/v1/teams');
}

/**
 * Helper para obtener solicitudes de membresía en Server Components
 */
export async function getMembershipRequests(): Promise<ApiResponse<import('@/types/team').MembershipRequest[]>> {
  return apiCall('/v1/teams/membership-requests');
}

/**
 * Helper para obtener portfolios en Server Components
 */
export async function getPortfolios(): Promise<ApiResponse<import('@/types').Portfolio[]>> {
  return apiCall('/v1/portfolios/templates');
}

/**
 * Helper para obtener usuario actual en Server Components
 * 
 * AI_DECISION: Usar /v1/users/me en lugar de /v1/auth/me para información completa
 * Justificación: /v1/users/me retorna información completa del usuario desde DB (phone, isActive, createdAt, etc.)
 *                 mientras que /v1/auth/me solo retorna AuthUser básico del token
 * Impacto: Consistencia con tipos esperados y acceso a más información del usuario
 */
export async function getCurrentUser(): Promise<ApiResponse<import('@/types').UserApiResponse>> {
  return apiCall('/v1/users/me');
}

/**
 * Helper para obtener benchmarks en Server Components
 */
export async function getBenchmarks(): Promise<ApiResponse<import('@/types').Benchmark[]>> {
  return apiCall('/v1/benchmarks');
}

/**
 * Helper para obtener capacitaciones en Server Components
 */
export async function getCapacitaciones(params?: {
  tema?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<import('@/types/capacitaciones').CapacitacionesListResponse>> {
  const queryParams = new URLSearchParams();
  if (params?.tema) queryParams.append('tema', params.tema);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.limit) queryParams.append('limit', String(params.limit));
  if (params?.offset) queryParams.append('offset', String(params.offset));

  const endpoint = `/v1/capacitaciones${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return apiCall(endpoint);
}

/**
 * Helper para obtener pipeline board en Server Components
 */
export async function getPipelineBoard(): Promise<ApiResponse<import('@/types/pipeline').PipelineStageWithContacts[]>> {
  return apiCall('/v1/pipeline/board');
}

