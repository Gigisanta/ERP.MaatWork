/**
 * Handler para listar tareas
 *
 * AI_DECISION: Extraer handler de listado a módulo separado
 * Justificación: Separar responsabilidades mejora mantenibilidad
 * Impacto: Código más organizado
 */

import type { Request, Response, NextFunction } from 'express';
import { db, tasks, contacts, users } from '@cactus/db';
import { eq, desc, and, isNull, lte, gte, sql, or } from 'drizzle-orm';
import { getUserAccessScope, buildContactAccessFilter } from '../../../auth/authorization';

/**
 * GET /tasks - Listar tareas con filtros
 */
export async function handleListTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      limit = '50',
      offset = '0',
      status,
      assignedToUserId,
      contactId,
      dueDateFrom,
      dueDateTo,
      priority,
      includeCompleted = 'false',
    } = req.query;

    // Get user access scope for data isolation
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const accessScope = await getUserAccessScope(userId, userRole);
    const accessFilter = buildContactAccessFilter(accessScope);

    const conditions = [];

    if (includeCompleted === 'false') {
      conditions.push(isNull(tasks.completedAt));
    }
    conditions.push(isNull(tasks.deletedAt));

    // Data isolation: Show tasks assigned to user OR tasks on accessible contacts
    const taskAccessConditions = [
      eq(tasks.assignedToUserId, userId), // Tasks assigned to current user
      and(
        sql`${tasks.contactId} IS NOT NULL`, // Tasks with contacts
        accessFilter.whereClause // Where user has access to the contact
      ),
    ];
    conditions.push(or(...taskAccessConditions)!);

    if (status) {
      conditions.push(eq(tasks.status, status as string));
    }
    if (assignedToUserId) {
      conditions.push(eq(tasks.assignedToUserId, assignedToUserId as string));
    }
    if (contactId) {
      // AI_DECISION: Include contact access check in WHERE clause instead of separate query
      // Justificación: Elimina query N+1, verificación de acceso incluida en JOIN principal
      // Impacto: Reduce latencia eliminando roundtrip adicional a DB
      conditions.push(eq(tasks.contactId, contactId as string));
      // Access filter already includes contact access check via accessFilter.whereClause
    }
    if (dueDateFrom) {
      conditions.push(gte(tasks.dueDate, dueDateFrom as string));
    }
    if (dueDateTo) {
      conditions.push(lte(tasks.dueDate, dueDateTo as string));
    }
    if (priority) {
      conditions.push(eq(tasks.priority, priority as string));
    }

    // AI_DECISION: Optimize GET /tasks with JOINs and window function for total
    // Justificación: Agrega JOINs con contacts y users para evitar queries adicionales, usa COUNT(*) OVER() para calcular total sin query separada
    // Impacto: Reduce queries N+1, mejora performance eliminando roundtrips adicionales, habilita paginación completa
    const items = await db()
      .select({
        // Task fields
        id: tasks.id,
        contactId: tasks.contactId,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        dueDate: tasks.dueDate,
        dueTime: tasks.dueTime,
        priority: tasks.priority,
        assignedToUserId: tasks.assignedToUserId,
        createdByUserId: tasks.createdByUserId,
        createdFrom: tasks.createdFrom,
        recurrenceId: tasks.recurrenceId,
        parentTaskId: tasks.parentTaskId,
        completedAt: tasks.completedAt,
        deletedAt: tasks.deletedAt,
        version: tasks.version,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        // Contact fields (basic info)
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactFullName: contacts.fullName,
        contactEmail: contacts.email,
        // Assigned user fields (basic info)
        assignedUserEmail: users.email,
        assignedUserFullName: users.fullName,
        // Total count using window function
        total: sql<number>`COUNT(*) OVER()`.as('total'),
      })
      .from(tasks)
      .leftJoin(contacts, eq(tasks.contactId, contacts.id))
      .leftJoin(users, eq(tasks.assignedToUserId, users.id))
      .where(and(...conditions))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string))
      .orderBy(desc(tasks.dueDate));

    // Extract total from first item (all items have same total value)
    const total = items.length > 0 ? Number(items[0].total) : 0;

    // Remove total from items and format response
    type TaskItem = (typeof items)[0];
    const formattedItems = items.map((item: TaskItem) => {
      const {
        total: _total,
        contactFirstName,
        contactLastName,
        contactFullName,
        contactEmail,
        assignedUserEmail,
        assignedUserFullName,
        ...task
      } = item;
      return {
        ...task,
        contact: task.contactId
          ? {
              id: task.contactId,
              firstName: contactFirstName,
              lastName: contactLastName,
              fullName: contactFullName,
              email: contactEmail,
            }
          : null,
        assignedUser: task.assignedToUserId
          ? {
              id: task.assignedToUserId,
              email: assignedUserEmail,
              fullName: assignedUserFullName,
            }
          : null,
      };
    });

    res.json({
      data: formattedItems,
      meta: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total,
      },
    });
  } catch (err) {
    req.log.error({ err }, 'failed to list tasks');
    next(err);
  }
}



























