/**
 * Calendar Routes - Module Index
 *
 * Combines all calendar-related routes into a single router.
 *
 * Routes:
 * - Personal Calendar:
 *   - GET /calendar/personal/events - List events
 *   - GET /calendar/personal/calendars - List available calendars
 *   - POST /calendar/personal/events - Create event
 *   - PATCH /calendar/personal/events/:eventId - Update event
 *   - DELETE /calendar/personal/events/:eventId - Delete event
 * - Team Calendar:
 *   - GET /calendar/team/:teamId/events - List team events
 *   - POST /calendar/team/:teamId/connect - Connect team calendar (managers only)
 *   - DELETE /calendar/team/:teamId/connect - Disconnect team calendar (managers only)
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../auth/middlewares';
import { validate } from '../../utils/validation';
import { idParamSchema } from '../../utils/validation/common-schemas';
import * as personalHandlers from './handlers/personal';
import * as teamHandlers from './handlers/team';
import {
  getEventsQuerySchema,
  createEventSchema,
  updateEventSchema,
  connectTeamCalendarSchema,
  teamCalendarParamsSchema,
  assignEventSchema,
} from './schemas';

const router = Router();

// ==========================================================
// Personal Calendar Routes
// ==========================================================

router.get(
  '/personal/events',
  requireAuth,
  validate({ query: getEventsQuerySchema }),
  personalHandlers.getPersonalEvents
);

router.get('/personal/calendars', requireAuth, personalHandlers.getPersonalCalendars);

router.post(
  '/personal/events',
  requireAuth,
  validate({ body: createEventSchema }),
  personalHandlers.createPersonalEvent
);

router.patch(
  '/personal/events/:eventId',
  requireAuth,
  validate({ params: z.object({ eventId: z.string() }) }),
  validate({ body: updateEventSchema }),
  personalHandlers.updatePersonalEvent
);

router.delete(
  '/personal/events/:eventId',
  requireAuth,
  validate({ params: z.object({ eventId: z.string() }) }),
  personalHandlers.deletePersonalEvent
);

// ==========================================================
// Team Calendar Routes
// ==========================================================

router.get(
  '/team/:teamId/events',
  requireAuth,
  validate({ params: teamCalendarParamsSchema }),
  validate({ query: getEventsQuerySchema }),
  teamHandlers.getTeamEvents
);

router.post(
  '/team/:teamId/events/assign',
  requireAuth,
  validate({ params: teamCalendarParamsSchema }),
  validate({ body: assignEventSchema }),
  teamHandlers.assignEventToMember
);

router.post(
  '/team/:teamId/connect',
  requireAuth,
  validate({ params: teamCalendarParamsSchema }),
  validate({ body: connectTeamCalendarSchema }),
  teamHandlers.connectTeamCalendar
);

router.delete(
  '/team/:teamId/connect',
  requireAuth,
  validate({ params: teamCalendarParamsSchema }),
  teamHandlers.disconnectTeamCalendar
);

export default router;
