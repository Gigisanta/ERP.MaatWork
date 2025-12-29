/**
 * Note Types - Shared note-related types
 */

import type { TimestampedEntity, UpdateRequest } from './common';

/**
 * Note
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
 * Request to create a note
 */
export interface CreateNoteRequest extends Pick<Note, 'contactId' | 'content'> {
  noteType?: string;
  source?: string;
}

/**
 * Request to update a note
 */
export interface UpdateNoteRequest extends UpdateRequest<Note> {
  content: string;
}






