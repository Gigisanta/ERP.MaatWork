import { db, tasks, taskRecurrences, contacts, users } from '@maatwork/db';
import { eq, and, isNull, desc, lte, gte, sql, or, inArray } from 'drizzle-orm';
import { canAccessContact, getUserAccessScope, buildContactAccessFilter } from '../auth/authorization';
import { syncTaskToGoogle } from './task-sync';
import type { Logger } from 'pino';
import type { UserRole } from '@maatwork/types';

interface CreateTaskParams {
  userId: string;
  userRole: UserRole;
  data: {
    contactId: string;
    meetingId?: string;
    title: string;
    description?: string;
    status: string;
    dueDate?: string | Date;
    dueTime?: string;
    priority: string;
    assignedToUserId: string;
    recurrence?: {
      rrule: string;
      timezone: string;
      startDate: string | Date;
      endDate?: string | Date;
    };
  };
  log: Logger;
}

export async function createTask({ userId, userRole, data, log }: CreateTaskParams) {
  // Verify user has access to the contact
  const hasContactAccess = await canAccessContact(userId, userRole, data.contactId);
  if (!hasContactAccess) {
    log.warn(
      {
        contactId: data.contactId,
        userId,
        userRole,
      },
      'user attempted to create task for inaccessible contact'
    );
    throw new Error('Contact not found or access denied');
  }

  // Si hay recurrencia, crear la definición de recurrencia primero
  let recurrenceId = null;
  if (data.recurrence) {
    const [rec] = await db()
      .insert(taskRecurrences)
      .values({
        rrule: data.recurrence.rrule,
        timezone: data.recurrence.timezone,
        startDate: data.recurrence.startDate,
        endDate: data.recurrence.endDate || null,
        nextOccurrence: data.recurrence.startDate,
        isActive: true,
      })
      .returning();
    recurrenceId = rec.id;
  }

  const [newTask] = await db()
    .insert(tasks)
    .values({
      contactId: data.contactId,
      meetingId: data.meetingId || null,
      title: data.title,
      description: data.description || null,
      status: data.status,
      dueDate: data.dueDate || null,
      dueTime: data.dueTime || null,
      priority: data.priority,
      assignedToUserId: data.assignedToUserId,
      createdByUserId: userId,
      createdFrom: 'manual',
      recurrenceId,
    })
    .returning();

  log.info({ taskId: newTask.id }, 'task created');

  // Sync to Google Calendar
  syncTaskToGoogle(newTask.id, 'create').catch((err) =>
    log.error({ err, taskId: newTask.id }, 'failed to sync task to google')
  );

  return newTask;
}

interface UpdateTaskParams {
  id: string;
  userId: string;
  userRole: UserRole;
  data: Partial<{
    title: string;
    description: string | null;
    status: string;
    dueDate: string | Date | null;
    dueTime: string | null;
    priority: string;
    assignedToUserId: string;
    completedAt: string | Date | null;
  }>;
  log: Logger;
}

export async function updateTask({ id, userId, userRole, data, log }: UpdateTaskParams) {
  const [existing] = await db()
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
    .limit(1);

  if (!existing) {
    throw new Error('Task not found');
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
    log.warn(
      {
        taskId: id,
        contactId: existing.contactId,
        assignedToUserId: existing.assignedToUserId,
        userId,
        userRole,
      },
      'user attempted to update inaccessible task'
    );
    throw new Error('Task not found or access denied');
  }

  // Optimistic locking with version check
  const [updated] = await db()
    .update(tasks)
    .set({
      ...data,
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

  if (!updated) {
    log.warn(
      {
        taskId: id,
        expectedVersion: existing.version,
        message: 'Version conflict detected',
      },
      'Task update failed due to version conflict'
    );
    throw new Error('Version conflict');
  }

  log.info({ taskId: id }, 'task updated');

  // Sync to Google Calendar
  syncTaskToGoogle(id, 'update').catch((err) =>
    log.error({ err, taskId: id }, 'failed to sync task to google')
  );

  return updated;
}

interface DeleteTaskParams {
  id: string;
  userId: string;
  userRole: UserRole;
  log: Logger;
}

export async function deleteTask({ id, userId, userRole, log }: DeleteTaskParams) {
  // First get the existing task to check access
  const [existing] = await db()
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
    .limit(1);

  if (!existing) {
    throw new Error('Task not found');
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
    log.warn(
      {
        taskId: id,
        contactId: existing.contactId,
        assignedToUserId: existing.assignedToUserId,
        userId,
        userRole,
      },
      'user attempted to delete inaccessible task'
    );
    throw new Error('Task not found or access denied');
  }

  const [deleted] = await db()
    .update(tasks)
    .set({ deletedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning();

  log.info({ taskId: id }, 'task deleted');

  // Sync to Google Calendar
  syncTaskToGoogle(id, 'delete').catch((err) =>
    log.error({ err, taskId: id }, 'failed to sync task deletion to google')
  );

  return { id, deleted: true };
}

export interface ListTasksParams {
  userId: string;
  userRole: UserRole;
  query: {
    limit?: string;
    offset?: string;
    status?: string;
    assignedToUserId?: string;
    contactId?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
    priority?: string;
    includeCompleted?: string;
  };
  log: Logger;
}

export async function listTasks({ userId, userRole, query, log }: ListTasksParams) {
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
  } = query;

  // Get user access scope for data isolation
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
    conditions.push(eq(tasks.contactId, contactId as string));
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

  return {
    data: formattedItems,
    meta: {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      total,
    },
  };
}

interface GetTaskParams {
  id: string;
}

export async function getTask({ id }: GetTaskParams) {
  const result = await db()
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      assignedToUserId: tasks.assignedToUserId,
      contactId: tasks.contactId,
      recurrenceId: tasks.recurrenceId,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      deletedAt: tasks.deletedAt,
      recurrence: {
        id: taskRecurrences.id,
        rrule: taskRecurrences.rrule,
        timezone: taskRecurrences.timezone,
        startDate: taskRecurrences.startDate,
        endDate: taskRecurrences.endDate,
        nextOccurrence: taskRecurrences.nextOccurrence,
        isActive: taskRecurrences.isActive,
        createdAt: taskRecurrences.createdAt,
        updatedAt: taskRecurrences.updatedAt,
      },
    })
    .from(tasks)
    .leftJoin(taskRecurrences, eq(tasks.recurrenceId, taskRecurrences.id))
    .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
    .limit(1);

  if (!result || result.length === 0) {
    throw new Error('Task not found');
  }

  const taskData = result[0];
  const { recurrence, ...task } = taskData;

  return {
    ...task,
    recurrence: recurrence?.id ? recurrence : null,
  };
}

interface BulkActionParams {
  taskIds: string[];
  action: 'complete' | 'delete' | 'reassign' | 'change_status';
  params?: {
    assignedToUserId?: string;
    status?: string;
  };
  log: Logger;
}

export async function bulkAction({ taskIds, action, params, log }: BulkActionParams) {
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
        throw new Error('assignedToUserId required for reassign');
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
        throw new Error('status required for change_status');
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
      throw new Error('Invalid action');
  }

  log.info({ action, affected, taskIds }, 'bulk action completed');
  return { affected, action };
}

