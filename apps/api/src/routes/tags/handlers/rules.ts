/**
 * Tag Rules Handlers
 *
 * GET /rules - List tag rules
 * POST /rules - Create tag rule
 * POST /rules/:id/evaluate - Evaluate and apply rule
 *
 * AI_DECISION: Migrado a createRouteHandler/createAsyncHandler para manejo autom?tico de errores
 * Justificaci?n: Consistencia con otros handlers, manejo autom?tico de errores y formato de respuesta
 * Impacto: C?digo m?s limpio, menos duplicaci?n, mejor manejo de errores
 */

import { Router, type Request, type Response } from 'express';
import { db, tagRules } from '@cactus/db';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, requireRole } from '../../../auth/middlewares';
import { validate } from '../../../utils/validation';
import { createRouteHandler, createAsyncHandler, HttpError } from '../../../utils/route-handler';
import { PAGINATION_LIMITS } from '../../../config/api-limits';
import { listRulesQuerySchema, createTagRuleSchema } from '../schemas';
import { idParamSchema } from '../../../utils/common-schemas';

const router = Router();

// GET /rules - List tag rules
router.get(
  '/',
  requireAuth,
  validate({ query: listRulesQuerySchema }),
  createRouteHandler(async (req: Request) => {
    const { tagId } = req.query;

    const conditions = [];
    if (tagId) {
      conditions.push(eq(tagRules.tagId, tagId as string));
    }

    const items = await db()
      .select()
      .from(tagRules)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(tagRules.createdAt));

    return items;
  })
);

// POST /rules - Create tag rule
router.post(
  '/',
  requireAuth,
  requireRole(['manager', 'admin']),
  validate({ body: createTagRuleSchema }),
  createAsyncHandler(async (req: Request, res: Response) => {
    const validated = req.body;
    const userId = req.user!.id;

    const [newRule] = await db()
      .insert(tagRules)
      .values({
        ...validated,
        createdByUserId: userId,
      })
      .returning();

    req.log.info({ ruleId: newRule.id }, 'tag rule created');
    return res.status(201).json({ success: true, data: newRule, requestId: req.requestId });
  })
);

// POST /rules/:id/evaluate - Evaluate rule and apply
router.post(
  '/:id/evaluate',
  requireAuth,
  requireRole(['manager', 'admin']),
  validate({ params: idParamSchema }),
  createRouteHandler(async (req: Request) => {
    const { id } = req.params;

    const [rule] = await db().select().from(tagRules).where(eq(tagRules.id, id)).limit(1);

    if (!rule) {
      throw new HttpError(404, 'Tag rule not found');
    }

    // AI_DECISION: Evaluaci?n de reglas de tags pendiente de implementaci?n
    // Justificaci?n: Funcionalidad compleja que requiere evaluaci?n de condiciones contra contactos
    // Impacto: Las reglas de tags actualmente no se eval?an autom?ticamente
    // Estado: Funcionalidad futura - actualmente retorna lista vac?a como stub
    // Referencias: Requiere dise?o de motor de evaluaci?n de condiciones din?micas
    const matchedContactIds: string[] = [];

    req.log.info({ ruleId: id, matched: matchedContactIds.length }, 'rule evaluated');

    return {
      ruleId: id,
      matched: matchedContactIds.length,
      preview: matchedContactIds.slice(0, PAGINATION_LIMITS.QUICK_SEARCH_LIMIT),
    };
  })
);

export default router;
