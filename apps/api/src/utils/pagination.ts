/**
 * Helpers centralizados para paginación
 *
 * Funciones para parsear, validar y formatear respuestas de paginación
 */

import { paginationQuerySchema } from './validation/common-schemas';
import type { z } from 'zod';

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginationResponse {
  page?: number;
  limit: number;
  offset: number;
  total: number;
  totalPages: number;
}

/**
 * Parsea y valida parámetros de paginación desde query string
 *
 * @param query - Query parameters del request
 * @returns Parámetros de paginación validados
 */
export function parsePaginationParams(query: Record<string, unknown>): PaginationParams {
  const result = paginationQuerySchema.safeParse(query);

  if (!result.success) {
    // Valores por defecto si la validación falla
    return {
      limit: 50,
      offset: 0,
    };
  }

  const { limit, offset, page } = result.data;

  // Si se usa page, calcular offset
  if (page !== undefined) {
    return {
      limit: limit ?? 50,
      offset: (page - 1) * (limit ?? 50),
    };
  }

  return {
    limit: limit ?? 50,
    offset: offset ?? 0,
  };
}

/**
 * Valida parámetros de paginación
 *
 * @param limit - Límite de items por página
 * @param offset - Offset desde el inicio
 * @param maxLimit - Límite máximo permitido (default: 100)
 * @returns Parámetros validados o null si son inválidos
 */
export function validatePaginationParams(
  limit: number,
  offset: number,
  maxLimit: number = 100
): PaginationParams | null {
  if (limit < 1 || limit > maxLimit) {
    return null;
  }

  if (offset < 0) {
    return null;
  }

  return { limit, offset };
}

/**
 * Calcula offset desde número de página
 *
 * @param page - Número de página (1-indexed)
 * @param limit - Items por página
 * @returns Offset calculado
 */
export function calculateOffsetFromPage(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Calcula número de página desde offset
 *
 * @param offset - Offset desde el inicio
 * @param limit - Items por página
 * @returns Número de página (1-indexed)
 */
export function calculatePageFromOffset(offset: number, limit: number): number {
  return Math.floor(offset / limit) + 1;
}

/**
 * Calcula total de páginas
 *
 * @param total - Total de items
 * @param limit - Items por página
 * @returns Total de páginas
 */
export function calculateTotalPages(total: number, limit: number): number {
  if (total === 0) return 0;
  return Math.ceil(total / limit);
}

/**
 * Formatea respuesta de paginación
 *
 * @param data - Array de datos
 * @param total - Total de items
 * @param params - Parámetros de paginación usados
 * @returns Objeto con datos y metadatos de paginación
 */
export function formatPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): {
  data: T[];
  pagination: PaginationResponse;
} {
  const page = calculatePageFromOffset(params.offset, params.limit);
  const totalPages = calculateTotalPages(total, params.limit);

  return {
    data,
    pagination: {
      page,
      limit: params.limit,
      offset: params.offset,
      total,
      totalPages,
    },
  };
}

/**
 * Aplica límites de paginación a una query Drizzle
 *
 * @param query - Query builder de Drizzle
 * @param params - Parámetros de paginación
 * @returns Query con límites aplicados
 */
export function applyPagination<T extends { limit: (n: number) => T; offset: (n: number) => T }>(
  query: T,
  params: PaginationParams
): T {
  return query.limit(params.limit).offset(params.offset);
}
