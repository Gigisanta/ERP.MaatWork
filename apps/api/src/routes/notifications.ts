import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, notifications, notificationTemplates, userChannelPreferences } from '@cactus/db';
import { eq, desc, and, isNull, sql, lte, or, count } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth/middlewares';
import { z } from 'zod';

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
  defaultChannel: z.enum(['in_app', 'email', 'push', 'whatsapp']).default('in_app')
});

const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.string(),
  templateId: z.string().uuid().optional().nullable(),
  severity: z.enum(['info', 'warning', 'critical']),
  contactId: z.string().uuid().optional().nullable(),
  taskId: z.string().uuid().optional().nullable(),
  payload: z.record(z.any()),
  renderedSubject: z.string().optional().nullable(),
  renderedBody: z.string().min(1)
});

const updatePreferencesSchema = z.object({
  channel: z.enum(['email', 'whatsapp', 'push']),
  enabled: z.boolean(),
  address: z.record(z.any()).optional()
});

// ==========================================================
// GET /notifications - Listar notificaciones del usuario
// ==========================================================
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { 
      limit = '50',
      offset = '0',
      unreadOnly = 'false',
      severity
    } = req.query;

    const conditions = [eq(notifications.userId, userId)];

    if (unreadOnly === 'true') {
      conditions.push(isNull(notifications.readAt));
    }
    if (severity) {
      conditions.push(eq(notifications.severity, severity as string));
    }

    // Filtrar notificaciones snoozed
    conditions.push(
      or(
        isNull(notifications.snoozedUntil),
        lte(notifications.snoozedUntil, new Date())
      )!
    );

    const items = await db()
      .select()
      .from(notifications)
      .where(and(...conditions))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string))
      .orderBy(desc(notifications.createdAt));

    res.json({
      data: items,
      meta: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (err) {
    req.log.error({ err }, 'failed to list notifications');
    next(err);
  }
});

// ==========================================================
// GET /notifications/unread/count - Contador de no leídas
// ==========================================================
router.get('/unread/count', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const [{ count: unreadCount }] = await db()
      .select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
        or(
          isNull(notifications.snoozedUntil),
          lte(notifications.snoozedUntil, new Date())
        )!
      ));

    res.json({ data: { count: Number(unreadCount) } });
  } catch (err) {
    req.log.error({ err }, 'failed to count unread notifications');
    next(err);
  }
});

// ==========================================================
// POST /notifications/:id/read - Marcar como leída
// ==========================================================
router.post('/:id/read', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const [notification] = await db()
      .update(notifications)
      .set({
        readAt: new Date()
      })
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, userId)
      ))
      .returning();

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    req.log.info({ notificationId: id }, 'notification marked as read');
    res.json({ data: notification });
  } catch (err) {
    req.log.error({ err, notificationId: req.params.id }, 'failed to mark notification as read');
    next(err);
  }
});

// ==========================================================
// POST /notifications/read-all - Marcar todas como leídas
// ==========================================================
router.post('/read-all', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const updated = await db()
      .update(notifications)
      .set({
        readAt: new Date()
      })
      .where(and(
        eq(notifications.userId, userId),
        isNull(notifications.readAt)
      ))
      .returning();

    req.log.info({ count: updated.length }, 'all notifications marked as read');
    res.json({ data: { marked: updated.length } });
  } catch (err) {
    req.log.error({ err }, 'failed to mark all notifications as read');
    next(err);
  }
});

// ==========================================================
// POST /notifications/:id/snooze - Posponer notificación
// ==========================================================
router.post('/:id/snooze', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { until } = z.object({
      until: z.string() // ISO datetime
    }).parse(req.body);
    const userId = req.user!.id;

    const [notification] = await db()
      .update(notifications)
      .set({
        snoozedUntil: until
      })
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, userId)
      ))
      .returning();

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    req.log.info({ notificationId: id, until }, 'notification snoozed');
    res.json({ data: notification });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    req.log.error({ err, notificationId: req.params.id }, 'failed to snooze notification');
    next(err);
  }
});

// ==========================================================
// POST /notifications/:id/click - Registrar click
// ==========================================================
router.post('/:id/click', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const [notification] = await db()
      .update(notifications)
      .set({
        clickedAt: new Date(),
        readAt: new Date() // Marcar como leída también
      })
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, userId)
      ))
      .returning();

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    req.log.info({ notificationId: id }, 'notification clicked');
    res.json({ data: notification });
  } catch (err) {
    req.log.error({ err, notificationId: req.params.id }, 'failed to register notification click');
    next(err);
  }
});

// ==========================================================
// GET /notifications/preferences - Obtener preferencias
// ==========================================================
router.get('/preferences', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const prefs = await db()
      .select()
      .from(userChannelPreferences)
      .where(eq(userChannelPreferences.userId, userId));

    res.json({ data: prefs });
  } catch (err) {
    req.log.error({ err }, 'failed to get notification preferences');
    next(err);
  }
});

// ==========================================================
// PUT /notifications/preferences - Actualizar preferencias
// ==========================================================
router.put('/preferences', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const validated = updatePreferencesSchema.parse(req.body);

    // Upsert preference
    const [pref] = await db()
      .insert(userChannelPreferences)
      .values({
        userId,
        channel: validated.channel,
        enabled: validated.enabled,
        address: validated.address || null
      })
      .onConflictDoUpdate({
        target: [userChannelPreferences.userId, userChannelPreferences.channel],
        set: {
          enabled: validated.enabled,
          address: validated.address || null
        }
      })
      .returning();

    req.log.info({ channel: validated.channel, enabled: validated.enabled }, 'notification preferences updated');
    res.json({ data: pref });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    req.log.error({ err }, 'failed to update notification preferences');
    next(err);
  }
});

// ==========================================================
// GET /notifications/templates - Listar plantillas
// ==========================================================
router.get('/templates', requireAuth, requireRole(['manager', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await db()
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.isActive, true))
      .orderBy(desc(notificationTemplates.createdAt));

    res.json({ data: templates });
  } catch (err) {
    req.log.error({ err }, 'failed to list notification templates');
    next(err);
  }
});

// ==========================================================
// POST /notifications/templates - Crear plantilla
// ==========================================================
router.post('/templates', requireAuth, requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createTemplateSchema.parse(req.body);
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
        createdByUserId: userId
      })
      .returning();

    req.log.info({ templateId: newTemplate.id, code: validated.code, version: newVersion }, 'notification template created');
    res.status(201).json({ data: newTemplate });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    req.log.error({ err }, 'failed to create notification template');
    next(err);
  }
});

// ==========================================================
// POST /notifications - Crear notificación manual
// ==========================================================
router.post('/', requireAuth, requireRole(['manager', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createNotificationSchema.parse(req.body);

    const [newNotification] = await db()
      .insert(notifications)
      .values(validated)
      .returning();

    req.log.info({ notificationId: newNotification.id, userId: validated.userId }, 'notification created');
    res.status(201).json({ data: newNotification });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    req.log.error({ err }, 'failed to create notification');
    next(err);
  }
});

// ==========================================================
// GET /notifications/metrics - Métricas de notificaciones
// ==========================================================
router.get('/metrics', requireAuth, requireRole(['manager', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
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
      .where(and(
        isNull(notifications.readAt),
        ...(conditions.length > 0 ? conditions : [])
      ));

    // Total con click
    const [{ count: totalClicked }] = await db()
      .select({ count: count() })
      .from(notifications)
      .where(and(
        isNull(notifications.clickedAt),
        ...(conditions.length > 0 ? conditions : [])
      ));

    const readRate = Number(totalSent) > 0 
      ? ((Number(totalRead) / Number(totalSent)) * 100).toFixed(2)
      : '0.00';

    const ctr = Number(totalSent) > 0 
      ? ((Number(totalClicked) / Number(totalSent)) * 100).toFixed(2)
      : '0.00';

    res.json({
      data: {
        totalSent: Number(totalSent),
        totalRead: Number(totalRead),
        totalClicked: Number(totalClicked),
        readRate: parseFloat(readRate),
        clickThroughRate: parseFloat(ctr),
        periodFrom: fromDate || null,
        periodTo: toDate || null
      }
    });
  } catch (err) {
    req.log.error({ err }, 'failed to get notification metrics');
    next(err);
  }
});

export default router;

