import { Router, type Request, type Response } from 'express';
import { db, notifications, notificationTemplates, userChannelPreferences } from '@cactus/db';
import { eq, desc, and, isNull, sql, lte, or, count } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth/middlewares';
import { validate } from '../utils/validation';
import { z } from 'zod';
import { createRouteHandler, createAsyncHandler, HttpError } from '../utils/route-handler';
import { idParamSchema, uuidSchema } from '../utils/validation/common-schemas';

const router = Router();

// ==========================================================
// Schemas de validación
// ==========================================================

const createTemplateSchema = z.object({
  code: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  subjectTemplate: z.string().optional().nullable(),
  bodyTemplate: z.string().min(1),
  pushTemplate: z.string().optional().nullable(),
  variables: z.array(z.string()),
  defaultChannel: z.enum(['in_app', 'email', 'push', 'whatsapp']).default('in_app'),
});

const createNotificationSchema = z.object({
  userId: uuidSchema,
  type: z.string(),
  templateId: uuidSchema.optional().nullable(),
  severity: z.enum(['info', 'warning', 'critical']),
  contactId: uuidSchema.optional().nullable(),
  taskId: uuidSchema.optional().nullable(),
  payload: z.record(z.unknown()),
  renderedSubject: z.string().optional().nullable(),
  renderedBody: z.string().min(1),
});

const updatePreferencesSchema = z.object({
  channel: z.enum(['email', 'whatsapp', 'push']),
  enabled: z.boolean(),
  address: z.record(z.unknown()).optional(),
});

const snoozeNotificationSchema = z.object({
  until: z.string(), // ISO datetime
});

// ==========================================================
// GET /notifications - Listar notificaciones del usuario
// ==========================================================
router.get(
  '/',
  requireAuth,
  createRouteHandler(async (req: Request) => {
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
  })
);

// ==========================================================
// GET /notifications/unread/count - Contador de no leídas
// ==========================================================
router.get(
  '/unread/count',
  requireAuth,
  createRouteHandler(async (req: Request) => {
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
  })
);

// ==========================================================
// POST /notifications/:id/read - Marcar como leída
// ==========================================================
router.post(
  '/:id/read',
  requireAuth,
  validate({ params: idParamSchema }),
  createRouteHandler(async (req: Request) => {
    const { id } = req.params; // Already validated by middleware
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
  })
);

// ==========================================================
// POST /notifications/read-all - Marcar todas como leídas
// ==========================================================
router.post(
  '/read-all',
  requireAuth,
  createRouteHandler(async (req: Request) => {
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
  })
);

// ==========================================================
// POST /notifications/:id/snooze - Posponer notificación
// ==========================================================
router.post(
  '/:id/snooze',
  requireAuth,
  validate({ params: idParamSchema, body: snoozeNotificationSchema }),
  createRouteHandler(async (req: Request) => {
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
  })
);

// ==========================================================
// POST /notifications/:id/click - Registrar click
// ==========================================================
router.post(
  '/:id/click',
  requireAuth,
  validate({ params: idParamSchema }),
  createRouteHandler(async (req: Request) => {
    const { id } = req.params; // Already validated by middleware
    const userId = req.user!.id;

    const [notification] = await db()
      .update(notifications)
      .set({
        clickedAt: new Date(),
        readAt: new Date(), // Marcar como leída también
      })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();

    if (!notification) {
      throw new HttpError(404, 'Notification not found');
    }

    req.log.info({ notificationId: id }, 'notification clicked');
    return notification;
  })
);

// ==========================================================
// GET /notifications/preferences - Obtener preferencias
// ==========================================================
router.get(
  '/preferences',
  requireAuth,
  createRouteHandler(async (req: Request) => {
    const userId = req.user!.id;

    const prefs = await db()
      .select()
      .from(userChannelPreferences)
      .where(eq(userChannelPreferences.userId, userId));

    return prefs;
  })
);

// ==========================================================
// PUT /notifications/preferences - Actualizar preferencias
// ==========================================================
router.put(
  '/preferences',
  requireAuth,
  validate({ body: updatePreferencesSchema }),
  createRouteHandler(async (req: Request) => {
    const userId = req.user!.id;
    // req.body ya está validado por el middleware validate()
    const validated = req.body as z.infer<typeof updatePreferencesSchema>;

    // Upsert preference
    const [pref] = await db()
      .insert(userChannelPreferences)
      .values({
        userId,
        channel: validated.channel,
        enabled: validated.enabled,
        address: validated.address || null,
      })
      .onConflictDoUpdate({
        target: [userChannelPreferences.userId, userChannelPreferences.channel],
        set: {
          enabled: validated.enabled,
          address: validated.address || null,
        },
      })
      .returning();

    req.log.info(
      { channel: validated.channel, enabled: validated.enabled },
      'notification preferences updated'
    );
    return pref;
  })
);

// ==========================================================
// GET /notifications/templates - Listar plantillas
// ==========================================================
router.get(
  '/templates',
  requireAuth,
  requireRole(['manager', 'admin']),
  createRouteHandler(async (req: Request) => {
    const templates = await db()
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.isActive, true))
      .orderBy(desc(notificationTemplates.createdAt));

    return templates;
  })
);

// ==========================================================
// POST /notifications/templates - Crear plantilla
// ==========================================================
router.post(
  '/templates',
  requireAuth,
  requireRole(['admin']),
  validate({ body: createTemplateSchema }),
  createAsyncHandler(async (req: Request, res: Response) => {
    // req.body ya está validado por el middleware validate()
    const validated = req.body as z.infer<typeof createTemplateSchema>;
    const userId = req.user!.id;

    // Verificar si ya existe template con ese código
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
  })
);

// ==========================================================
// POST /notifications - Crear notificación manual
// ==========================================================
router.post(
  '/',
  requireAuth,
  requireRole(['manager', 'admin']),
  validate({ body: createNotificationSchema }),
  createAsyncHandler(async (req: Request, res: Response) => {
    // req.body ya está validado por el middleware validate()
    const validated = req.body as z.infer<typeof createNotificationSchema>;

    const [newNotification] = await db().insert(notifications).values(validated).returning();

    req.log.info(
      { notificationId: newNotification.id, userId: validated.userId },
      'notification created'
    );
    return res.status(201).json({ success: true, data: newNotification, requestId: req.requestId });
  })
);

// ==========================================================
// GET /notifications/metrics - Métricas de notificaciones
// ==========================================================
router.get(
  '/metrics',
  requireAuth,
  requireRole(['manager', 'admin']),
  createRouteHandler(async (req: Request) => {
    const { fromDate, toDate } = req.query;

    const conditions = [];
    if (fromDate) {
      conditions.push(sql`${notifications.createdAt} >= ${fromDate}`);
    }
    if (toDate) {
      conditions.push(sql`${notifications.createdAt} <= ${toDate}`);
    }

    // Total enviadas
    const [{ count: totalSent }] = await db()
      .select({ count: count() })
      .from(notifications)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Total leídas
    const [{ count: totalRead }] = await db()
      .select({ count: count() })
      .from(notifications)
      .where(and(isNull(notifications.readAt), ...(conditions.length > 0 ? conditions : [])));

    // Total con click
    const [{ count: totalClicked }] = await db()
      .select({ count: count() })
      .from(notifications)
      .where(and(isNull(notifications.clickedAt), ...(conditions.length > 0 ? conditions : [])));

    const readRate =
      Number(totalSent) > 0 ? ((Number(totalRead) / Number(totalSent)) * 100).toFixed(2) : '0.00';

    const ctr =
      Number(totalSent) > 0
        ? ((Number(totalClicked) / Number(totalSent)) * 100).toFixed(2)
        : '0.00';

    return {
      totalSent: Number(totalSent),
      totalRead: Number(totalRead),
      totalClicked: Number(totalClicked),
      readRate: parseFloat(readRate),
      clickThroughRate: parseFloat(ctr),
      periodFrom: fromDate || null,
      periodTo: toDate || null,
    };
  })
);

export default router;
