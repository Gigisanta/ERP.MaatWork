/**
 * Contacts History Routes
 *
 * Handles contact change history operations
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, contactFieldHistory } from '@maatwork/db';
import { eq, desc, sql } from 'drizzle-orm';
import { requireAuth } from '../../auth/middlewares';
import { validate } from '../../utils/validation';
import { idParamSchema, paginationQuerySchema } from '../../utils/validation/common-schemas';
import { createRouteHandler } from '../../utils/route-handler';
import { parsePaginationParams, formatPaginatedResponse } from '../../utils/pagination';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

const historyQuerySchema = paginationQuerySchema;

// ==========================================================
// Routes
// ==========================================================

/**
 * GET /contacts/:id/history - Obtener historial de cambios
 */
router.get(
  '/:id/history',
  requireAuth,
  validate({
    params: idParamSchema,
    query: historyQuerySchema,
  }),
  createRouteHandler(async (req: Request) => {
    const { id } = req.params;
    const paginationParams = parsePaginationParams(req.query);

    interface HistoryItemWithTotal {
      id: string;
      contactId: string;
      fieldName: string;
      oldValue: string | null;
      newValue: string | null;
      changedByUserId: string;
      changedAt: Date;
      total: number;
    }

    const historyItems = (await db()
      .select({
        id: contactFieldHistory.id,
        contactId: contactFieldHistory.contactId,
        fieldName: contactFieldHistory.fieldName,
        oldValue: contactFieldHistory.oldValue,
        newValue: contactFieldHistory.newValue,
        changedByUserId: contactFieldHistory.changedByUserId,
        changedAt: contactFieldHistory.changedAt,
        total: sql<number>`COUNT(*) OVER()`.as('total'),
      })
      .from(contactFieldHistory)
      .where(eq(contactFieldHistory.contactId, id))
      .orderBy(desc(contactFieldHistory.changedAt))
      .limit(paginationParams.limit)
      .offset(paginationParams.offset)) as HistoryItemWithTotal[];

    const total = historyItems.length > 0 ? Number(historyItems[0].total) : 0;
    const history = historyItems.map(({ total: _total, ...item }) => item);

    return formatPaginatedResponse(history, total, paginationParams);
  })
);

export default router;
