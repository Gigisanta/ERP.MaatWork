import { type Request } from 'express';
import { db, feedback } from '@maatwork/db';
import { eq, desc, and, count, sql } from 'drizzle-orm';
import { createRouteHandler } from '../../utils/route-handler';
import { listFeedbackQuerySchema } from './schemas';

/**
 * Create new feedback
 * POST /v1/feedback
 */
export const handleCreateFeedback = createRouteHandler(async (req: Request) => {
  const userId = req.user!.id;
  const { type, content } = req.body;

  const [newFeedback] = await db()
    .insert(feedback)
    .values({
      userId,
      type,
      content,
    })
    .returning();

  return newFeedback;
});

/**
 * List all feedback (admin only)
 * GET /v1/feedback
 */
export const handleListFeedback = createRouteHandler(async (req: Request) => {
  const { status, type, page, limit } = listFeedbackQuerySchema.parse(req.query);

  const offset = (page - 1) * limit;

  // Build conditions dynamically
  const conditions = [];
  if (status) {
    conditions.push(eq(feedback.status, status));
  }
  if (type) {
    conditions.push(eq(feedback.type, type));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const [{ totalCount }] = await db()
    .select({ totalCount: count() })
    .from(feedback)
    .where(whereClause);

  // Get paginated items with user info
  const items = await db()
    .select({
      id: feedback.id,
      userId: feedback.userId,
      type: feedback.type,
      content: feedback.content,
      status: feedback.status,
      adminNotes: feedback.adminNotes,
      createdAt: feedback.createdAt,
      updatedAt: feedback.updatedAt,
    })
    .from(feedback)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(feedback.createdAt));

  return {
    items,
    meta: {
      page,
      limit,
      total: Number(totalCount),
      totalPages: Math.ceil(Number(totalCount) / limit),
    },
  };
});

/**
 * Update feedback status (admin only)
 * PATCH /v1/feedback/:id
 */
export const handleUpdateFeedbackStatus = createRouteHandler(async (req: Request) => {
  const { id } = req.params;
  const { status, adminNotes } = req.body;

  const [updated] = await db()
    .update(feedback)
    .set({
      status,
      adminNotes,
      updatedAt: new Date(),
    })
    .where(eq(feedback.id, id))
    .returning();

  if (!updated) {
    throw new Error('Feedback not found');
  }

  return updated;
});
