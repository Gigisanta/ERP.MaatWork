/**
 * Handlers CRUD para tareas
 *
 * AI_DECISION: Extraer handlers CRUD a módulo separado
 * Justificación: Separar responsabilidades mejora mantenibilidad
 * Impacto: Código más organizado
 */

import type { Request, Response, NextFunction } from 'express';
import { db, tasks, taskRecurrences } from '@cactus/db';
import { eq, and, isNull } from 'drizzle-orm';
import { canAccessContact } from '../../../auth/authorization';

/**
 * POST /tasks - Crear nueva tarea
 */
export async function handleCreateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Verify user has access to the contact
    const hasContactAccess = await canAccessContact(userId, userRole, validated.contactId);
    if (!hasContactAccess) {
      req.log.warn(
        {
          contactId: validated.contactId,
          userId,
          userRole,
        },
        'user attempted to create task for inaccessible contact'
      );
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Si hay recurrencia, crear la definición de recurrencia primero
    let recurrenceId = null;
    if (validated.recurrence) {
      const [rec] = await db()
        .insert(taskRecurrences)
        .values({
          rrule: validated.recurrence.rrule,
          timezone: validated.recurrence.timezone,
          startDate: validated.recurrence.startDate,
          endDate: validated.recurrence.endDate || null,
          nextOccurrence: validated.recurrence.startDate,
          isActive: true,
        })
        .returning();
      recurrenceId = rec.id;
    }

    const [newTask] = await db()
      .insert(tasks)
      .values({
        contactId: validated.contactId,
        meetingId: validated.meetingId || null,
        title: validated.title,
        description: validated.description || null,
        status: validated.status,
        dueDate: validated.dueDate || null,
        dueTime: validated.dueTime || null,
        priority: validated.priority,
        assignedToUserId: validated.assignedToUserId,
        createdByUserId: userId,
        createdFrom: 'manual',
        recurrenceId,
      })
      .returning();

    req.log.info({ taskId: newTask.id }, 'task created');
    res.status(201).json({ data: newTask });
  } catch (err) {
    req.log.error({ err }, 'failed to create task');
    next(err);
  }
}

/**
 * PUT /tasks/:id - Actualizar tarea
 */
export async function handleUpdateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const validated = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const [existing] = await db()
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Verify user has access to this task
    let hasAccess = false;
    if (existing.contactId) {
      // Task has a contact - verify access to the contact
      hasAccess = await canAccessContact(userId, userRole, existing.contactId);
    } else {
      // Task without contact - verify it's assigned to the user
      hasAccess = existing.assignedToUserId === userId;
    }

    if (!hasAccess) {
      req.log.warn(
        {
          taskId: id,
          contactId: existing.contactId,
          assignedToUserId: existing.assignedToUserId,
          userId,
          userRole,
        },
        'user attempted to update inaccessible task'
      );
      return res.status(404).json({ error: 'Task not found' });
    }

    // AI_DECISION: Validar versión en where clause para optimistic locking
    // Justificación: Previene sobrescribir cambios concurrentes, mejora UX
    // Si la versión no coincide, el update no afecta ningún registro
    // Impacto: Frontend debe manejar 409 Conflict y recargar datos
    const [updated] = await db()
      .update(tasks)
      .set({
        ...validated,
        version: existing.version + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tasks.id, id),
          eq(tasks.version, existing.version) // Validar versión para optimistic locking
        )
      )
      .returning();

    // Si no se actualizó ningún registro, significa conflicto de versión
    if (updated.length === 0) {
      req.log.warn(
        {
          taskId: id,
          expectedVersion: existing.version,
          message: 'Version conflict detected',
        },
        'Task update failed due to version conflict'
      );

      return res.status(409).json({
        error: 'Version conflict',
        message: 'El recurso fue modificado por otro usuario. Por favor recarga la página.',
      });
    }

    req.log.info({ taskId: id }, 'task updated');
    res.json({ success: true, data: updated });
  } catch (err) {
    req.log.error({ err, taskId: req.params.id }, 'failed to update task');
    next(err);
  }
}

/**
 * DELETE /tasks/:id - Soft delete de tarea
 */
export async function handleDeleteTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // First get the existing task to check access
    const [existing] = await db()
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Verify user has access to this task
    let hasAccess = false;
    if (existing.contactId) {
      // Task has a contact - verify access to the contact
      hasAccess = await canAccessContact(userId, userRole, existing.contactId);
    } else {
      // Task without contact - verify it's assigned to the user
      hasAccess = existing.assignedToUserId === userId;
    }

    if (!hasAccess) {
      req.log.warn(
        {
          taskId: id,
          contactId: existing.contactId,
          assignedToUserId: existing.assignedToUserId,
          userId,
          userRole,
        },
        'user attempted to delete inaccessible task'
      );
      return res.status(404).json({ error: 'Task not found' });
    }

    const [deleted] = await db()
      .update(tasks)
      .set({ deletedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();

    req.log.info({ taskId: id }, 'task deleted');
    res.json({ success: true, data: { id, deleted: true } });
  } catch (err) {
    req.log.error({ err, taskId: req.params.id }, 'failed to delete task');
    next(err);
  }
}
