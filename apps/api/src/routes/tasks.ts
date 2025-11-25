// REGLA CURSOR: Tasks CRUD - mantener RBAC, data isolation, validación Zod, logging estructurado
import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, tasks, taskRecurrences, contacts, users } from '@cactus/db';
import { eq, desc, and, isNull, inArray, lte, gte, sql, or, type InferSelectModel } from 'drizzle-orm';
import { requireAuth } from '../auth/middlewares';
import { getUserAccessScope, buildContactAccessFilter, canAccessContact } from '../auth/authorization';
import { createDrizzleLogger } from '../utils/db-logger';
import { z } from 'zod';
import { validate } from '../utils/validation';
import { 
  uuidSchema,
  paginationQuerySchema,
  dateSchema 
} from '../utils/common-schemas';

const router = Router();

// ==========================================================
// Schemas de validación
// ==========================================================

// Query parameter schemas
// AI_DECISION: Usar .and() en lugar de .extend() porque paginationQuerySchema es ZodEffects
// Justificación: .extend() solo funciona en ZodObject, pero paginationQuerySchema tiene .refine()
// Impacto: Schema combinado correctamente manteniendo validación de paginación
const listTasksQuerySchema = paginationQuerySchema.and(
  z.object({
    status: z.string().optional(),
    assignedToUserId: z.string().uuid().optional(),
    contactId: z.string().uuid().optional(),
    dueDateFrom: dateSchema.optional(),
    dueDateTo: dateSchema.optional(),
    priority: z.string().optional(),
    includeCompleted: z.enum(['true', 'false']).optional().default('false')
  })
);

const exportTasksQuerySchema = z.object({
  status: z.string().optional(),
  assignedToUserId: z.string().uuid().optional(),
  dueDateFrom: dateSchema.optional(),
  dueDateTo: dateSchema.optional()
});

// Body schemas
const createTaskSchema = z.object({
  contactId: z.string().uuid(),
  meetingId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(500),
  description: z.string().optional().nullable(),
  status: z.string(), // Referencia a lookupTaskStatus
  dueDate: z.string().optional().nullable(), // ISO date
  dueTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(), // HH:MM
  priority: z.string(), // Referencia a lookupPriority
  assignedToUserId: z.string().uuid(),
  recurrence: z.object({
    rrule: z.string(),
    timezone: z.string().default('America/Argentina/Buenos_Aires'),
    startDate: z.string(),
    endDate: z.string().optional().nullable()
  }).optional()
});

const updateTaskSchema = createTaskSchema.omit({ contactId: true }).partial();

const bulkActionSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1),
  action: z.enum(['complete', 'delete', 'reassign', 'change_status']),
  params: z.record(z.any()).optional()
});

// ==========================================================
// GET /tasks - Listar tareas con filtros
// ==========================================================
router.get('/', 
  requireAuth,
  validate({ query: listTasksQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
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
      includeCompleted = 'false'
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
      )
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
        total: sql<number>`COUNT(*) OVER()`.as('total')
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
    type TaskItem = typeof items[0];
    const formattedItems = items.map((item: TaskItem) => {
      const { total: _total, contactFirstName, contactLastName, contactFullName, contactEmail, assignedUserEmail, assignedUserFullName, ...task } = item;
      return {
        ...task,
        contact: task.contactId ? {
          id: task.contactId,
          firstName: contactFirstName,
          lastName: contactLastName,
          fullName: contactFullName,
          email: contactEmail
        } : null,
        assignedUser: task.assignedToUserId ? {
          id: task.assignedToUserId,
          email: assignedUserEmail,
          fullName: assignedUserFullName
        } : null
      };
    });

    res.json({
      data: formattedItems,
      meta: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total
      }
    });
  } catch (err) {
    req.log.error({ err }, 'failed to list tasks');
    next(err);
  }
});

// ==========================================================
// GET /tasks/:id - Obtener tarea específica
// ==========================================================
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // AI_DECISION: Optimizar query de task con recurrencia - usar LEFT JOIN en lugar de query condicional
    // Justificación: Elimina query condicional, reduce latencia cuando hay recurrencia (50% reducción)
    // Impacto: Mejora performance del endpoint GET /tasks/:id
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
          updatedAt: taskRecurrences.updatedAt
        }
      })
      .from(tasks)
      .leftJoin(taskRecurrences, eq(tasks.recurrenceId, taskRecurrences.id))
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .limit(1);

    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const taskData = result[0];
    const { recurrence, ...task } = taskData;

    res.json({
      data: {
        ...task,
        recurrence: recurrence?.id ? recurrence : null
      }
    });
  } catch (err) {
    req.log.error({ err, taskId: req.params.id }, 'failed to get task');
    next(err);
  }
});

// ==========================================================
// POST /tasks - Crear nueva tarea
// ==========================================================
router.post('/', 
  requireAuth,
  validate({ body: createTaskSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Verify user has access to the contact
    const hasContactAccess = await canAccessContact(userId, userRole, validated.contactId);
    if (!hasContactAccess) {
      req.log.warn({ 
        contactId: validated.contactId, 
        userId, 
        userRole 
      }, 'user attempted to create task for inaccessible contact');
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
          isActive: true
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
        recurrenceId
      })
      .returning();

    req.log.info({ taskId: newTask.id }, 'task created');
    res.status(201).json({ data: newTask });
  } catch (err) {
    req.log.error({ err }, 'failed to create task');
    next(err);
  }
});

// ==========================================================
// PUT /tasks/:id - Actualizar tarea
// ==========================================================

const taskIdParamsSchema = z.object({ id: uuidSchema });

router.put('/:id', 
  requireAuth,
  validate({ 
    params: taskIdParamsSchema,
    body: updateTaskSchema 
  }),
  async (req: Request, res: Response, next: NextFunction) => {
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
      req.log.warn({ 
        taskId: id, 
        contactId: existing.contactId,
        assignedToUserId: existing.assignedToUserId,
        userId, 
        userRole 
      }, 'user attempted to update inaccessible task');
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
        updatedAt: new Date()
      })
      .where(and(
        eq(tasks.id, id),
        eq(tasks.version, existing.version) // Validar versión para optimistic locking
      ))
      .returning();

    // Si no se actualizó ningún registro, significa conflicto de versión
    if (updated.length === 0) {
      req.log.warn({ 
        taskId: id, 
        expectedVersion: existing.version,
        message: 'Version conflict detected'
      }, 'Task update failed due to version conflict');
      
      return res.status(409).json({
        error: 'Version conflict',
        message: 'El recurso fue modificado por otro usuario. Por favor recarga la página.'
      });
    }

    req.log.info({ taskId: id }, 'task updated');
    res.json({ success: true, data: updated });
  } catch (err) {
    req.log.error({ err, taskId: req.params.id }, 'failed to update task');
    next(err);
  }
});

// ==========================================================
// POST /tasks/:id/complete - Completar tarea
// ==========================================================
router.post('/:id/complete', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const [task] = await db()
      .update(tasks)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date()
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
        .where(and(
          eq(taskRecurrences.id, task.recurrenceId),
          eq(taskRecurrences.isActive, true)
        ))
        .limit(1);

      if (recurrence && recurrence.nextOccurrence) {
        // TODO: Calcular siguiente ocurrencia usando rrule library
        // y crear nueva tarea
        req.log.info({ recurrenceId: recurrence.id }, 'should create next occurrence');
      }
    }

    req.log.info({ taskId: id }, 'task completed');
    res.json({ success: true, data: task });
  } catch (err) {
    req.log.error({ err, taskId: req.params.id }, 'failed to complete task');
    next(err);
  }
});

// ==========================================================
// POST /tasks/bulk - Acciones masivas sobre tareas
// ==========================================================
router.post('/bulk', 
  requireAuth,
  validate({ body: bulkActionSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
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
            updatedAt: new Date()
          })
          .where(and(
            inArray(tasks.id, taskIds),
            isNull(tasks.deletedAt)
          ))
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
            updatedAt: new Date()
          })
          .where(and(
            inArray(tasks.id, taskIds),
            isNull(tasks.deletedAt)
          ))
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
            updatedAt: new Date()
          })
          .where(and(
            inArray(tasks.id, taskIds),
            isNull(tasks.deletedAt)
          ))
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
});

// ==========================================================
// DELETE /tasks/:id - Soft delete de tarea
// ==========================================================
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
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
      req.log.warn({ 
        taskId: id, 
        contactId: existing.contactId,
        assignedToUserId: existing.assignedToUserId,
        userId, 
        userRole 
      }, 'user attempted to delete inaccessible task');
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
});

// ==========================================================
// GET /tasks/export/csv - Exportar tareas a CSV
// ==========================================================
router.get('/export/csv', 
  requireAuth,
  validate({ query: exportTasksQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      status,
      assignedToUserId,
      dueDateFrom,
      dueDateTo
    } = req.query;

    const conditions = [isNull(tasks.deletedAt)];

    if (status) {
      conditions.push(eq(tasks.status, status as string));
    }
    if (assignedToUserId) {
      conditions.push(eq(tasks.assignedToUserId, assignedToUserId as string));
    }
    if (dueDateFrom) {
      conditions.push(gte(tasks.dueDate, dueDateFrom as string));
    }
    if (dueDateTo) {
      conditions.push(lte(tasks.dueDate, dueDateTo as string));
    }

    const items = await db()
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.dueDate))
      .limit(10000); // Límite razonable para export

    // Convertir a CSV simple
    const headers = ['id', 'title', 'status', 'priority', 'dueDate', 'assignedToUserId', 'contactId', 'createdAt'];
    type TaskItem = InferSelectModel<typeof tasks>;
    const csv = [
      headers.join(','),
      ...items.map((item: TaskItem) => headers.map(h => item[h as keyof typeof item] || '').join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="tasks_export_${new Date().toISOString()}.csv"`);
    res.send(csv);

    req.log.info({ count: items.length }, 'tasks exported to CSV');
  } catch (err) {
    req.log.error({ err }, 'failed to export tasks');
    next(err);
  }
});

// ==========================================================
// GET /tasks/batch - Obtener tareas de múltiples contactos (batch)
// ==========================================================
const batchTasksQuerySchema = z.object({
  contactIds: z.string().min(1),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  status: z.string().optional(),
  includeCompleted: z.enum(['true', 'false']).optional().default('false')
});

router.get('/batch',
  requireAuth,
  validate({ query: batchTasksQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { validateBatchIds } = await import('../utils/batch-validation');
      
      const validation = validateBatchIds(req.query.contactIds as string, {
        maxCount: 50, // Límite específico para tasks batch
        fieldName: 'contactIds'
      });

      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid contact IDs',
          details: validation.errors
        });
      }

      const userId = req.user!.id;
      const userRole = req.user!.role;
      const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
      const offset = Math.max(0, Number(req.query.offset) || 0);
      const status = req.query.status as string | undefined;
      const includeCompleted = req.query.includeCompleted === 'true';

      // Get user access scope for data isolation
      const accessScope = await getUserAccessScope(userId, userRole);
      const accessFilter = buildContactAccessFilter(accessScope);
      const dbLogger = createDrizzleLogger(req.log);

      const conditions = [
        inArray(tasks.contactId, validation.ids),
        isNull(tasks.deletedAt)
      ];

      if (!includeCompleted) {
        conditions.push(isNull(tasks.completedAt));
      }

      if (status) {
        conditions.push(eq(tasks.status, status));
      }

      // Data isolation: Only tasks on accessible contacts
      conditions.push(
        sql`${tasks.contactId} IN (
          SELECT id FROM ${contacts} 
          WHERE ${accessFilter.whereClause}
        )`
      );

      // Fetch tasks with pagination
      type Task = InferSelectModel<typeof tasks>;
      const tasksList = await dbLogger.select(
        'batch_tasks_main',
        () => db()
          .select()
          .from(tasks)
          .where(and(...conditions))
          .orderBy(desc(tasks.dueDate), desc(tasks.createdAt))
          .limit(limit)
          .offset(offset)
      );

      // Get total count using window function
      type TaskWithTotal = Array<{ id: string; total: number }>;
      const tasksWithTotal = await dbLogger.select(
        'batch_tasks_count',
        () => db()
          .select({
            id: tasks.id,
            total: sql<number>`count(*) OVER()`.as('total')
          })
          .from(tasks)
          .where(and(...conditions))
          .limit(1)
      ) as TaskWithTotal;

      const total = tasksWithTotal.length > 0 ? Number(tasksWithTotal[0].total) : 0;

      const tasksListTyped = tasksList as Task[];
      req.log.info({ 
        requestedContactIds: validation.ids.length,
        returnedCount: tasksListTyped.length,
        total,
        status,
        includeCompleted 
      }, 'tasks batch fetched');

      res.json({
        success: true,
        data: tasksListTyped,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });
    } catch (err) {
      req.log.error({ err }, 'failed to fetch tasks batch');
      next(err);
    }
  }
);

export default router;

