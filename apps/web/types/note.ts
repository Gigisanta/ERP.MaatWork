/**
 * Tipos relacionados con notas
 */

/**
 * Nota base
 */
export interface Note {
  id: string;
  contactId: string;
  content: string;
  authorUserId?: string | null;
  authorName?: string | null;
  source?: string;
  noteType?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Request para crear nota
 */
export interface CreateNoteRequest {
  contactId: string;
  content: string;
  noteType?: string;
  source?: string;
}

/**
 * Request para actualizar nota
 */
export interface UpdateNoteRequest {
  content: string;
}

