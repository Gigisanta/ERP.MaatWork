/**
 * Tipos relacionados con capacitaciones
 */

import type { TimestampedEntity, UpdateRequest, CreateRequest } from './common';

/**
 * Capacitación base - extiende TimestampedEntity
 */
export interface Capacitacion extends TimestampedEntity {
  id: string; // Explicitly include id from BaseEntity for TypeScript resolution
  titulo: string;
  tema: string;
  link: string;
  fecha: string | null;
  createdByUserId: string;
}

/**
 * Request para crear capacitación - usando utility type CreateRequest
 */
export interface CreateCapacitacionRequest extends Omit<
  CreateRequest<Capacitacion>,
  'createdByUserId' | 'fecha'
> {
  titulo: string;
  tema: string;
  link: string;
  fecha?: string | null; // ISO date string (YYYY-MM-DD) o null
}

/**
 * Request para actualizar capacitación - usando utility type UpdateRequest
 */
export interface UpdateCapacitacionRequest extends UpdateRequest<Capacitacion> {}

/**
 * Respuesta de importación CSV
 */
export interface ImportCapacitacionesResponse {
  totalProcessed: number;
  totalImported: number;
  totalErrors: number;
  errors?: string[];
}

/**
 * Query parameters para listar capacitaciones
 */
export interface ListCapacitacionesParams {
  tema?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Respuesta paginada de capacitaciones
 */
export interface CapacitacionesListResponse {
  success: boolean;
  data: Capacitacion[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
