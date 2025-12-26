/**
 * Calendar domain types
 */

export interface CalendarEventTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

export interface CalendarEventAttendee {
  email: string;
  displayName?: string;
  responseStatus?: string;
  organizer?: boolean;
  self?: boolean;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  status?: string;
  start: CalendarEventTime;
  end: CalendarEventTime;
  attendees?: CalendarEventAttendee[];
  htmlLink?: string;
  hangoutLink?: string;
  creator?: {
    email: string;
    displayName?: string;
  };
  organizer?: {
    email: string;
    displayName?: string;
    self?: boolean;
  };
}

export interface CalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  selected?: boolean;
}

export interface GetEventsParams {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  q?: string;
}

export interface CreateEventRequest {
  calendarId?: string;
  summary: string;
  description?: string;
  start: CalendarEventTime;
  end: CalendarEventTime;
  location?: string;
  attendees?: { email: string }[];
}

export interface UpdateEventRequest {
  summary?: string;
  description?: string;
  start?: CalendarEventTime;
  end?: CalendarEventTime;
  location?: string;
  attendees?: { email: string }[];
}

export interface ConnectTeamCalendarRequest {
  calendarId: string;
  calendarType: 'primary' | 'meetingRoom';
}

export interface ConnectTeamCalendarResponse {
  success: boolean;
  calendarId: string;
  calendarType: string;
}

export interface ListCalendarEventsRequest extends GetEventsParams {}

export interface UpdateCalendarEventRequest extends UpdateEventRequest {}
