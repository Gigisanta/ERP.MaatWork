/**
 * Handler para acciones masivas sobre tareas
 *
 * AI_DECISION: Extraer handler de bulk a módulo separado
 * Justificación: Separar responsabilidades mejora mantenibilidad
 * Impacto: Código más organizado
 */

import type { Request, Response, NextFunction } from 'express';
import { db, tasks } from '@cactus/db';
import { and, isNull, inArray } from 'drizzle-orm';

/**
 * POST /tasks/bulk - Acciones masivas sobre tareas
 */
export async function handleBulkAction(req: Request, res: Response, next: NextFunction) {
  try {
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
          return res.status(400).json({ error: 'assignedToUserId required for reassign' });
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
          return res.status(400).json({ error: 'status required for change_status' });
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
        return res.status(400).json({ error: 'Invalid action' });
    }

    req.log.info({ action, affected, taskIds }, 'bulk action completed');
    res.json({ success: true, data: { affected, action } });
  } catch (err) {
    req.log.error({ err }, 'failed bulk action');
    next(err);
  }
}
