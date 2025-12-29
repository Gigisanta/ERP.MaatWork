import { type Request } from 'express';
import { db, notifications } from '@maatwork/db';
import { and, isNull, sql, count } from 'drizzle-orm';
import { createRouteHandler } from '../../../utils/route-handler';

export const handleGetNotificationMetrics = createRouteHandler(async (req: Request) => {
  const { fromDate, toDate } = req.query;

  const conditions = [];
  if (fromDate) {
    conditions.push(sql`${notifications.createdAt} >= ${fromDate}`);
  }
  if (toDate) {
    conditions.push(sql`${notifications.createdAt} <= ${toDate}`);
  }

  const [{ count: totalSent }] = await db()
    .select({ count: count() })
    .from(notifications)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const [{ count: totalRead }] = await db()
    .select({ count: count() })
    .from(notifications)
    .where(and(isNull(notifications.readAt), ...(conditions.length > 0 ? conditions : [])));

  const [{ count: totalClicked }] = await db()
    .select({ count: count() })
    .from(notifications)
    .where(and(isNull(notifications.clickedAt), ...(conditions.length > 0 ? conditions : [])));

  const readRate =
    Number(totalSent) > 0 ? ((Number(totalRead) / Number(totalSent)) * 100).toFixed(2) : '0.00';

  const ctr =
    Number(totalSent) > 0 ? ((Number(totalClicked) / Number(totalSent)) * 100).toFixed(2) : '0.00';

  return {
    totalSent: Number(totalSent),
    totalRead: Number(totalRead),
    totalClicked: Number(totalClicked),
    readRate: parseFloat(readRate),
    clickThroughRate: parseFloat(ctr),
    periodFrom: fromDate || null,
    periodTo: toDate || null,
  };
});

