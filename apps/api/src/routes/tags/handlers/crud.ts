/**
 * Tags CRUD Handlers
 *
 * GET /tags - List tags with autocomplete
 * POST /tags - Create new tag (idempotent)
 * PUT /tags/:id - Update tag
 * DELETE /tags/:id - Delete tag
 */

import { Router, type Request, type Response } from 'express';
import { db, tags } from '@cactus/db';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth } from '../../../auth/middlewares';
import { validate } from '../../../utils/validation';
import { idParamSchema } from '../../../utils/common-schemas';
import { createRouteHandler, createAsyncHandler, HttpError } from '../../../utils/route-handler';
import { PAGINATION_LIMITS } from '../../../config/api-limits';
import { listTagsQuerySchema, createTagSchema, updateTagSchema } from '../schemas';
import { cache, invalidateCache } from '../../../middleware/cache';
import { REDIS_TTL } from '../../../config/redis';
import { buildCacheKey } from '../../../config/redis';

const router = Router();

// GET /tags - List tags with autocomplete
router.get(
  '/',
  requireAuth,
  validate({ query: listTagsQuerySchema }),
  cache({
    ttl: REDIS_TTL.TAGS,
    keyPrefix: 'tags',
    keyBuilder: (req) => {
      const userId = req.user?.id || 'anonymous';
      const { scope, q, limit } = req.query;
      const scopeStr = typeof scope === 'string' ? scope : 'all';
      const qStr = typeof q === 'string' ? q : 'all';
      const limitStr = typeof limit === 'string' ? limit : 'all';
      return buildCacheKey('tags', userId, scopeStr, qStr, limitStr);
    },
  }),
  createRouteHandler(async (req: Request) => {
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

    return items;
  })
);

// POST /tags - Create new tag (idempotent)
router.post(
  '/',
  requireAuth,
  validate({ body: createTagSchema }),
  createAsyncHandler(async (req: Request, res: Response) => {
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
      return res.status(200).json({ success: true, data: existingTag, requestId: req.requestId });
    }

    const [newTag] = await db()
      .insert(tags)
      .values({
        ...validated,
        createdByUserId: userId,
      })
      .returning();

    // Invalidate tags cache
    await invalidateCache('crm:tags:*');

    req.log.info({ tagId: newTag.id }, 'tag created');
    return res.status(201).json({ success: true, data: newTag, requestId: req.requestId });
  })
);

// PUT /tags/:id - Update tag
router.put(
  '/:id',
  requireAuth,
  validate({
    params: idParamSchema,
    body: updateTagSchema,
  }),
  createRouteHandler(async (req: Request) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const validated = req.body;

    // Verify tag exists
    const [existingTag] = await db().select().from(tags).where(eq(tags.id, id)).limit(1);

    if (!existingTag) {
      throw new HttpError(404, 'Tag not found');
    }

    // Verify permissions: only managers and admins can update any tag
    // Advisors can only update tags they created
    if (userRole === 'advisor') {
      if (existingTag.createdByUserId !== userId) {
        throw new HttpError(403, 'You can only update tags you created');
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

    // Invalidate tags cache
    await invalidateCache('crm:tags:*');

    req.log.info({ tagId: id }, 'tag updated');
    return updated;
  })
);

// DELETE /tags/:id - Delete tag
router.delete(
  '/:id',
  requireAuth,
  validate({ params: idParamSchema }),
  createRouteHandler(async (req: Request) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Verify tag exists
    const [tag] = await db().select().from(tags).where(eq(tags.id, id)).limit(1);

    if (!tag) {
      throw new HttpError(404, 'Tag not found');
    }

    // Verify permissions
    if (userRole === 'advisor') {
      if (tag.createdByUserId !== userId) {
        throw new HttpError(403, 'You can only delete tags you created');
      }
    }

    // Delete tag (cascade will remove relationships)
    await db().delete(tags).where(eq(tags.id, id));

    // Invalidate tags cache
    await invalidateCache('crm:tags:*');

    req.log.info({ tagId: id }, 'tag deleted');
    return { id, deleted: true };
  })
);

export default router;





