/**
 * Handlers CRUD para tareas
 *
 * AI_DECISION: Refactorizar handlers CRUD para usar TaskService
 * Justificación: Separar responsabilidades mejora mantenibilidad y consistencia
 * Impacto: Código más organizado y fácil de testear
 */

import type { Request, Response, NextFunction } from 'express';
import { createTask, updateTask, deleteTask } from '../../../services/task-service';
import { createRouteHandler, createAsyncHandler, HttpError } from '../../../utils/route-handler';

/**
 * POST /tasks - Crear nueva tarea
 */
export const handleCreateTask = createAsyncHandler(async (req: Request, res: Response) => {
  try {
    const newTask = await createTask({
      userId: req.user!.id,
      userRole: req.user!.role,
      data: req.body,
      log: req.log,
    });

    return res.status(201).json({ success: true, data: newTask, requestId: req.requestId });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Contact not found or access denied') {
      throw new HttpError(404, 'Contact not found');
    }
    throw err;
  }
});

/**
 * PUT /tasks/:id - Actualizar tarea
 */
export const handleUpdateTask = createRouteHandler(async (req: Request) => {
  try {
    const { id } = req.params;
    const updated = await updateTask({
      id,
      userId: req.user!.id,
      userRole: req.user!.role,
      data: req.body,
      log: req.log,
    });

    return updated;
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Task not found or access denied' || error.message === 'Task not found') {
      throw new HttpError(404, 'Task not found');
    }
    if (error.message === 'Version conflict') {
      throw new HttpError(409, 'El recurso fue modificado por otro usuario. Por favor recarga la página.', {
        error: 'Version conflict',
      });
    }
    throw err;
  }
});

/**
 * DELETE /tasks/:id - Soft delete de tarea
 */
export const handleDeleteTask = createRouteHandler(async (req: Request) => {
  try {
    const { id } = req.params;
    const result = await deleteTask({
      id,
      userId: req.user!.id,
      userRole: req.user!.role,
      log: req.log,
    });

    return result;
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Task not found or access denied' || error.message === 'Task not found') {
      throw new HttpError(404, 'Task not found');
    }
    throw err;
  }
});
