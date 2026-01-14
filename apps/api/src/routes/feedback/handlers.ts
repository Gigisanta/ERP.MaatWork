import { type Request } from 'express';
import { db, feedback, users } from '@maatwork/db';
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

  // AI_DECISION: Notify admins and staff about new feedback
  // Justificación: Requerimiento del usuario para alertas proactivas
  // Impacto: Admins y Administrativos reciben notificaciones inmediatas al llegar feedback
  try {
    const recipients = await db()
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.isActive, true), sql`${users.role} IN ('admin', 'staff')`));

    if (recipients.length > 0) {
      const { notifications } = await import('@maatwork/db');
      const notificationData = recipients.map((r: { id: string }) => ({
        userId: r.id,
        type: 'feedback_received',
        severity: 'info',
        renderedBody: `Se ha recibido un nuevo feedback de tipo "${type}": "${
          content.substring(0, 50) + (content.length > 50 ? '...' : '')
        }"`,
        payload: {
          feedbackId: newFeedback.id,
          type,
          contentPreview: content.substring(0, 100),
        },
      }));

      await db().insert(notifications).values(notificationData);
    }
  } catch (error) {
    // Log error but don't fail the feedback creation
    req.log.error({ err: error }, 'Error creating feedback notifications');
  }

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
