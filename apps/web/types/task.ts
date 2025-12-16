/**
 * Tipos relacionados con tareas
 */

import type { TimestampedEntity, UpdateRequest } from './common';

/**
 * Tarea base - extiende TimestampedEntity
 */
export interface Task extends TimestampedEntity {
  id: string; // Explicitly include id from BaseEntity for TypeScript resolution
  createdAt: string | Date; // Explicitly include createdAt from TimestampedEntity for TypeScript resolution
  contactId: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  status: string;
  priority: string;
  assignedToId?: string | null;
}

/**
 * Request para crear tarea - usando Pick para campos requeridos
 */
export interface CreateTaskRequest extends Pick<Task, 'contactId' | 'title'> {
  description?: string;
  dueDate?: string;
  status?: string;
  priority?: string;
  assignedToId?: string;
}

/**
 * Request para actualizar tarea - usando utility type UpdateRequest
 */
export interface UpdateTaskRequest extends UpdateRequest<Task> {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  status?: string;
  priority?: string;
  assignedToId?: string | null;
}
