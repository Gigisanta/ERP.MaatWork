/**
 * Tipos relacionados con tags/etiquetas
 */

import type { TimestampedEntityOptional } from './common';
import type { BusinessLine } from './metrics';

/**
 * Tag base - extiende TimestampedEntityOptional
 * 
 * NOTA: El backend usa 'scope' (contact, meeting, note) mientras que el frontend
 * usa 'entityType' (contact, task, note). El cliente API transforma automáticamente
 * entityType → scope antes de enviar al backend.
 */
export interface Tag extends TimestampedEntityOptional {
  name: string;
  color: string;
  icon?: string;
  entityType?: 'contact' | 'task' | 'note'; // Frontend: tipo de entidad
  scope?: string; // Backend: scope (contact, meeting, note)
  businessLine?: BusinessLine | null; // Línea de negocio: inversiones, zurich, patrimonial
}

/**
 * Request para crear tag - usando Pick para campos requeridos
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
export interface CreateTagRequest extends Pick<Tag, 'name' | 'color'> {
  entityType: 'contact' | 'task' | 'note';
  scope?: string; // Opcional: si se proporciona, se usa directamente (override del mapeo)
  businessLine?: BusinessLine | null; // Línea de negocio opcional
}

/**
 * Request para actualizar tag - usando Partial de campos editables
 */
export interface UpdateTagRequest extends Partial<Pick<Tag, 'name' | 'color' | 'icon' | 'businessLine'>> {}
