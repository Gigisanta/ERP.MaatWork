import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, tasks, taskRecurrences, contacts } from '@cactus/db';
import { eq, desc, and, isNull, inArray, lte, gte, sql, or } from 'drizzle-orm';
import { requireAuth } from '../auth/middlewares';
import { z } from 'zod';

const router = Router();

// ==========================================================
// Schemas de validación
// ==========================================================

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
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
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

    const conditions = [];
    
    if (includeCompleted === 'false') {
      conditions.push(isNull(tasks.completedAt));
    }
    conditions.push(isNull(tasks.deletedAt));

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
      .select()
      .from(tasks)
      .where(and(...conditions))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string))
      .orderBy(desc(tasks.dueDate));

    res.json({
      data: items,
      meta: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
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

    const [task] = await db()
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .limit(1);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Si tiene recurrencia, obtener detalles
    let recurrence = null;
    if (task.recurrenceId) {
      [recurrence] = await db()
        .select()
        .from(taskRecurrences)
        .where(eq(taskRecurrences.id, task.recurrenceId))
        .limit(1);
    }

    res.json({
      data: {
        ...task,
        recurrence
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
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createTaskSchema.parse(req.body);
    const userId = req.user!.id;

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
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    req.log.error({ err }, 'failed to create task');
    next(err);
  }
});

// ==========================================================
// PUT /tasks/:id - Actualizar tarea
// ==========================================================
router.put('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validated = updateTaskSchema.parse(req.body);

    const [existing] = await db()
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const [updated] = await db()
      .update(tasks)
      .set({
        ...validated,
        version: existing.version + 1,
        updatedAt: new Date()
      })
      .where(eq(tasks.id, id))
      .returning();

    req.log.info({ taskId: id }, 'task updated');
    res.json({ data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
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
    res.json({ data: task });
  } catch (err) {
    req.log.error({ err, taskId: req.params.id }, 'failed to complete task');
    next(err);
  }
});

// ==========================================================
// POST /tasks/bulk - Acciones masivas sobre tareas
// ==========================================================
router.post('/bulk', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskIds, action, params } = bulkActionSchema.parse(req.body);

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
    res.json({ data: { affected, action } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
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

    const [deleted] = await db()
      .update(tasks)
      .set({ deletedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Task not found' });
    }

    req.log.info({ taskId: id }, 'task deleted');
    res.json({ data: { id, deleted: true } });
  } catch (err) {
    req.log.error({ err, taskId: req.params.id }, 'failed to delete task');
    next(err);
  }
});

// ==========================================================
// GET /tasks/export/csv - Exportar tareas a CSV
// ==========================================================
router.get('/export/csv', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
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
    const csv = [
      headers.join(','),
      ...items.map((item: any) => headers.map(h => item[h as keyof typeof item] || '').join(','))
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

export default router;

