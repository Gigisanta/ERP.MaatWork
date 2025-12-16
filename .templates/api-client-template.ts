/**
 * API Client Template
 *
 * Copiar este archivo a apps/web/lib/api/[domain].ts y reemplazar:
 * - [Domain] con el nombre del dominio (ej: Contact, Task, Portfolio)
 * - [domain] con el nombre en minusculas (ej: contact, task, portfolio)
 * - [endpoint] con la ruta de la API (ej: contacts, tasks, portfolios)
 *
 * Ejemplo de uso:
 * 1. Copiar a apps/web/lib/api/contacts.ts
 * 2. Reemplazar [Domain] -> Contact
 * 3. Reemplazar [domain] -> contact
 * 4. Reemplazar [endpoint] -> contacts
 * 5. Ajustar tipos y campos segun el dominio
 */

import { apiClient } from '../api-client';
import type { ApiResponse } from '../api-client';

// ==========================================================
// Types
// ==========================================================

/**
 * Tipo base para [Domain]
 */
export interface [Domain] {
  id: string;
  // Agregar campos del dominio
  name: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request para crear [Domain]
 */
export interface Create[Domain]Request {
  // Campos requeridos para crear
  name: string;
}

/**
 * Request para actualizar [Domain]
 */
export interface Update[Domain]Request {
  // Campos opcionales para actualizar
  name?: string;
}

/**
 * Parametros para listar [Domain]
 */
export interface List[Domain]Params {
  page?: number;
  limit?: number;
  search?: string;
  // Agregar filtros especificos del dominio
}

/**
 * Respuesta paginada de [Domain]
 */
export interface [Domain]ListResponse {
  data: [Domain][];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==========================================================
// API Functions
// ==========================================================

/**
 * Listar [domain]s con paginacion y filtros
 *
 * @param params - Parametros de busqueda y paginacion
 * @returns Lista paginada de [domain]s
 *
 * @example
 * ```typescript
 * const { data, pagination } = await get[Domain]s({ page: 1, limit: 20 });
 * ```
 */
export async function get[Domain]s(
  params?: List[Domain]Params
): Promise<ApiResponse<[Domain]ListResponse>> {
  const queryParams = new URLSearchParams();

  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));
  if (params?.search) queryParams.append('search', params.search);
  // Agregar mas parametros segun necesidad

  const endpoint = `/v1/[endpoint]${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return apiClient.get<[Domain]ListResponse>(endpoint);
}

/**
 * Obtener [domain] por ID
 *
 * @param id - ID del [domain]
 * @returns El [domain] encontrado
 *
 * @example
 * ```typescript
 * const [domain] = await get[Domain]ById('uuid-123');
 * ```
 */
export async function get[Domain]ById(id: string): Promise<ApiResponse<[Domain]>> {
  return apiClient.get<[Domain]>(`/v1/[endpoint]/${id}`);
}

/**
 * Crear nuevo [domain]
 *
 * @param data - Datos del [domain] a crear
 * @returns El [domain] creado
 *
 * @example
 * ```typescript
 * const new[Domain] = await create[Domain]({ name: 'Nuevo [Domain]' });
 * ```
 */
export async function create[Domain](
  data: Create[Domain]Request
): Promise<ApiResponse<[Domain]>> {
  return apiClient.post<[Domain]>('/v1/[endpoint]', data);
}

/**
 * Actualizar [domain] existente
 *
 * @param id - ID del [domain] a actualizar
 * @param data - Datos a actualizar
 * @returns El [domain] actualizado
 *
 * @example
 * ```typescript
 * const updated = await update[Domain]('uuid-123', { name: 'Nuevo nombre' });
 * ```
 */
export async function update[Domain](
  id: string,
  data: Update[Domain]Request
): Promise<ApiResponse<[Domain]>> {
  return apiClient.patch<[Domain]>(`/v1/[endpoint]/${id}`, data);
}

/**
 * Eliminar [domain]
 *
 * @param id - ID del [domain] a eliminar
 *
 * @example
 * ```typescript
 * await delete[Domain]('uuid-123');
 * ```
 */
export async function delete[Domain](id: string): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/v1/[endpoint]/${id}`);
}

// ==========================================================
// Hooks (opcional - para uso con SWR)
// ==========================================================

/*
import useSWR from 'swr';
import { fetcher } from '../api-hooks';

export function use[Domain]s(params?: List[Domain]Params) {
  const queryParams = new URLSearchParams();
  // ... build params

  const endpoint = `/v1/[endpoint]${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return useSWR<[Domain]ListResponse>(endpoint, fetcher);
}

export function use[Domain](id: string | undefined) {
  return useSWR<[Domain]>(id ? `/v1/[endpoint]/${id}` : null, fetcher);
}
*/
