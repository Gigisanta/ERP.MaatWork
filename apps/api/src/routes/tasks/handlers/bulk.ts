/**
 * Handler para acciones masivas sobre tareas
 *
 * AI_DECISION: Refactorizado para usar TaskService
 * Justificación: Separar responsabilidades mejora mantenibilidad y consistencia
 * Impacto: Código más organizado y fácil de testear
 */

import type { Request } from 'express';
import { createRouteHandler, HttpError } from '../../../utils/route-handler';
import { bulkAction } from '../../../services/task-service';

/**
 * POST /tasks/bulk - Acciones masivas sobre tareas
 */
export const handleBulkAction = createRouteHandler(async (req: Request) => {
  const { taskIds, action, params } = req.body;

  try {
    return await bulkAction({
      taskIds,
      action,
      params,
      log: req.log,
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (
      error.message === 'assignedToUserId required for reassign' ||
      error.message === 'status required for change_status' ||
      error.message === 'Invalid action'
    ) {
      throw new HttpError(400, error.message);
    }
    throw err;
  }
});
