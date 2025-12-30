import { Router } from 'express';
import { requireAuth, requireRole } from '../../auth/middlewares';
import { validate } from '../../utils/validation';
import { idParamSchema } from '../../utils/validation/common-schemas';
import {
  createTemplateSchema,
  createNotificationSchema,
  updatePreferencesSchema,
  snoozeNotificationSchema,
} from './schemas';
import { handleListNotifications, handleGetUnreadCount } from './handlers/list';
import {
  handleMarkAsRead,
  handleMarkAllAsRead,
  handleSnoozeNotification,
  handleRegisterClick,
  handleCreateManualNotification,
} from './handlers/crud';
import { handleGetPreferences, handleUpdatePreferences } from './handlers/preferences';
import { handleListTemplates, handleCreateTemplate } from './handlers/templates';
import { handleGetNotificationMetrics } from './handlers/metrics';

const router = Router();

// ==========================================================
// Notifications CRUD & Actions
// ==========================================================

router.get('/', requireAuth, handleListNotifications);
router.get('/unread/count', requireAuth, handleGetUnreadCount);
router.post('/read-all', requireAuth, handleMarkAllAsRead);

router.post('/:id/read', requireAuth, validate({ params: idParamSchema }), handleMarkAsRead);

router.post(
  '/:id/snooze',
  requireAuth,
  validate({ params: idParamSchema, body: snoozeNotificationSchema }),
  handleSnoozeNotification
);

router.post('/:id/click', requireAuth, validate({ params: idParamSchema }), handleRegisterClick);

router.post(
  '/',
  requireAuth,
  requireRole(['manager', 'admin']),
  validate({ body: createNotificationSchema }),
  handleCreateManualNotification
);

// ==========================================================
// Preferences
// ==========================================================

router.get('/preferences', requireAuth, handleGetPreferences);
router.put(
  '/preferences',
  requireAuth,
  validate({ body: updatePreferencesSchema }),
  handleUpdatePreferences
);

// ==========================================================
// Templates
// ==========================================================

router.get('/templates', requireAuth, requireRole(['manager', 'admin']), handleListTemplates);
router.post(
  '/templates',
  requireAuth,
  requireRole(['admin']),
  validate({ body: createTemplateSchema }),
  handleCreateTemplate
);

// ==========================================================
// Metrics
// ==========================================================

router.get(
  '/metrics',
  requireAuth,
  requireRole(['manager', 'admin']),
  handleGetNotificationMetrics
);

export default router;
