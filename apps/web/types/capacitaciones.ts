/**
 * Tipos relacionados con capacitaciones
 */

import type { TimestampedEntity, UpdateRequest } from './common';

/**
 * Capacitación base - extiende TimestampedEntity
 */
export interface Capacitacion extends TimestampedEntity {
  titulo: string;
  tema: string;
  link: string;
  fecha: string | null;
  createdByUserId: string;
}

/**
 * Request para crear capacitación
 */
export interface CreateCapacitacionRequest {
  titulo: string;
  tema: string;
  link: string;
  fecha?: string | null; // ISO date string (YYYY-MM-DD) o null
}

/**
 * Request para actualizar capacitación
 */
export interface UpdateCapacitacionRequest extends UpdateRequest<Capacitacion> {
  titulo?: string;
  tema?: string;
  link?: string;
  fecha?: string | null; // ISO date string (YYYY-MM-DD) o null
}

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

