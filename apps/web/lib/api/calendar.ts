/**
 * Calendar API Client
 *
 * AI_DECISION: Usar tipos consistentes de @/types/calendar
 * Justificación: Centralizar tipos de calendario, evitar duplicación
 * Impacto: Mejor type safety, consistencia entre componentes
 */

import { apiClient } from './client';
import type { ApiResponse } from '@/types';
import type {
  CalendarEvent,
  CalendarListEntry,
  GetEventsParams,
  ConnectTeamCalendarRequest,
  ConnectTeamCalendarResponse,
  CreateEventRequest,
  UpdateEventRequest,
} from '@/types';

// Re-export types for backward compatibility
export type {  CalendarListEntry,  };

/**
 * Get personal calendars from Google
 */
export async function getPersonalCalendars(): Promise<ApiResponse<CalendarListEntry[]>> {
  return apiClient.get<CalendarListEntry[]>('/v1/calendar/personal/calendars');
}

/**
 * Get personal events from Google Calendar
 *
 * AI_DECISION: Usar tipo CalendarEvent[] en lugar de GoogleEvent[]
 * Justificación: Consistencia con tipos definidos en @/types/calendar
 * Impacto: Type safety mejorado, autocompletado correcto
 */
async function getCalendarEvents(
  params?: GetEventsParams
): Promise<ApiResponse<CalendarEvent[]>> {
  const queryParams = new URLSearchParams();
  if (params?.calendarId) queryParams.set('calendarId', params.calendarId);
  if (params?.timeMin) queryParams.set('timeMin', params.timeMin);
  if (params?.timeMax) queryParams.set('timeMax', params.timeMax);
  if (params?.maxResults) queryParams.set('maxResults', params.maxResults?.toString() || '10');

  return apiClient.get<CalendarEvent[]>(`/v1/calendar/personal/events?${queryParams.toString()}`);
}

/**
 * Create a new event in personal calendar
 */
export async function createEvent(data: CreateEventRequest): Promise<ApiResponse<CalendarEvent>> {
  return apiClient.post<CalendarEvent>('/v1/calendar/personal/events', data);
}

/**
 * Update an existing event in personal calendar
 */
export async function updateEvent(
  eventId: string,
  data: UpdateEventRequest
): Promise<ApiResponse<CalendarEvent>> {
  return apiClient.patch<CalendarEvent>(`/v1/calendar/personal/events/${eventId}`, data);
}

/**
 * Delete an event from personal calendar
 */
export async function deleteEvent(eventId: string): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/v1/calendar/personal/events/${eventId}`);
}

/**
 * Connect a Google Calendar to a Team
 */
export async function connectTeamCalendar(
  teamId: string,
  calendarId: string,
  calendarType: 'primary' | 'meetingRoom' = 'primary'
): Promise<ApiResponse<ConnectTeamCalendarResponse>> {
  return apiClient.post<ConnectTeamCalendarResponse>(`/v1/calendar/team/${teamId}/connect`, {
    calendarId,
    calendarType,
  });
}

/**
 * Disconnect a Google Calendar from a Team
 */
async function disconnectTeamCalendar(
  teamId: string,
  calendarType: 'primary' | 'meetingRoom' = 'primary'
): Promise<ApiResponse<{ success: boolean }>> {
  return apiClient.delete<{ success: boolean }>(
    `/v1/calendar/team/${teamId}/connect?calendarType=${calendarType}`
  );
}

/**
 * Get events from a Team Calendar
 */
export async function getTeamEvents(
  teamId: string,
  params?: {
    timeMin?: Date;
    timeMax?: Date;
    maxResults?: number;
    calendarType?: 'primary' | 'meetingRoom';
  }
): Promise<ApiResponse<CalendarEvent[]>> {
  const queryParams = new URLSearchParams();
  if (params?.timeMin) queryParams.set('timeMin', params.timeMin.toISOString());
  if (params?.timeMax) queryParams.set('timeMax', params.timeMax.toISOString());
  if (params?.maxResults) queryParams.set('maxResults', params.maxResults.toString());
  if (params?.calendarType) queryParams.set('calendarType', params.calendarType);

  return apiClient.get<CalendarEvent[]>(
    `/v1/calendar/team/${teamId}/events?${queryParams.toString()}`
  );
}

/**
 * Alias for getTeamEvents to match api-hooks import
 */
const getTeamCalendarEvents = getTeamEvents;

interface AssignEventRequest {
  eventId: string;
  targetUserId: string;
  eventSummary: string;
  eventDescription?: string | null;
  attendees?: string[] | null | undefined;
  clientEmail?: string;
  clientName?: string;
}

interface AssignEventResponse {
  success: boolean;
  contactId?: string;
}

/**
 * Assign a team calendar event to a team member
 */
export async function assignEventToMember(
  teamId: string,
  data: AssignEventRequest
): Promise<ApiResponse<AssignEventResponse>> {
  return apiClient.post<AssignEventResponse>(`/v1/calendar/team/${teamId}/events/assign`, data);
}
