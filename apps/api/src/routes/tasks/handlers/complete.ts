/**
 * Handler para completar tareas
 *
 * AI_DECISION: Extraer handler de completar a módulo separado
 * Justificación: Separar responsabilidades mejora mantenibilidad
 * Impacto: Código más organizado
 */

import type { Request, Response, NextFunction } from 'express';
import { db, tasks, taskRecurrences } from '@maatwork/db';
import { eq, and } from 'drizzle-orm';
import { syncTaskToGoogle } from '../../../services/task-sync';
import { createRouteHandler, HttpError } from '../../../utils/route-handler';

/**
 * POST /tasks/:id/complete - Completar tarea
 */
export const handleCompleteTask = createRouteHandler(async (req: Request) => {
  const { id } = req.params;

  const [task] = await db()
    .update(tasks)
    .set({
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, id))
    .returning();

  if (!task) {
    throw new HttpError(404, 'Task not found');
  }

  // Si tiene recurrencia activa, crear la siguiente instancia
  if (task.recurrenceId) {
    const [recurrence] = await db()
      .select()
      .from(taskRecurrences)
      .where(and(eq(taskRecurrences.id, task.recurrenceId), eq(taskRecurrences.isActive, true)))
      .limit(1);

    if (recurrence && recurrence.nextOccurrence) {
      // FUTURE_FEATURE: Calculate next occurrence using rrule library
      // Dependencies: npm install rrule, parse recurrence.rruleString
      // Implementation: Create next task instance when current one is completed
      req.log.info({ recurrenceId: recurrence.id }, 'should create next occurrence');
    }
  }

  req.log.info({ taskId: id }, 'task completed');

  // Sync to Google Calendar
  syncTaskToGoogle(id, 'update').catch((err) =>
    req.log.error({ err, taskId: id }, 'failed to sync task completion to google')
  );

  return task;
});
