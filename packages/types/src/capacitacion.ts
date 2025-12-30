/**
 * Capacitacion Types - Shared training-related types
 */

import type { TimestampedEntity, UpdateRequest, CreateRequest } from './common';

/**
 * Capacitacion
 */
export interface Capacitacion extends TimestampedEntity {
  titulo: string;
  tema: string;
  link: string;
  fecha: string | Date | null;
  createdByUserId: string;
}

/**
 * Request to create a capacitacion
 */
export interface CreateCapacitacionRequest extends Omit<
  CreateRequest<Capacitacion>,
  'createdByUserId' | 'fecha'
> {
  titulo: string;
  tema: string;
  link: string;
  fecha?: string | Date | null;
}

/**
 * Request to update a capacitacion
 */
export interface UpdateCapacitacionRequest extends UpdateRequest<Capacitacion> {}

/**
 * Response for CSV import
 */
export interface ImportCapacitacionesResponse {
  totalProcessed: number;
  totalImported: number;
  totalErrors: number;
  errors?: string[];
}

/**
 * Parameters for listing capacitaciones
 */
export interface ListCapacitacionesParams {
  tema?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Paged response for capacitaciones
 */
export interface CapacitacionesListResponse {
  success: boolean;
  data: Capacitacion[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    page: number;
    totalPages: number;
  };
}
