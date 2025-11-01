/**
 * Tipos relacionados con notas
 */

import type { TimestampedEntity, UpdateRequest } from './common';

/**
 * Nota base - extiende TimestampedEntity
 */
export interface Note extends TimestampedEntity {
  contactId: string;
  content: string;
  authorUserId?: string | null;
  authorName?: string | null;
  source?: string;
  noteType?: string;
}

/**
 * Request para crear nota - usando Pick para campos requeridos
 */
export interface CreateNoteRequest extends Pick<Note, 'contactId' | 'content'> {
  noteType?: string;
  source?: string;
}

/**
 * Request para actualizar nota - usando utility type UpdateRequest
 */
export interface UpdateNoteRequest extends UpdateRequest<Note> {
  content: string; // content es requerido en updates
}
