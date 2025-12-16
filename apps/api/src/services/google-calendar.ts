/**
 * Google Calendar API Service
 *
 * AI_DECISION: Servicio centralizado para operaciones de Google Calendar API
 * Justificación: Encapsula lógica de Calendar API, facilita testing y reutilización
 * Impacto: Código más limpio y mantenible en handlers
 *
 * AI_DECISION: Agregar timeouts para prevenir hanging requests
 * Justificación: Google API puede ser lento o colgar, necesitamos timeouts
 * Impacto: Mejor robustez, previene requests infinitos
 */

import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';

// AI_DECISION: Timeout de 10 segundos para requests a Google API
// Justificación: Balance entre dar tiempo suficiente y no colgar indefinidamente
// Impacto: Requests que toman >10s fallan con timeout error
const GOOGLE_API_TIMEOUT_MS = 10000;

/**
 * Crea cliente de Calendar API autenticado con access token
 *
 * @param accessToken - Access token de Google OAuth2
 * @returns Cliente de Calendar API v3
 */
export function createCalendarClient(accessToken: string): calendar_v3.Calendar {
  const oauth2Client = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({ access_token: accessToken });
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Obtiene eventos del calendario con timeout
 *
 * @param accessToken - Access token de Google OAuth2
 * @param calendarId - ID del calendario (default: 'primary')
 * @param timeMin - Fecha/hora mínima para filtrar eventos (opcional)
 * @param timeMax - Fecha/hora máxima para filtrar eventos (opcional)
 * @param maxResults - Número máximo de resultados (default: 100, max: 2500)
 * @returns Array de eventos del calendario
 * @throws Error si el request excede el timeout
 */
export async function getCalendarEvents(
  accessToken: string,
  calendarId: string = 'primary',
  timeMin?: Date,
  timeMax?: Date,
  maxResults: number = 100
): Promise<calendar_v3.Schema$Event[]> {
  const calendar = createCalendarClient(accessToken);

  // AI_DECISION: Implementar timeout con AbortController
  // Justificación: Previene requests colgados que consumen recursos
  // Impacto: Falla rápido si Google API no responde
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GOOGLE_API_TIMEOUT_MS);

  try {
    const response = await calendar.events.list(
      {
        calendarId,
        maxResults: Math.min(maxResults, 2500), // Google API limit
        singleEvents: true,
        orderBy: 'startTime',
        ...(timeMin ? { timeMin: timeMin.toISOString() } : {}),
        ...(timeMax ? { timeMax: timeMax.toISOString() } : {}),
      },
      { signal: controller.signal as any }
    );

    return response.data.items || [];
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Google Calendar API request timed out after ${GOOGLE_API_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Crea un evento en el calendario con timeout
 *
 * @param accessToken - Access token de Google OAuth2
 * @param calendarId - ID del calendario (default: 'primary')
 * @param event - Datos del evento a crear
 * @returns Evento creado
 * @throws Error si el request excede el timeout
 */
export async function createCalendarEvent(
  accessToken: string,
  calendarId: string = 'primary',
  event: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone?: string } | { date: string };
    end: { dateTime: string; timeZone?: string } | { date: string };
    attendees?: Array<{ email: string }>;
  }
): Promise<calendar_v3.Schema$Event> {
  const calendar = createCalendarClient(accessToken);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GOOGLE_API_TIMEOUT_MS);

  try {
    const response = await calendar.events.insert(
      {
        calendarId,
        requestBody: event,
      },
      { signal: controller.signal as any }
    );

    return response.data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Google Calendar API request timed out after ${GOOGLE_API_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Actualiza un evento existente
 *
 * @param accessToken - Access token de Google OAuth2
 * @param calendarId - ID del calendario
 * @param eventId - ID del evento a actualizar
 * @param event - Datos parciales del evento a actualizar
 * @returns Evento actualizado
 */
export async function updateCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: Partial<calendar_v3.Schema$Event>
): Promise<calendar_v3.Schema$Event> {
  const calendar = createCalendarClient(accessToken);

  const response = await calendar.events.update({
    calendarId,
    eventId,
    requestBody: event,
  });

  return response.data;
}

/**
 * Elimina un evento del calendario
 *
 * @param accessToken - Access token de Google OAuth2
 * @param calendarId - ID del calendario
 * @param eventId - ID del evento a eliminar
 */
export async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const calendar = createCalendarClient(accessToken);

  await calendar.events.delete({
    calendarId,
    eventId,
  });
}

/**
 * Lista calendarios disponibles del usuario con timeout
 *
 * @param accessToken - Access token de Google OAuth2
 * @returns Array de calendarios disponibles
 * @throws Error si el request excede el timeout
 */
export async function listCalendars(
  accessToken: string
): Promise<calendar_v3.Schema$CalendarListEntry[]> {
  const calendar = createCalendarClient(accessToken);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GOOGLE_API_TIMEOUT_MS);

  try {
    const response = await calendar.calendarList.list({}, { signal: controller.signal as any });

    return response.data.items || [];
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Google Calendar API request timed out after ${GOOGLE_API_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
