/**
 * Tipos relacionados con tags/etiquetas
 */

/**
 * Tag base
 */
export interface Tag {
  id: string;
  name: string;
  color: string;
  icon?: string;
  entityType?: 'contact' | 'task' | 'note';
  scope?: string; // contact, meeting, note
  createdAt?: string;
}

/**
 * Request para crear tag
 */
export interface CreateTagRequest {
  name: string;
  color: string;
  entityType: 'contact' | 'task' | 'note';
  scope?: string;
}

/**
 * Request para actualizar tag
 */
export interface UpdateTagRequest {
  name?: string;
  color?: string;
  icon?: string;
}

