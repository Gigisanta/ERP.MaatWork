/**
 * Team Calendar Handlers
 *
 * Handlers para gestión del calendario de equipo.
 * Solo managers pueden conectar calendarios, todos los miembros pueden ver eventos.
 */

import type { Request } from 'express';
import { createRouteHandler, HttpError } from '../../../utils/route-handler';
import {
  db,
  teams,
  googleOAuthTokens,
  contacts,
  notifications,
  lookupNotificationType,
  users,
} from '@maatwork/db';
import { eq, or } from 'drizzle-orm';
import { decryptToken } from '../../../utils/encryption';
import { env } from '../../../config/env';
import { getCalendarEvents } from '../../../services/google-calendar';
import { refreshGoogleToken } from '../../../jobs/google-token-refresh';
import { z } from 'zod';
import { getEventsQuerySchema, connectTeamCalendarSchema, assignEventSchema } from '../schemas';
import { checkTeamAccess } from '../../teams/handlers/utils';
import { contactsListCacheUtil, calendarEventsCacheUtil, normalizeCacheKey } from '../../../utils/performance/cache';
import { invalidateCache } from '../../../middleware/cache';

/**
 * GET /calendar/team/:teamId/events
 * Obtener eventos del calendario de equipo (solo lectura para miembros)
 */
export const getTeamEvents = createRouteHandler(async (req: Request) => {
  const teamId = req.params.teamId;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  const { calendarType, timeMin, timeMax, maxResults } = req.query as unknown as z.infer<
    typeof getEventsQuerySchema
  >;

  // Try cache first
  const cacheKey = normalizeCacheKey('team_calendar', teamId, calendarType, timeMin, timeMax, maxResults);
  const cachedEvents = calendarEventsCacheUtil.get(cacheKey);
  if (cachedEvents) {
    req.log.debug({ teamId, cacheKey }, 'Team calendar events cache hit');
    return cachedEvents;
  }

  // Verificar acceso al equipo
  const access = await checkTeamAccess(userId, userRole, teamId);
  if (!access.hasAccess) {
    throw new HttpError(403, 'Access denied. You do not have access to this team.');
  }

  // Obtener equipo y verificar que tenga calendario conectado
  const [team] = await db().select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team) {
    throw new HttpError(404, 'Team not found');
  }

  const targetCalendarId =
    calendarType === 'meetingRoom' ? team.meetingRoomCalendarId : team.calendarId;

  if (!targetCalendarId) {
    // If specific type requested but not connected, return 404
    throw new HttpError(
      404,
      `Team ${calendarType === 'meetingRoom' ? 'meeting room' : 'primary'} calendar not connected`
    );
  }

  // Obtener tokens del manager que conectó el calendario
  if (!team.calendarConnectedByUserId) {
    throw new HttpError(500, 'Team calendar connection information missing');
  }

  const [managerToken] = await db()
    .select()
    .from(googleOAuthTokens)
    .where(eq(googleOAuthTokens.userId, team.calendarConnectedByUserId))
    .limit(1);

  if (!managerToken) {
    throw new HttpError(404, 'Manager Google account not connected');
  }

  // Function to get events with token refresh logic
  const fetchEvents = async (tokenData: typeof managerToken) => {
    let accessToken = decryptToken(tokenData.accessTokenEncrypted, env.GOOGLE_ENCRYPTION_KEY);

    // Check expiry
    if (tokenData.expiresAt < new Date()) {
      await refreshGoogleToken(tokenData.id);
      const [updated] = await db()
        .select()
        .from(googleOAuthTokens)
        .where(eq(googleOAuthTokens.id, tokenData.id))
        .limit(1);
      if (updated) {
        accessToken = decryptToken(updated.accessTokenEncrypted, env.GOOGLE_ENCRYPTION_KEY);
      } else {
        throw new HttpError(500, 'Failed to refresh token');
      }
    }

    return await getCalendarEvents(
      accessToken,
      targetCalendarId,
      timeMin ? new Date(timeMin) : undefined,
      timeMax ? new Date(timeMax) : undefined,
      maxResults
    );
  };

  const events = await fetchEvents(managerToken);
  
  // Set cache
  calendarEventsCacheUtil.set(cacheKey, events);
  
  return events;
});

/**
 * POST /calendar/team/:teamId/connect
 * Conectar calendario de Google al equipo (solo managers)
 */
export const connectTeamCalendar = createRouteHandler(async (req: Request) => {
  const teamId = req.params.teamId;
  const userId = req.user!.id;
  const { calendarId, calendarType } = req.body as z.infer<typeof connectTeamCalendarSchema>;

  // Verificar que el usuario es manager del equipo
  const access = await checkTeamAccess(userId, req.user!.role, teamId);
  const isManager =
    access.isManager || access.userTeams.some((t) => t.id === teamId && t.role === 'manager');

  if (!isManager && req.user!.role !== 'admin') {
    throw new HttpError(403, 'Only team managers can connect team calendar');
  }

  // Verificar que el usuario tiene Google conectado
  const [userToken] = await db()
    .select()
    .from(googleOAuthTokens)
    .where(eq(googleOAuthTokens.userId, userId))
    .limit(1);

  if (!userToken) {
    throw new HttpError(400, 'Please connect your Google account first');
  }

  // Verificar que el equipo existe
  const [team] = await db().select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team) {
    throw new HttpError(404, 'Team not found');
  }

  // Actualizar equipo con calendarId
  const updateData: Partial<typeof teams.$inferInsert> = {
    calendarConnectedAt: new Date(),
    calendarConnectedByUserId: userId,
  };

  if (calendarType === 'meetingRoom') {
    updateData.meetingRoomCalendarId = calendarId;
  } else {
    updateData.calendarId = calendarId;
  }

  await db().update(teams).set(updateData).where(eq(teams.id, teamId));

  req.log?.info({ userId, teamId, calendarId, calendarType }, 'Team calendar connected');

  return { success: true, calendarId, calendarType };
});

/**
 * DELETE /calendar/team/:teamId/connect
 * Desconectar calendario de equipo (solo managers)
 */
export const disconnectTeamCalendar = createRouteHandler(async (req: Request) => {
  const teamId = req.params.teamId;
  const userId = req.user!.id;

  // We accept calendarType in query or body? Typically DELETE doesn't have body.
  // Using query param for DELETE is cleaner.
  const calendarType = req.query.calendarType as string | undefined;

  // Verificar que el usuario es manager del equipo
  const access = await checkTeamAccess(userId, req.user!.role, teamId);
  const isManager =
    access.isManager || access.userTeams.some((t) => t.id === teamId && t.role === 'manager');

  if (!isManager && req.user!.role !== 'admin') {
    throw new HttpError(403, 'Only team managers can disconnect team calendar');
  }

  // Actualizar equipo removiendo calendarId
  const updateData: Partial<typeof teams.$inferInsert> = {};

  // If calendarType is not provided, we might disconnect primary? Or strict?
  // Let's default to primary if not specified, but better to be explicit.
  if (calendarType === 'meetingRoom') {
    updateData.meetingRoomCalendarId = null;
  } else {
    updateData.calendarId = null;
  }

  // Only clear metadata if BOTH are disconnected?
  // Simplified: we leave metadata. It just shows who LAST connected ANY calendar.

  await db().update(teams).set(updateData).where(eq(teams.id, teamId));

  req.log?.info({ userId, teamId, calendarType }, 'Team calendar disconnected');

  return { success: true };
});

/**
 * POST /calendar/team/:teamId/events/assign
 * Asignar reunión a un miembro del equipo
 */
export const assignEventToMember = createRouteHandler(async (req: Request) => {
  const teamId = req.params.teamId;
  const userId = req.user!.id;
  const { targetUserId, eventSummary, eventDescription, attendees, clientEmail, clientName } =
    req.body as z.infer<typeof assignEventSchema>;

  // 1. Verify access (Manager/Admin only)
  const access = await checkTeamAccess(userId, req.user!.role, teamId);
  const isManager =
    access.isManager || access.userTeams.some((t) => t.id === teamId && t.role === 'manager');

  if (!isManager && req.user!.role !== 'admin') {
    throw new HttpError(403, 'Only team managers can assign events');
  }

  // 2. Identify Client Email
  // If clientEmail is not explicitly provided, try to find it in attendees
  let targetEmail = clientEmail;
  let targetName = clientName;

  if (!targetEmail && attendees && attendees.length > 0) {
    // Filter out internal domains if possible, or just take the first one that is not the team manager?
    // For now, heuristic: simple filtering if we knew internal domain.
    // Without config, we take the first email that is likely the client.
    // Or we expect the frontend to have done some selection?
    // Let's take the first attendee for now if not specified.
    targetEmail = attendees[0];
  }

  if (!targetEmail) {
    // We can proceed without creating a contact if no email, but the requirement says "create contact automatically"
    // So if no email, we might just notify the advisor.
    // But let's assume we need at least an email to create a contact.
    // If no email, skip contact creation?
    req.log?.warn(
      { teamId, targetUserId },
      'No client email found for assignment, skipping contact creation'
    );
  }

  let contactId: string | null = null;

  // 3. Contact Management
  if (targetEmail) {
    // Check if contact exists
    const [existingContact] = await db()
      .select()
      .from(contacts)
      .where(eq(contacts.email, targetEmail))
      .limit(1);

    if (existingContact) {
      // Update assignment
      await db()
        .update(contacts)
        .set({
          assignedAdvisorId: targetUserId,
          assignedTeamId: teamId,
          contactLastTouchAt: new Date(), // Mark as touched
        })
        .where(eq(contacts.id, existingContact.id));

      contactId = existingContact.id;
    } else {
      // Create new contact
      const [newContact] = await db()
        .insert(contacts)
        .values({
          firstName: targetName || targetEmail.split('@')[0] || 'Unknown',
          lastName: '', // Optional/Unknown
          email: targetEmail,
          assignedAdvisorId: targetUserId,
          assignedTeamId: teamId,
          source: 'calendar_assignment',
          notes: `Creado automáticamente desde reunión: ${eventSummary}\n\n${eventDescription || ''}`,
          contactLastTouchAt: new Date(),
        })
        .returning();

      contactId = newContact.id;
    }

    // Invalidate caches
    contactsListCacheUtil.clear();
    await invalidateCache('crm:contacts:*');
  }

  // 4. Create Notification
  // Find 'meeting_assignment' type id, fallback to 'info'
  const [notifType] = await db()
    .select()
    .from(lookupNotificationType)
    .where(eq(lookupNotificationType.id, 'meeting_assignment'))
    .limit(1);

  const [infoType] = await db()
    .select()
    .from(lookupNotificationType)
    .where(eq(lookupNotificationType.id, 'info'))
    .limit(1);

  const typeId = notifType?.id || infoType?.id;

  if (typeId) {
    await db()
      .insert(notifications)
      .values({
        userId: targetUserId,
        type: typeId,
        severity: 'info',
        renderedBody: `Se te ha asignado una nueva reunión: ${eventSummary}`,
        contactId: contactId,
        processed: false,
        payload: {
          eventSummary,
          eventDescription,
          attendees,
          teamId,
        },
      });
  }

  req.log?.info({ teamId, targetUserId, contactId }, 'Event assigned to advisor');

  return { success: true, contactId };
});
