/**
 * Handler para acciones masivas sobre tareas
 *
 * AI_DECISION: Migrado a createRouteHandler para manejo automático de errores y formato estándar
 * Justificación: Elimina try/catch manual y estandariza formato de respuesta
 * Impacto: Consistencia con otros handlers, menos código duplicado
 */

import type { Request } from 'express';
import { db, tasks } from '@cactus/db';
import { and, isNull, inArray } from 'drizzle-orm';
import { createRouteHandler, HttpError } from '../../../utils/route-handler';

/**
 * POST /tasks/bulk - Acciones masivas sobre tareas
 */
export const handleBulkAction = createRouteHandler(async (req: Request) => {
  const { taskIds, action, params } = req.body;

  let affected = 0;

  switch (action) {
    case 'complete':
      const completed = await db()
        .update(tasks)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(inArray(tasks.id, taskIds), isNull(tasks.deletedAt)))
        .returning();
      affected = completed.length;
      break;

    case 'delete':
      const deleted = await db()
        .update(tasks)
        .set({ deletedAt: new Date() })
        .where(inArray(tasks.id, taskIds))
        .returning();
      affected = deleted.length;
      break;

    case 'reassign':
      if (!params?.assignedToUserId) {
        throw new HttpError(400, 'assignedToUserId required for reassign');
      }
      const reassigned = await db()
        .update(tasks)
        .set({
          assignedToUserId: params.assignedToUserId,
          updatedAt: new Date(),
        })
        .where(and(inArray(tasks.id, taskIds), isNull(tasks.deletedAt)))
        .returning();
      affected = reassigned.length;
      break;

    case 'change_status':
      if (!params?.status) {
        throw new HttpError(400, 'status required for change_status');
      }
      const statusChanged = await db()
        .update(tasks)
        .set({
          status: params.status,
          updatedAt: new Date(),
        })
        .where(and(inArray(tasks.id, taskIds), isNull(tasks.deletedAt)))
        .returning();
      affected = statusChanged.length;
      break;

    default:
      throw new HttpError(400, 'Invalid action');
  }

  req.log.info({ action, affected, taskIds }, 'bulk action completed');
  return { affected, action };
});
