/**
 * Handler para completar tareas
 *
 * AI_DECISION: Extraer handler de completar a módulo separado
 * Justificación: Separar responsabilidades mejora mantenibilidad
 * Impacto: Código más organizado
 */

import type { Request, Response, NextFunction } from 'express';
import { db, tasks, taskRecurrences } from '@cactus/db';
import { eq, and } from 'drizzle-orm';
import { syncTaskToGoogle } from '../../../services/task-sync';

/**
 * POST /tasks/:id/complete - Completar tarea
 */
export async function handleCompleteTask(req: Request, res: Response, next: NextFunction) {
  try {
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
      return res.status(404).json({ error: 'Task not found' });
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

    res.json({ success: true, data: task });
  } catch (err) {
    req.log.error({ err, taskId: req.params.id }, 'failed to complete task');
    next(err);
  }
}
