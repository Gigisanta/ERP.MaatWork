/**
 * Personal Calendar Handlers
 *
 * Handlers para gestión del calendario personal del usuario autenticado.
 * Requiere que el usuario tenga Google OAuth conectado.
 */

import type { Request } from 'express';
import { createRouteHandler, HttpError } from '../../../utils/route-handler';
import { db, googleOAuthTokens } from '@maatwork/db';
import { eq } from 'drizzle-orm';
import { decryptToken } from '../../../utils/encryption';
import { env } from '../../../config/env';
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  listCalendars,
} from '../../../services/google-calendar';
import { syncUserCalendar } from '../../../services/calendar-sync';
import { refreshGoogleToken } from '../../../jobs/google-token-refresh';
import { z } from 'zod';
import { getEventsQuerySchema, createEventSchema, updateEventSchema } from '../schemas';
import { calendarEventsCacheUtil, normalizeCacheKey } from '../../../utils/performance/cache';

/**
 * Helper para obtener tokens OAuth personales del usuario
 * Refresca automáticamente si están expirados
 *
 * AI_DECISION: Mejorar error handling con detección de reconexión requerida
 * Justificación: Diferentes errores requieren diferentes acciones del usuario
 * Impacto: Frontend puede mostrar mensajes específicos y acciones apropiadas
 */
async function getPersonalOAuthTokens(userId: string, req?: Request) {
  let tokenRecord;
  try {
    [tokenRecord] = await db()
      .select()
      .from(googleOAuthTokens)
      .where(eq(googleOAuthTokens.userId, userId))
      .limit(1);
  } catch (error) {
    // AI_DECISION: Manejar error de tabla faltante de manera amigable
    // Justificación: Si la tabla no existe (migración pendiente), retornar error claro en lugar de DatabaseError
    // Impacto: Evita loops infinitos y errores confusos en logs
    if (error instanceof Error && error.message.includes('does not exist')) {
      throw new HttpError(
        503,
        'Google Calendar integration is not available. Please contact support or try again later.'
      );
    }
    // Re-throw otros errores
    throw error;
  }

  if (!tokenRecord) {
    req?.log?.warn({ userId }, 'User attempted to access calendar without Google connection');
    throw new HttpError(
      401,
      'Google Calendar not connected. Please connect your Google account first.',
      { code: 'GOOGLE_NOT_CONNECTED' }
    );
  }

  // Verificar si el token expiró y refrescar si es necesario
  if (tokenRecord.expiresAt < new Date()) {
    req?.log?.info({ userId, tokenId: tokenRecord.id }, 'Access token expired, attempting refresh');

    try {
      await refreshGoogleToken(tokenRecord.id);
      const [updated] = await db()
        .select()
        .from(googleOAuthTokens)
        .where(eq(googleOAuthTokens.id, tokenRecord.id))
        .limit(1);

      if (updated) {
        req?.log?.info({ userId }, 'Token refreshed successfully');
        return {
          accessToken: decryptToken(updated.accessTokenEncrypted, env.GOOGLE_ENCRYPTION_KEY),
          calendarId: updated.calendarId || 'primary',
        };
      }
    } catch (refreshError) {
      req?.log?.error(
        { err: refreshError, userId, tokenId: tokenRecord.id },
        'Failed to refresh Google token'
      );

      // AI_DECISION: Detectar errores permanentes que requieren reconexión
      // Justificación: Usuario revocó permisos, refresh token inválido o clave de encriptación incorrecta
      // Impacto: Frontend muestra mensaje específico "Reconectar cuenta"
      const errorMessage =
        refreshError instanceof Error ? refreshError.message : String(refreshError);
      const isPermissionError =
        errorMessage.includes('invalid_grant') ||
        errorMessage.includes('Token has been expired or revoked') ||
        errorMessage.includes('unauthorized_client');

      // AI_DECISION: Detectar errores de clave de encriptación
      // Justificación: Si la clave de encriptación cambió, los tokens guardados son indescifrables
      // Impacto: Usuario recibe mensaje claro que debe reconectar en lugar de error 500
      const isEncryptionError = errorMessage.includes('encryption key mismatch');

      if (isPermissionError || isEncryptionError) {
        // Marcar token como inválido eliminándolo (usuario debe reconectar)
        await db().delete(googleOAuthTokens).where(eq(googleOAuthTokens.id, tokenRecord.id));

        req?.log?.warn(
          { userId, isEncryptionError },
          'Token marked as invalid, user must reconnect'
        );

        throw new HttpError(
          401,
          isEncryptionError
            ? 'Your Google connection is invalid due to a security key change. Please reconnect.'
            : 'Your Google Calendar connection has expired. Please reconnect your account.',
          { code: 'GOOGLE_RECONNECT_REQUIRED' }
        );
      }

      // Error temporal, re-throw para retry
      throw refreshError;
    }
  }

  return {
    accessToken: decryptToken(tokenRecord.accessTokenEncrypted, env.GOOGLE_ENCRYPTION_KEY),
    calendarId: tokenRecord.calendarId || 'primary',
  };
}

/**
 * GET /calendar/personal/events
 * Obtener eventos del calendario personal del usuario
 */
export const getPersonalEvents = createRouteHandler(async (req: Request) => {
  const { calendarId, timeMin, timeMax, maxResults } = req.query as unknown as z.infer<
    typeof getEventsQuerySchema
  >;
  const userId = req.user!.id;

  // Try cache first
  const cacheKey = normalizeCacheKey(
    'personal_calendar',
    userId,
    calendarId,
    timeMin,
    timeMax,
    maxResults
  );
  const cachedEvents = calendarEventsCacheUtil.get(cacheKey);
  if (cachedEvents) {
    req.log.debug({ userId, cacheKey }, 'Personal calendar events cache hit');
    return cachedEvents;
  }

  const { accessToken, calendarId: userCalendarId } = await getPersonalOAuthTokens(userId, req);

  const events = await getCalendarEvents(
    accessToken,
    calendarId || userCalendarId,
    timeMin ? new Date(timeMin) : undefined,
    timeMax ? new Date(timeMax) : undefined,
    maxResults
  );

  req.log.info(
    { userId, eventCount: events.length },
    'Personal calendar events fetched from Google'
  );

  // Set cache
  calendarEventsCacheUtil.set(cacheKey, events);

  // Async sync to keep DB up-to-date with meeting statuses
  // We don't await this to keep the response fast
  syncUserCalendar(userId, accessToken, calendarId || userCalendarId).catch((err) => {
    req.log.error({ userId, err }, 'Background calendar sync failed');
  });

  return events;
});

/**
 * GET /calendar/personal/calendars
 * Listar calendarios disponibles del usuario
 */
export const getPersonalCalendars = createRouteHandler(async (req: Request) => {
  const { accessToken } = await getPersonalOAuthTokens(req.user!.id, req);
  const calendars = await listCalendars(accessToken);
  req.log.info(
    { userId: req.user!.id, calendarCount: calendars.length },
    'Personal calendars listed'
  );
  return calendars;
});

/**
 * POST /calendar/personal/events
 * Crear un evento en el calendario personal
 */
export const createPersonalEvent = createRouteHandler(async (req: Request) => {
  const { accessToken, calendarId } = await getPersonalOAuthTokens(req.user!.id, req);
  const eventData = req.body as z.infer<typeof createEventSchema>;
  const { summary, start, end, description, attendees } = eventData;
  const event = await createCalendarEvent(accessToken, calendarId, {
    summary,
    start: start.dateTime
      ? { dateTime: start.dateTime, ...(start.timeZone ? { timeZone: start.timeZone } : {}) }
      : { date: start.date! },
    end: end.dateTime
      ? { dateTime: end.dateTime, ...(end.timeZone ? { timeZone: end.timeZone } : {}) }
      : { date: end.date! },
    ...(description ? { description } : {}),
    ...(attendees ? { attendees } : {}),
    // AI_DECISION: Create Google Meet link by default for all new events
    // Justificación: Requisito del usuario para simplificar la creación de reuniones
    // Impacto: Todos los eventos nuevos tendrán un link de Meet generado automáticamente
    conferenceData: {
      createRequest: {
        requestId: `meet-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  });

  // Invalidate cache
  calendarEventsCacheUtil.clear();

  req.log.info(
    { userId: req.user!.id, eventId: event.id, summary },
    'Personal calendar event created'
  );
  return event;
});

/**
 * PATCH /calendar/personal/events/:eventId
 * Actualizar un evento existente
 */
export const updatePersonalEvent = createRouteHandler(async (req: Request) => {
  const { eventId } = req.params;
  const { accessToken, calendarId } = await getPersonalOAuthTokens(req.user!.id, req);
  const eventData = req.body as z.infer<typeof updateEventSchema>;

  // Construct update body strictly omitting undefined values
  interface CalendarEventUpdate {
    summary?: string;
    description?: string | null;
    location?: string | null;
    attendees?: { email: string }[];
    start?: { dateTime: string; timeZone?: string } | { date: string };
    end?: { dateTime: string; timeZone?: string } | { date: string };
  }
  const updateBody: CalendarEventUpdate = {};
  if (eventData.summary !== undefined) updateBody.summary = eventData.summary;
  if (eventData.description !== undefined) updateBody.description = eventData.description;
  if (eventData.location !== undefined) updateBody.location = eventData.location;
  if (eventData.attendees !== undefined) updateBody.attendees = eventData.attendees;

  if (eventData.start) {
    updateBody.start = eventData.start.dateTime
      ? {
          dateTime: eventData.start.dateTime,
          ...(eventData.start.timeZone ? { timeZone: eventData.start.timeZone } : {}),
        }
      : { date: eventData.start.date! };
  }

  if (eventData.end) {
    updateBody.end = eventData.end.dateTime
      ? {
          dateTime: eventData.end.dateTime,
          ...(eventData.end.timeZone ? { timeZone: eventData.end.timeZone } : {}),
        }
      : { date: eventData.end.date! };
  }

  const event = await updateCalendarEvent(accessToken, calendarId, eventId, updateBody);

  // Invalidate cache
  calendarEventsCacheUtil.clear();

  req.log.info({ userId: req.user!.id, eventId }, 'Personal calendar event updated');
  return event;
});

/**
 * DELETE /calendar/personal/events/:eventId
 * Eliminar un evento
 */
export const deletePersonalEvent = createRouteHandler(async (req: Request) => {
  const { eventId } = req.params;
  const { accessToken, calendarId } = await getPersonalOAuthTokens(req.user!.id, req);
  await deleteCalendarEvent(accessToken, calendarId, eventId);

  // Invalidate cache
  calendarEventsCacheUtil.clear();

  req.log.info({ userId: req.user!.id, eventId }, 'Personal calendar event deleted');
  return { success: true };
});
