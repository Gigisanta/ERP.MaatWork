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
import { cookies, headers } from 'next/headers';
import { logger } from './logger-server';

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
    retries?: number;
  } = {}
): Promise<ApiResponse<T>> {
  // AI_DECISION: Usar URL interna con Host header explícito
  // Justificación: Para evitar Cloudflare "Just a moment..." en llamadas servidor-a-servidor,
  //                el servidor de Next.js llama directamente a localhost:3001 (o IP interna).
  //                Sin embargo, para que las cookies de .maat.work sean válidas y para que
  //                el backend sepa a qué host se refiere, forzamos el header Host: maat.work.
  // Impacto: Bypass de Cloudflare, compatibilidad con cookies de dominio y ruteo correcto
  const internalBaseUrl = process.env.API_URL_INTERNAL || 'http://localhost:3001';
  const url = `${internalBaseUrl}${endpoint}`;

  // Obtener cookie de token automáticamente
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  // AI_DECISION: Filter out cookies with "undefined" or "null" string values
  // Justificación: Prevents sending "token=undefined" which causes API to reject requests with 401
  // Impacto: Fixes login loop where Middleware passes but API rejects Server Component calls
  const cookieHeader = allCookies
    .filter(
      (c) => c.value && c.value !== 'undefined' && c.value !== 'null' && c.value.trim() !== ''
    )
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  // AI_DECISION: Extraer requestId para trazabilidad
  // Justificación: RecuPera el ID generado en el middleware para mantener la traza hacia el backend
  const headerStore = await headers();
  const requestId = headerStore.get('x-request-id') || `sc_${Date.now()}`;

  const headersMap: Record<string, string> = {
    'Content-Type': 'application/json',
    Host: 'maat.work', // Mantener el host original para validación de cookies y ruteo
    'X-Request-ID': requestId, // Propagar a través de la cadena de llamadas
    ...options.headers,
  };

  if (cookieHeader) {
    headersMap['Cookie'] = cookieHeader;
  }

  // AI_DECISION: Diagnostic logging for Server Component API calls
  // Justificación: Helps identify missing cookies or URL mismatches in production
  // Impacto: Better observability for authentication issues
  // AI_DECISION: Diagnostic logging for Server Component API calls
  // Justificación: Unconditional logging to trace production issue
  logger.info(`[api-server] Calling endpoint`, {
    endpoint,
    url,
    hasCookieHeader: !!cookieHeader,
    cookieKeys: allCookies.map((c) => c.name),
    requestId,
    nodeEnv: process.env.NODE_ENV,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10000);

  // AI_DECISION: Don't set cache when revalidate is specified
  // Justificación: Next.js warns when both cache and revalidate are specified. When revalidate is used,
  //                 Next.js handles caching automatically. Only set cache when revalidate is not specified.
  // Impacto: Eliminates Next.js warnings and uses proper caching strategy
  const hasRevalidate = options.revalidate !== undefined && options.revalidate !== false;

  const fetchOptions: RequestInit & { next?: { revalidate: number | false } } = {
    method: options.method || 'GET',
    headers: headersMap,
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

  // AI_DECISION: Implement retry logic for resilience
  // Justificación: Server-to-server calls can fail due to transient network issues or temporary server load.
  // Impacto: More robust application that recovers from temporary failures without showing errors to user.
  const maxRetries = options.retries ?? 2;
  let lastError: Error | null = null;
  // Initialize to satisfy TS, though logic guarantees assignment or throw
  let response: Response = undefined as unknown as Response;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 500ms, 1000ms, 2000ms...
        const backoffMs = Math.min(500 * Math.pow(2, attempt - 1), 3000);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));

        logger.warn(`[api-server] Retrying ${endpoint} (attempt ${attempt + 1}/${maxRetries + 1})`, {
          requestId,
        });
      }

      response = await fetch(url, { ...fetchOptions, signal: controller.signal });

      // If 5xx error, throw to trigger retry
      if (response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      }

      // If successful or client error (4xx), break loop
      break;
    } catch (fetchError) {
      lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));

      // If it's a cancellation, don't retry
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        clearTimeout(timeout);
        throw fetchError;
      }

      // If we reached max retries, propagate error
      if (attempt === maxRetries) {
        clearTimeout(timeout);
        // Network error (ECONNREFUSED, timeout, etc.)
        const error = new Error(lastError.message || 'Network error');
        // Mark as network error (no status code)
        (error as Error & { status?: number; isNetworkError?: boolean }).isNetworkError = true;

        logger.error(
          `[api-server] Network error calling ${endpoint} after ${maxRetries + 1} attempts`,
          {
            error: error.message,
            requestId,
          }
        );

        throw error;
      }

      // Otherwise continue to next retry
    }
  }

  clearTimeout(timeout);

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text();
    }

    const errorMessage =
      (errorData as { message?: string })?.message ||
      `API Error: ${response.status} ${response.statusText}`;

    const error = new Error(errorMessage);
    // Attach status code to error for better error handling
    (error as Error & { status?: number }).status = response.status;

    if (process.env.NEXT_PUBLIC_DEBUG === 'true' || response.status >= 500) {
      logger.error(`[api-server] Error in ${endpoint}`, {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        requestId,
      });
    }
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
export async function getPortfolios(): Promise<ApiResponse<import('./api/portfolios').PaginatedPortfoliosResponse>> {
  return apiCall('/v1/portfolios', { revalidate: 3600 });
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

// Removed deprecated getBenchmarks. Use getPortfolios({ type: 'benchmark' }) instead.

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
