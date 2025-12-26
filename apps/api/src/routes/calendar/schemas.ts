/**
 * Calendar Validation Schemas
 *
 * Zod schemas for validating calendar API requests
 */

import { z } from 'zod';
import { uuidSchema, emailSchema } from '../../utils/validation/common-schemas';

// ==========================================================
// Query Schemas
// ==========================================================

export const getEventsQuerySchema = z.object({
  calendarId: z.string().optional(),
  calendarType: z.enum(['primary', 'meetingRoom']).default('primary'),
  timeMin: z.string().datetime().optional(),
  timeMax: z.string().datetime().optional(),
  maxResults: z.coerce.number().int().min(1).max(2500).optional().default(100),
});

// ==========================================================
// Event Schemas
// ==========================================================

const eventDateTimeSchema = z
  .object({
    dateTime: z.string().datetime().optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    timeZone: z.string().optional(),
  })
  .refine((data) => data.dateTime || data.date, {
    message: 'Either dateTime or date must be provided',
  });

export const createEventSchema = z.object({
  summary: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  start: eventDateTimeSchema,
  end: eventDateTimeSchema,
  attendees: z
    .array(
      z.object({
        email: emailSchema,
        displayName: z.string().optional(),
      })
    )
    .optional(),
  location: z.string().max(500).optional(),
});

export const updateEventSchema = createEventSchema.partial();

// ==========================================================
// Team Calendar Schemas
// ==========================================================

export const connectTeamCalendarSchema = z.object({
  calendarId: z.string().min(1),
  calendarType: z.enum(['primary', 'meetingRoom']).default('primary'),
});

export const teamCalendarParamsSchema = z.object({
  teamId: uuidSchema,
});

export const assignEventSchema = z.object({
  eventId: z.string().min(1),
  targetUserId: uuidSchema,
  eventSummary: z.string(),
  eventDescription: z.string().optional(),
  attendees: z.array(emailSchema).optional(),
  clientEmail: emailSchema.optional(), // Optional explicit override
  clientName: z.string().optional(),
});
