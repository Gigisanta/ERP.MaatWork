/**
 * Handler para completar tareas
 *
 * AI_DECISION: Migrado a createRouteHandler para manejo automático de errores y formato estándar
 * Justificación: Elimina try/catch manual y estandariza formato de respuesta
 * Impacto: Consistencia con otros handlers, menos código duplicado
 */

import type { Request } from 'express';
import { db, tasks, taskRecurrences } from '@cactus/db';
import { eq, and } from 'drizzle-orm';
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
      // AI_DECISION: Placeholder para creación automática de siguiente ocurrencia de tarea recurrente
      // Justificación: Requiere implementar parsing de rrule y cálculo de siguiente fecha usando librería rrule
      // Dependencies: npm install rrule, parse recurrence.rruleString
      // Implementation: Create next task instance when current one is completed
      // Impacto: Mejora UX permitiendo creación automática de tareas recurrentes sin intervención manual
      req.log.info({ recurrenceId: recurrence.id }, 'should create next occurrence');
    }
  }

  req.log.info({ taskId: id }, 'task completed');
  return task;
});
