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

  const fetchOptions: RequestInit = {
    method: options.method || 'GET',
    headers,
    cache: 'no-store',
    signal: controller.signal,
  };
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
 * Cliente API para Server Components que acepta token explícito (legacy)
 * 
 * @deprecated Usar apiCall() en su lugar, que usa cookies automáticamente
 * Mantenido para compatibilidad con código existente
 */
export async function apiCallWithToken<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    token: string;
    headers?: Record<string, string>;
    timeoutMs?: number;
  }
): Promise<ApiResponse<T>> {
  const url = `${config.apiUrl}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${options.token}`,
    ...options.headers,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10000);

  const fetchOptions: RequestInit = {
    method: options.method || 'GET',
    headers,
    cache: 'no-store',
    signal: controller.signal,
  };
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
 * @deprecated Usar getContactById() en su lugar
 */
export async function getContactByIdWithToken(
  id: string,
  token: string
): Promise<ApiResponse<import('@/types/contact').Contact>> {
  return apiCallWithToken(`/v1/contacts/${id}`, { token });
}

