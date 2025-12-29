/**
 * Handler para exportar tareas a CSV
 *
 * AI_DECISION: Extraer handler de export a módulo separado
 * Justificación: Separar responsabilidades mejora mantenibilidad
 * Impacto: Código más organizado
 */

import type { Request, Response, NextFunction } from 'express';
import { db, tasks } from '@maatwork/db';
import { eq, desc, and, isNull, lte, gte, type InferSelectModel } from 'drizzle-orm';
import { createAsyncHandler } from '../../../utils/route-handler';

/**
 * GET /tasks/export/csv - Exportar tareas a CSV
 */
export const handleExportCsv = createAsyncHandler(async (req: Request, res: Response) => {
  const { status, assignedToUserId, dueDateFrom, dueDateTo } = req.query;

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
  const headers = [
    'id',
    'title',
    'status',
    'priority',
    'dueDate',
    'assignedToUserId',
    'contactId',
    'createdAt',
  ];
  type TaskItem = InferSelectModel<typeof tasks>;
  const csv = [
    headers.join(','),
    ...items.map((item: TaskItem) =>
      headers.map((h) => item[h as keyof typeof item] || '').join(',')
    ),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="tasks_export_${new Date().toISOString()}.csv"`
  );
  res.send(csv);

  req.log.info({ count: items.length }, 'tasks exported to CSV');
});




