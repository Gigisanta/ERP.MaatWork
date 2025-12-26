import { type Request, type Response } from 'express';
import { db, notificationTemplates } from '@maatwork/db';
import { eq, desc } from 'drizzle-orm';
import { createRouteHandler, createAsyncHandler } from '../../../utils/route-handler';
import { z } from 'zod';
import { createTemplateSchema } from '../schemas';

export const handleListTemplates = createRouteHandler(async (req: Request) => {
  const templates = await db()
    .select()
    .from(notificationTemplates)
    .where(eq(notificationTemplates.isActive, true))
    .orderBy(desc(notificationTemplates.createdAt));

  return templates;
});

export const handleCreateTemplate = createAsyncHandler(async (req: Request, res: Response) => {
  const validated = req.body as z.infer<typeof createTemplateSchema>;
  const userId = req.user!.id;

  const existing = await db()
    .select()
    .from(notificationTemplates)
    .where(eq(notificationTemplates.code, validated.code))
    .orderBy(desc(notificationTemplates.version))
    .limit(1);

  const newVersion = existing.length > 0 ? existing[0].version + 1 : 1;

  const [newTemplate] = await db()
    .insert(notificationTemplates)
    .values({
      ...validated,
      version: newVersion,
      createdByUserId: userId,
    })
    .returning();

  req.log.info(
    { templateId: newTemplate.id, code: validated.code, version: newVersion },
    'notification template created'
  );
  return res.status(201).json({ success: true, data: newTemplate, requestId: req.requestId });
});

