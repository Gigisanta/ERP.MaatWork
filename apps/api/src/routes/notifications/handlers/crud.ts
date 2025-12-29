import { type Request, type Response } from 'express';
import { db, notifications } from '@maatwork/db';
import { eq, and, isNull } from 'drizzle-orm';
import { createRouteHandler, createAsyncHandler, HttpError } from '../../../utils/route-handler';
import { z } from 'zod';
import { createNotificationSchema, snoozeNotificationSchema } from '../schemas';

export const handleMarkAsRead = createRouteHandler(async (req: Request) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const [notification] = await db()
    .update(notifications)
    .set({
      readAt: new Date(),
    })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning();

  if (!notification) {
    throw new HttpError(404, 'Notification not found');
  }

  req.log.info({ notificationId: id }, 'notification marked as read');
  return notification;
});

export const handleMarkAllAsRead = createRouteHandler(async (req: Request) => {
  const userId = req.user!.id;

  const updated = await db()
    .update(notifications)
    .set({
      readAt: new Date(),
    })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .returning();

  req.log.info({ count: updated.length }, 'all notifications marked as read');
  return { marked: updated.length };
});

export const handleSnoozeNotification = createRouteHandler(async (req: Request) => {
  const { id } = req.params;
  const { until } = req.body as z.infer<typeof snoozeNotificationSchema>;
  const userId = req.user!.id;

  const [notification] = await db()
    .update(notifications)
    .set({
      snoozedUntil: until,
    })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning();

  if (!notification) {
    throw new HttpError(404, 'Notification not found');
  }

  req.log.info({ notificationId: id, until }, 'notification snoozed');
  return notification;
});

export const handleRegisterClick = createRouteHandler(async (req: Request) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const [notification] = await db()
    .update(notifications)
    .set({
      clickedAt: new Date(),
      readAt: new Date(),
    })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning();

  if (!notification) {
    throw new HttpError(404, 'Notification not found');
  }

  req.log.info({ notificationId: id }, 'notification clicked');
  return notification;
});

export const handleCreateManualNotification = createAsyncHandler(
  async (req: Request, res: Response) => {
    const validated = req.body as z.infer<typeof createNotificationSchema>;

    const [newNotification] = await db().insert(notifications).values(validated).returning();

    req.log.info(
      { notificationId: newNotification.id, userId: validated.userId },
      'notification created'
    );
    return res.status(201).json({ success: true, data: newNotification, requestId: req.requestId });
  }
);

