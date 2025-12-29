/**
 * Handler para listar tareas
 *
 * AI_DECISION: Refactorizar handler de listado para usar TaskService
 * Justificación: Separar responsabilidades mejora mantenibilidad y consistencia
 * Impacto: Código más organizado y fácil de testear
 */

import type { Request, Response, NextFunction } from 'express';
import { listTasks, type ListTasksParams } from '../../../services/task-service';
import { createRouteHandler } from '../../../utils/route-handler';

/**
 * GET /tasks - Listar tareas con filtros
 */
export const handleListTasks = createRouteHandler(async (req: Request) => {
  const query = req.query as unknown as ListTasksParams['query'];
  const result = await listTasks({
    userId: req.user!.id,
    userRole: req.user!.role,
    query,
    log: req.log,
  });

  return result;
});
