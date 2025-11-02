/**
 * Tipos relacionados con tags/etiquetas
 */

import type { TimestampedEntityOptional } from './common';

/**
 * Tag base - extiende TimestampedEntityOptional
 */
export interface Tag extends TimestampedEntityOptional {
  name: string;
  color: string;
  icon?: string;
  entityType?: 'contact' | 'task' | 'note';
  scope?: string; // contact, meeting, note
}

/**
 * Request para crear tag - usando Pick para campos requeridos
 */
export interface CreateTagRequest extends Pick<Tag, 'name' | 'color'> {
  entityType: 'contact' | 'task' | 'note';
  scope?: string;
}

/**
 * Request para actualizar tag - usando Partial de campos editables
 */
export interface UpdateTagRequest extends Partial<Pick<Tag, 'name' | 'color' | 'icon'>> {}
