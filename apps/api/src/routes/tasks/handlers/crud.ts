/**
 * Handlers CRUD para tareas
 *
 * AI_DECISION: Migrado a createRouteHandler/createAsyncHandler para manejo automático de errores
 * Justificación: Elimina try/catch manual y estandariza formato de respuesta
 * Impacto: Consistencia con otros handlers, menos código duplicado
 */

import type { Request, Response } from 'express';
import { db, tasks, taskRecurrences } from '@cactus/db';
import { eq, and, isNull } from 'drizzle-orm';
import { canAccessContact } from '../../../auth/authorization';
import { createAsyncHandler, createRouteHandler, HttpError } from '../../../utils/route-handler';

/**
 * POST /tasks - Crear nueva tarea
 * AI_DECISION: Usar createAsyncHandler para manejar status 201 (Created)
 * Justificación: createRouteHandler siempre retorna 200, pero POST debe retornar 201
 */
export const handleCreateTask = createAsyncHandler(async (req: Request, res: Response) => {
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
  return res.status(201).json({ success: true, data: newTask, requestId: req.requestId });
});

/**
 * PUT /tasks/:id - Actualizar tarea
 */
export const handleUpdateTask = createRouteHandler(async (req: Request) => {
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
    throw new HttpError(404, 'Task not found');
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
    throw new HttpError(404, 'Task not found');
  }

  // AI_DECISION: Validar versión en where clause para optimistic locking
  // Justificación: Previene sobrescribir cambios concurrentes, mejora UX
  // Si la versión no coincide, el update no afecta ningún registro
  // Impacto: Frontend debe manejar 409 Conflict y recargar datos
  const updated = await db()
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

    throw new HttpError(
      409,
      'El recurso fue modificado por otro usuario. Por favor recarga la página.'
    );
  }

  req.log.info({ taskId: id }, 'task updated');
  return updated[0];
});

/**
 * DELETE /tasks/:id - Soft delete de tarea
 */
export const handleDeleteTask = createRouteHandler(async (req: Request) => {
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
    throw new HttpError(404, 'Task not found');
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
    throw new HttpError(404, 'Task not found');
  }

  await db().update(tasks).set({ deletedAt: new Date() }).where(eq(tasks.id, id)).returning();

  req.log.info({ taskId: id }, 'task deleted');
  return { id, deleted: true };
});
