/**
 * Handler para obtener tarea específica
 *
 * AI_DECISION: Refactorizado para usar TaskService
 * Justificación: Separar responsabilidades mejora mantenibilidad y consistencia
 * Impacto: Código más organizado y fácil de testear
 */

import type { Request } from 'express';
import { createRouteHandler, HttpError } from '../../../utils/route-handler';
import { getTask } from '../../../services/task-service';

/**
 * GET /tasks/:id - Obtener tarea específica
 */
export const handleGetTask = createRouteHandler(async (req: Request) => {
  const { id } = req.params;

  try {
    return await getTask({ id });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Task not found') {
      throw new HttpError(404, 'Task not found');
    }
    throw err;
  }
});
