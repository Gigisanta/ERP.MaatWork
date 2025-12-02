/**
 * Segments Handlers
 * 
 * GET /segments - List segments
 * POST /segments - Create segment
 * POST /segments/:id/refresh - Refresh dynamic segment
 * GET /segments/:id/contacts - List segment contacts
 * GET /segments/:id/export - Export segment to CSV
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, segments, segmentMembers, contacts } from '@cactus/db';
import { eq, desc, sql, and, inArray, type InferSelectModel } from 'drizzle-orm';
import { requireAuth } from '../../../auth/middlewares';
import { getUserAccessScope, buildContactAccessFilter } from '../../../auth/authorization';
import { validate } from '../../../utils/validation';
import { idParamSchema } from '../../../utils/common-schemas';
import { PAGINATION_LIMITS } from '../../../config/api-limits';
import { listSegmentsQuerySchema, segmentContactsQuerySchema, createSegmentSchema } from '../schemas';

const router = Router();
const TAGS_RULES_ENABLED = process.env.TAGS_RULES_ENABLED === 'true';

// GET /segments - List segments
router.get('/', 
  requireAuth,
  validate({ query: listSegmentsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { includeShared = 'true' } = req.query;

    const items = await db()
      .select()
      .from(segments)
      .where(sql`${segments.ownerId} = ${userId} OR ${segments.isShared} = true`)
      .orderBy(desc(segments.updatedAt));

    res.json({ success: true, data: items });
  } catch (err) {
    req.log.error({ err }, 'failed to list segments');
    next(err);
  }
});

// POST /segments - Create new segment
router.post('/', 
  requireAuth,
  validate({ body: createSegmentSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = req.body;
    const userId = req.user!.id;

    const [newSegment] = await db()
      .insert(segments)
      .values({
        ...validated,
        ownerId: userId,
        contactCount: 0
      })
      .returning();

    req.log.info({ segmentId: newSegment.id }, 'segment created');
    res.status(201).json({ data: newSegment });
  } catch (err) {
    req.log.error({ err }, 'failed to create segment');
    next(err);
  }
});

// POST /segments/:id/refresh - Refresh dynamic segment
router.post('/:id/refresh', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const accessScope = await getUserAccessScope(userId, userRole);
    const accessFilter = buildContactAccessFilter(accessScope);

    const [segment] = await db()
      .select()
      .from(segments)
      .where(eq(segments.id, id))
      .limit(1);

    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    if (!segment.isDynamic) {
      return res.status(400).json({ error: 'Segment is not dynamic' });
    }

    if (!TAGS_RULES_ENABLED) {
      return res.status(501).json({ error: 'Segments refresh disabled' });
    }
    
    // TODO: Implement actual filter evaluation
    await db()
      .delete(segmentMembers)
      .where(eq(segmentMembers.segmentId, id));

    const matchedContactIds: string[] = [];

    // Update counter
    await db()
      .update(segments)
      .set({
        contactCount: matchedContactIds.length,
        lastRefreshedAt: new Date()
      })
      .where(eq(segments.id, id));

    req.log.info({ segmentId: id, contacts: matchedContactIds.length }, 'segment refreshed');
    res.json({ 
      data: { 
        segmentId: id, 
        contactCount: matchedContactIds.length 
      } 
    });
  } catch (err) {
    req.log.error({ err, segmentId: req.params.id }, 'failed to refresh segment');
    next(err);
  }
});

// GET /segments/:id/contacts - List segment contacts
router.get('/:id/contacts', 
  requireAuth,
  validate({ 
    params: idParamSchema,
    query: segmentContactsQuerySchema 
  }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { limit = String(PAGINATION_LIMITS.DEFAULT_PAGE_SIZE), offset = '0' } = req.query;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const accessScope = await getUserAccessScope(userId, userRole);
    const accessFilter = buildContactAccessFilter(accessScope);

    const members = await db()
      .select()
      .from(segmentMembers)
      .where(eq(segmentMembers.segmentId, id))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    type SegmentMember = InferSelectModel<typeof segmentMembers>;
    const contactIds = members.map((m: SegmentMember) => m.contactId);

    let contactsList: InferSelectModel<typeof contacts>[] = [];
    if (contactIds.length > 0) {
      contactsList = await db()
        .select()
        .from(contacts)
        .where(and(
          inArray(contacts.id, contactIds),
          accessFilter.whereClause
        ));
    }

    res.json({
      data: contactsList,
      meta: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (err) {
    req.log.error({ err, segmentId: req.params.id }, 'failed to list segment contacts');
    next(err);
  }
});

// GET /segments/:id/export - Export segment to CSV
router.get('/:id/export', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const accessScope = await getUserAccessScope(userId, userRole);
    const accessFilter = buildContactAccessFilter(accessScope);

    const members = await db()
      .select()
      .from(segmentMembers)
      .where(eq(segmentMembers.segmentId, id));

    type SegmentMember = InferSelectModel<typeof segmentMembers>;
    const contactIds = members.map((m: SegmentMember) => m.contactId);

    let contactsList: InferSelectModel<typeof contacts>[] = [];
    if (contactIds.length > 0) {
      contactsList = await db()
        .select()
        .from(contacts)
        .where(and(
          inArray(contacts.id, contactIds),
          accessFilter.whereClause
        ));
    }

    // Convert to simple CSV
    const headers = ['id', 'fullName', 'email', 'phone', 'pipelineStageId', 'assignedAdvisorId'];
    const csv = [
      headers.join(','),
      ...contactsList.map((item) => headers.map(h => item[h as keyof typeof item] || '').join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="segment_export_${id}_${new Date().toISOString()}.csv"`);
    res.send(csv);

    req.log.info({ segmentId: id, count: contactsList.length }, 'segment exported');
  } catch (err) {
    req.log.error({ err, segmentId: req.params.id }, 'failed to export segment');
    next(err);
  }
});

export default router;

