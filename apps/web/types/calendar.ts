/**
 * Calendar Types
 *
 * AI_DECISION: Tipos para eventos de Google Calendar y vista semanal
 * Justificación: Type safety para componentes de calendario, match con Google Calendar API schema
 * Impacto: Mejor autocompletado, menos errores en runtime
 */

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  hangoutLink?: string;
  htmlLink?: string;
  location?: string;
  status?: string;
  creator?: {
    email?: string;
    displayName?: string;
    self?: boolean;
  };
  organizer?: {
    email?: string;
    displayName?: string;
    self?: boolean;
  };
}

export interface WeekDay {
  date: Date;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  events: CalendarEvent[];
}

export interface TimeSlot {
  hour: number;
  label: string;
}

export interface CreateEventRequest {
  summary: string;
  description?: string;
  start: {
    dateTime: string; // ISO string
    timeZone?: string;
  };
  end: {
    dateTime: string; // ISO string
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{ email: string }>;
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {}

export interface CalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
  accessRole?: string;
}

export interface GetEventsParams {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  singleEvents?: boolean;
  orderBy?: string;
}

export interface ConnectTeamCalendarRequest {
  calendarId: string;
}

export interface ConnectTeamCalendarResponse {
  success: boolean;
  data: {
    calendarId: string;
    calendarUrl: string;
  };
}
