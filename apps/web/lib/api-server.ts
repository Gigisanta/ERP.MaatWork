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

import type { Contact } from '@maatwork/types';
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
  // AI_DECISION: Usar URL interna para Server Components
  // Justificación: Cuando Next.js (servidor) llama a https://maat.work/api,
  //                Cloudflare intercepta con su challenge "Just a moment..."
  //                que el servidor no puede resolver (requiere JavaScript).
  //                Usando localhost:3001 evitamos Cloudflare para llamadas internas.
  // Impacto: Server Components pueden autenticar usuarios sin bloqueos de Cloudflare
  const internalApiUrl = process.env.API_URL_INTERNAL || config.apiUrl;
  const url = `${internalApiUrl}${endpoint}`;

  // Obtener cookie de token automáticamente
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Si hay cookie, incluirla en el header Cookie
  // El backend prioriza cookies sobre Bearer token
  // AI_DECISION: Validate cookie value is not empty before sending
  // Justificación: Empty cookie values cause JWSInvalid errors on API
  // Impacto: Prevents cryptic errors, fails cleanly with 401 if no valid token
  if (tokenCookie && tokenCookie.value && tokenCookie.value.trim()) {
    headers['Cookie'] = `token=${tokenCookie.value}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10000);

  // AI_DECISION: Don't set cache when revalidate is specified
  // Justificación: Next.js warns when both cache and revalidate are specified. When revalidate is used,
  //                 Next.js handles caching automatically. Only set cache when revalidate is not specified.
  // Impacto: Eliminates Next.js warnings and uses proper caching strategy
  const hasRevalidate = options.revalidate !== undefined && options.revalidate !== false;

  const fetchOptions: RequestInit & { next?: { revalidate: number | false } } = {
    method: options.method || 'GET',
    headers,
    signal: controller.signal,
  };

  // Only set cache if revalidate is not specified (Next.js handles cache when revalidate is used)
  if (!hasRevalidate) {
    fetchOptions.cache = options.cache ?? 'no-store';
  }

  // Next.js revalidate option (Next.js will handle cache automatically)
  if (hasRevalidate && typeof options.revalidate === 'number') {
    fetchOptions.next = { revalidate: options.revalidate };
  }

  if (options.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
  }
  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (fetchError) {
    clearTimeout(timeout);
    // Network error (ECONNREFUSED, timeout, etc.)
    const error = new Error(fetchError instanceof Error ? fetchError.message : 'Network error');
    // Mark as network error (no status code)
    (error as Error & { status?: number; isNetworkError?: boolean }).isNetworkError = true;
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
    const error = new Error(errorMessage);
    // Attach status code to error for better error handling
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  const data = await response.json();
  return data;
}

/**
 * Helper para obtener contacto en Server Components
 */
export async function getContactById(id: string): Promise<ApiResponse<Contact>> {
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
export async function getTeams(): Promise<ApiResponse<import('@/types').Team[]>> {
  return apiCall('/v1/teams', { revalidate: 3600 });
}

/**
 * Helper para obtener dashboard del miembro en Server Components
 */
export async function getMemberDashboard(): Promise<
  ApiResponse<import('@/lib/api/teams').MemberDashboardResponse>
> {
  return apiCall('/v1/teams/member-dashboard');
}

/**
 * Helper para obtener solicitudes de membresía en Server Components
 */
export async function getMembershipRequests(): Promise<
  ApiResponse<import('@/types').MembershipRequest[]>
> {
  return apiCall('/v1/teams/membership-requests');
}

/**
 * Helper para obtener portfolios en Server Components
 */
export async function getPortfolios(): Promise<ApiResponse<import('@/types').Portfolio[]>> {
  return apiCall('/v1/portfolios/templates', { revalidate: 3600 });
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
  return apiCall('/v1/benchmarks', { revalidate: 3600 });
}

/**
 * Helper para obtener capacitaciones en Server Components
 */
export async function getCapacitaciones(params?: {
  tema?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<import('@/types').CapacitacionesListResponse>> {
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
export async function getPipelineBoard(): Promise<
  ApiResponse<import('@/types').PipelineStageWithContacts[]>
> {
  return apiCall('/v1/pipeline/board');
}
