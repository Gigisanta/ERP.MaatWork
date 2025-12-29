/**
 * Handler para obtener tareas de múltiples contactos (batch)
 *
 * AI_DECISION: Extraer handler de batch a módulo separado
 * Justificación: Separar responsabilidades mejora mantenibilidad
 * Impacto: Código más organizado
 */

import type { Request, Response, NextFunction } from 'express';
import { db, tasks, contacts } from '@maatwork/db';
import { eq, desc, and, isNull, inArray, sql, type InferSelectModel } from 'drizzle-orm';
import { getUserAccessScope, buildContactAccessFilter } from '../../../auth/authorization';
import { createDrizzleLogger } from '../../../utils/database/db-logger';
import { createRouteHandler, HttpError } from '../../../utils/route-handler';

/**
 * GET /tasks/batch - Obtener tareas de múltiples contactos (batch)
 */
export const handleBatchTasks = createRouteHandler(async (req: Request) => {
  const { validateBatchIds } = await import('../../../utils/database/batch-validation');

  const validation = validateBatchIds(req.query.contactIds as string, {
    maxCount: 50, // Límite específico para tasks batch
    fieldName: 'contactIds',
  });

  if (!validation.valid) {
    throw new HttpError(400, 'Invalid contact IDs', {
      details: validation.errors,
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

  const conditions = [inArray(tasks.contactId, validation.ids), isNull(tasks.deletedAt)];

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
  const tasksList = await dbLogger.select('batch_tasks_main', () =>
    db()
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.dueDate), desc(tasks.createdAt))
      .limit(limit)
      .offset(offset)
  );

  // Get total count using window function
  type TaskWithTotal = Array<{ id: string; total: number }>;
  const tasksWithTotal = (await dbLogger.select('batch_tasks_count', () =>
    db()
      .select({
        id: tasks.id,
        total: sql<number>`count(*) OVER()`.as('total'),
      })
      .from(tasks)
      .where(and(...conditions))
      .limit(1)
  )) as TaskWithTotal;

  const total = tasksWithTotal.length > 0 ? Number(tasksWithTotal[0].total) : 0;

  const tasksListTyped = tasksList as Task[];
  req.log.info(
    {
      requestedContactIds: validation.ids.length,
      returnedCount: tasksListTyped.length,
      total,
      status,
      includeCompleted,
    },
    'tasks batch fetched'
  );

  // AI_DECISION: createRouteHandler ya envuelve en { success: true, data: result }
  // Para mantener el formato de paginación, retornamos un objeto que incluya data y pagination.
  return {
    data: tasksListTyped,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  };
});
