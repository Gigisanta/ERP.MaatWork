/**
 * Tags CRUD Handlers
 *
 * GET /tags - List tags with autocomplete
 * POST /tags - Create new tag (idempotent)
 * PUT /tags/:id - Update tag
 * DELETE /tags/:id - Delete tag
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, tags } from '@cactus/db';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth } from '../../../auth/middlewares';
import { validate } from '../../../utils/validation';
import { idParamSchema } from '../../../utils/common-schemas';
import { PAGINATION_LIMITS } from '../../../config/api-limits';
import { listTagsQuerySchema, createTagSchema, updateTagSchema } from '../schemas';

const router = Router();

// GET /tags - List tags with autocomplete
router.get(
  '/',
  requireAuth,
  validate({ query: listTagsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { scope, q, limit = String(PAGINATION_LIMITS.QUICK_SEARCH_LIMIT) } = req.query;

      const conditions = [];
      if (scope) {
        conditions.push(eq(tags.scope, scope as string));
      }

      // ILIKE search for autocomplete
      if (q) {
        conditions.push(sql`LOWER(${tags.name}) LIKE LOWER(${'%' + q + '%'})`);
      }

      const items = await db()
        .select({
          id: tags.id,
          name: tags.name,
          color: tags.color,
          icon: tags.icon,
          businessLine: tags.businessLine,
        })
        .from(tags)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(sql`LOWER(${tags.name})`)
        .limit(parseInt(limit as string));

      res.json({ success: true, data: items });
    } catch (err) {
      req.log.error({ err }, 'failed to list tags');
      next(err);
    }
  }
);

// POST /tags - Create new tag (idempotent)
router.post(
  '/',
  requireAuth,
  validate({ body: createTagSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = req.body;
      const userId = req.user!.id;

      // Search for existing tag (case-insensitive)
      const [existingTag] = await db()
        .select()
        .from(tags)
        .where(
          and(eq(tags.scope, validated.scope), sql`LOWER(${tags.name}) = LOWER(${validated.name})`)
        )
        .limit(1);

      if (existingTag) {
        return res.status(200).json({ data: existingTag });
      }

      const [newTag] = await db()
        .insert(tags)
        .values({
          ...validated,
          createdByUserId: userId,
        })
        .returning();

      req.log.info({ tagId: newTag.id }, 'tag created');
      res.status(201).json({ data: newTag });
    } catch (err) {
      req.log.error({ err }, 'failed to create tag');
      next(err);
    }
  }
);

// PUT /tags/:id - Update tag
router.put(
  '/:id',
  requireAuth,
  validate({
    params: idParamSchema,
    body: updateTagSchema,
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const validated = req.body;

      // Verify tag exists
      const [existingTag] = await db().select().from(tags).where(eq(tags.id, id)).limit(1);

      if (!existingTag) {
        return res.status(404).json({ error: 'Tag not found' });
      }

      // Verify permissions: only managers and admins can update any tag
      // Advisors can only update tags they created
      if (userRole === 'advisor') {
        if (existingTag.createdByUserId !== userId) {
          return res.status(403).json({ error: 'You can only update tags you created' });
        }
      }

      const [updated] = await db()
        .update(tags)
        .set({
          ...validated,
          updatedAt: new Date(),
        })
        .where(eq(tags.id, id))
        .returning();

      req.log.info({ tagId: id }, 'tag updated');
      res.json({ success: true, data: updated });
    } catch (err) {
      req.log.error({ err, tagId: req.params.id }, 'failed to update tag');
      next(err);
    }
  }
);

// DELETE /tags/:id - Delete tag
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Verify tag exists
    const [tag] = await db().select().from(tags).where(eq(tags.id, id)).limit(1);

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Verify permissions
    if (userRole === 'advisor') {
      if (tag.createdByUserId !== userId) {
        return res.status(403).json({ error: 'You can only delete tags you created' });
      }
    }

    // Delete tag (cascade will remove relationships)
    await db().delete(tags).where(eq(tags.id, id));

    req.log.info({ tagId: id }, 'tag deleted');
    res.json({ success: true, data: { id, deleted: true } });
  } catch (err) {
    req.log.error({ err, tagId: req.params.id }, 'failed to delete tag');
    next(err);
  }
});

export default router;
