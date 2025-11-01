/**
 * Tipos relacionados con tareas
 */

/**
 * Tarea base
 */
export interface Task {
  id: string;
  contactId: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  status: string;
  priority: string;
  assignedToId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request para crear tarea
 */
export interface CreateTaskRequest {
  contactId: string;
  title: string;
  description?: string;
  dueDate?: string;
  status?: string;
  priority?: string;
  assignedToId?: string;
}

/**
 * Request para actualizar tarea
 */
export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  dueDate?: string;
  status?: string;
  priority?: string;
  assignedToId?: string;
}

