/**
 * Contacts History Routes
 * 
 * Handles contact change history operations
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, contactFieldHistory } from '@cactus/db';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '../../auth/middlewares';
import { validate } from '../../utils/validation';
import { idParamSchema, paginationQuerySchema } from '../../utils/common-schemas';

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
router.get('/:id/history', 
  requireAuth,
  validate({ 
    params: idParamSchema,
    query: historyQuerySchema 
  }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    const history = await db()
      .select()
      .from(contactFieldHistory)
      .where(eq(contactFieldHistory.contactId, id))
      .orderBy(desc(contactFieldHistory.changedAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json({
      data: history,
      meta: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (err) {
    req.log.error({ err, contactId: req.params.id }, 'failed to get contact history');
    next(err);
  }
});

export default router;

