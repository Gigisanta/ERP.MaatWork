import { type Request } from 'express';
import { db, notifications } from '@maatwork/db';
import { eq, desc, and, isNull, lte, or, count } from 'drizzle-orm';
import { createRouteHandler } from '../../../utils/route-handler';

export const handleListNotifications = createRouteHandler(async (req: Request) => {
  const userId = req.user!.id;
  const { limit = '50', offset = '0', unreadOnly = 'false', severity } = req.query;

  const conditions = [eq(notifications.userId, userId)];

  if (unreadOnly === 'true') {
    conditions.push(isNull(notifications.readAt));
  }
  if (severity) {
    conditions.push(eq(notifications.severity, severity as string));
  }

  // Filtrar notificaciones snoozed
  conditions.push(
    or(isNull(notifications.snoozedUntil), lte(notifications.snoozedUntil, new Date()))!
  );

  const items = await db()
    .select()
    .from(notifications)
    .where(and(...conditions))
    .limit(parseInt(limit as string))
    .offset(parseInt(offset as string))
    .orderBy(desc(notifications.createdAt));

  return {
    items,
    meta: {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    },
  };
});

export const handleGetUnreadCount = createRouteHandler(async (req: Request) => {
  const userId = req.user!.id;

  const [{ count: unreadCount }] = await db()
    .select({ count: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
        or(isNull(notifications.snoozedUntil), lte(notifications.snoozedUntil, new Date()))!
      )
    );

  return { count: Number(unreadCount) };
});
