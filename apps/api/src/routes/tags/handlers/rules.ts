/**
 * Tag Rules Handlers
 * 
 * GET /rules - List tag rules
 * POST /rules - Create tag rule
 * POST /rules/:id/evaluate - Evaluate and apply rule
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, tagRules } from '@cactus/db';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, requireRole } from '../../../auth/middlewares';
import { validate } from '../../../utils/validation';
import { PAGINATION_LIMITS } from '../../../config/api-limits';
import { listRulesQuerySchema, createTagRuleSchema } from '../schemas';

const router = Router();
const TAGS_RULES_ENABLED = process.env.TAGS_RULES_ENABLED === 'true';

// GET /rules - List tag rules
router.get('/', 
  requireAuth,
  validate({ query: listRulesQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
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

    res.json({ success: true, data: items });
  } catch (err) {
    req.log.error({ err }, 'failed to list tag rules');
    next(err);
  }
});

// POST /rules - Create tag rule
router.post('/', 
  requireAuth, 
  requireRole(['manager', 'admin']),
  validate({ body: createTagRuleSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = req.body;
    const userId = req.user!.id;

    const [newRule] = await db()
      .insert(tagRules)
      .values({
        ...validated,
        createdByUserId: userId
      })
      .returning();

    req.log.info({ ruleId: newRule.id }, 'tag rule created');
    res.status(201).json({ data: newRule });
  } catch (err) {
    req.log.error({ err }, 'failed to create tag rule');
    next(err);
  }
});

// POST /rules/:id/evaluate - Evaluate rule and apply
router.post('/:id/evaluate', requireAuth, requireRole(['manager', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const [rule] = await db()
      .select()
      .from(tagRules)
      .where(eq(tagRules.id, id))
      .limit(1);

    if (!rule) {
      return res.status(404).json({ error: 'Tag rule not found' });
    }

    if (!TAGS_RULES_ENABLED) {
      return res.status(501).json({ error: 'Tag rules evaluation disabled' });
    }

    // TODO: Implement actual rule evaluation
    const matchedContactIds: string[] = [];
    
    req.log.info({ ruleId: id, matched: matchedContactIds.length }, 'rule evaluated');
    res.json({ 
      data: { 
        ruleId: id,
        matched: matchedContactIds.length,
        preview: matchedContactIds.slice(0, PAGINATION_LIMITS.QUICK_SEARCH_LIMIT)
      } 
    });
  } catch (err) {
    req.log.error({ err, ruleId: req.params.id }, 'failed to evaluate rule');
    next(err);
  }
});

export default router;


