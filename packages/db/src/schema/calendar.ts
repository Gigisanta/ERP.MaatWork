/**
 * Calendar Events Schema
 * 
 * Stores synced Google Calendar events to allow offline processing 
 * and history tracking for contact matching.
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * calendar_events
 * Persisted Google Calendar events for sync and matching.
 */
export const calendarEvents = pgTable(
  'calendar_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    googleId: text('google_id').notNull(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    summary: text('summary'),
    description: text('description'),
    startAt: timestamp('start_at', { withTimezone: true }),
    endAt: timestamp('end_at', { withTimezone: true }),
    attendees: jsonb('attendees').default(sql`'[]'::jsonb`), // Array of email strings or objects
    status: text('status'), // confirmed, tentative, cancelled
    htmlLink: text('html_link'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    // Unique constraint: one google event per user (or globally if google IDs are globally unique, 
    // but they are usually unique per calendar, and we might sync multiple calendars. 
    // Safest is user + googleId or just googleId if we trust Google's uniqueness across calendars we access).
    // For now, let's assume unique per user-calendar-sync scope.
    calendarEventsGoogleIdIdx: uniqueIndex('idx_calendar_events_google_id').on(table.googleId), 
    calendarEventsUserIdx: index('idx_calendar_events_user').on(table.userId),
    calendarEventsStartIdx: index('idx_calendar_events_start').on(table.startAt),
    // AI_DECISION: Composite index for range queries per user
    // Justificación: Most queries will look for events for a specific user within a date range
    // Impacto: Faster calendar sync and view rendering
    calendarEventsUserStartIdx: index('idx_calendar_events_user_start').on(table.userId, table.startAt)
  })
);

