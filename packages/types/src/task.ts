/**
 * Task Types - Shared task-related types
 */

import type { TimestampedEntity, UpdateRequest } from './common';

/**
 * Task
 */
export interface Task extends TimestampedEntity {
  contactId: string;
  title: string;
  description?: string | null;
  dueDate?: string | Date | null;
  status: string;
  priority: string;
  assignedToUserId?: string | null;
  googleEventId?: string | null;
  version: number;
}

/**
 * Request to create a task
 */
export interface CreateTaskRequest extends Pick<Task, 'contactId' | 'title'> {
  description?: string;
  dueDate?: string | Date;
  status?: string;
  priority?: string;
  assignedToUserId?: string;
}

/**
 * Request to update a task
 */
export interface UpdateTaskRequest extends UpdateRequest<Task> {
  title?: string;
  description?: string | null;
  dueDate?: string | Date | null;
  status?: string;
  priority?: string;
  assignedToUserId?: string | null;
}
