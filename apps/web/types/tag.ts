/**
 * Tipos relacionados con tags/etiquetas
 */

import type { TimestampedEntityOptional, CreateRequest, UpdateRequest } from './common';
import type { BusinessLine } from './metrics';

/**
 * Tag base - extiende TimestampedEntityOptional
 * 
 * NOTA: El backend usa 'scope' (contact, meeting, note) mientras que el frontend
 * usa 'entityType' (contact, task, note). El cliente API transforma automáticamente
 * entityType → scope antes de enviar al backend.
 */
export interface Tag extends TimestampedEntityOptional {
  id: string; // Explicitly include id from BaseEntity for TypeScript resolution
  name: string;
  color: string;
  icon?: string;
  entityType?: 'contact' | 'task' | 'note'; // Frontend: tipo de entidad
  scope?: string; // Backend: scope (contact, meeting, note)
  businessLine?: BusinessLine | null; // Línea de negocio: inversiones, zurich, patrimonial
}

/**
 * Request para crear tag - usando utility type CreateRequest
 * 
 * AI_DECISION: Usar entityType en frontend, transformar a scope en cliente API
 * Justificación: Mantener consistencia con otros tipos del frontend que usan entityType
 * Impacto: Transformación transparente en lib/api/tags.ts
 * 
 * Mapeo entityType → scope:
 * - 'contact' → 'contact'
 * - 'task' → 'meeting'
 * - 'note' → 'note'
 */
export interface CreateTagRequest extends Omit<CreateRequest<Tag>, 'entityType' | 'scope'> {
  name: string;
  color: string;
  entityType: 'contact' | 'task' | 'note';
  scope?: string; // Opcional: si se proporciona, se usa directamente (override del mapeo)
  businessLine?: BusinessLine | null; // Línea de negocio opcional
}

/**
 * Request para actualizar tag - usando utility type UpdateRequest
 */
export interface UpdateTagRequest extends UpdateRequest<Tag> {}

/**
 * Relación contacto-etiqueta con datos adicionales específicos de líneas de negocio
 */
export interface ContactTag {
  id: string;
  contactId: string;
  tagId: string;
  monthlyPremium?: number | null;
  policyNumber?: string | null;
  createdAt: string;
}

/**
 * Relación contacto-etiqueta con información completa de la etiqueta
 */
export interface ContactTagWithDetails extends ContactTag {
  tag: Tag; // Información completa de la etiqueta
}

/**
 * Request para actualizar datos de relación contacto-etiqueta
 */
export interface UpdateContactTagRequest {
  monthlyPremium?: number | null;
  policyNumber?: string | null;
}
