/**
 * Calendar Sync Service
 *
 * Synchronizes Google Calendar events to local database and triggers matching logic.
 */

import { db, calendarEvents, contacts } from '@maatwork/db';
import { eq, sql, and } from 'drizzle-orm';
import { getCalendarEvents } from './google-calendar';
import { updateContactsMeetingStatus } from './contact-matcher';
import { logger } from '../utils/logger';

/**
 * Syncs user's calendar events (past 30 days and future 90 days by default)
 * and updates contact meeting statuses.
 */
export async function syncUserCalendar(
  userId: string,
  accessToken: string,
  calendarId: string = 'primary'
) {
  const now = new Date();
  const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days future

  logger.info({ userId, timeMin, timeMax }, 'Starting calendar sync');

  try {
    const googleEvents = await getCalendarEvents(accessToken, calendarId, timeMin, timeMax, 2500);

    if (!googleEvents.length) {
      logger.info({ userId }, 'No events found to sync');
      return;
    }

    const affectedContactEmails = new Set<string>();
    const syncedGoogleIds = new Set<string>();

    // Process events in transaction or batch
    // Since we want to capture all attendees to update their statuses later

    // 1. Upsert events
    for (const event of googleEvents) {
      if (!event.id) continue;
      syncedGoogleIds.add(event.id);

      const startAt = event.start?.dateTime
        ? new Date(event.start.dateTime)
        : event.start?.date
          ? new Date(event.start.date)
          : null;
      const endAt = event.end?.dateTime
        ? new Date(event.end.dateTime)
        : event.end?.date
          ? new Date(event.end.date)
          : null;

      if (!startAt) continue; // Skip if no start time

      const attendees = (event.attendees || []).map((a) => ({
        email: a.email,
        displayName: a.displayName,
        responseStatus: a.responseStatus,
        organizer: a.organizer,
        self: a.self,
      }));

      // Collect emails to find contacts later
      attendees.forEach((a) => {
        if (a.email) affectedContactEmails.add(a.email);
      });

      // Prepare upsert
      await db()
        .insert(calendarEvents)
        .values({
          googleId: event.id,
          userId,
          summary: event.summary || '',
          description: event.description,
          startAt,
          endAt,
          attendees: attendees,
          status: event.status || 'confirmed',
          htmlLink: event.htmlLink,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: calendarEvents.googleId,
          set: {
            summary: event.summary || '',
            description: event.description,
            startAt,
            endAt,
            attendees: attendees,
            status: event.status || 'confirmed',
            htmlLink: event.htmlLink,
            updatedAt: new Date(),
          },
        });
    }

    // 2. Handle deletions: remove events in DB that were NOT in Google's response for this range
    // AI_DECISION: Implementar borrado de eventos eliminados en Google Calendar
    // Justificación: El sync solo hacía upserts, dejando eventos fantasmas que fueron borrados en Google
    // Impacto: Base de datos siempre sincronizada con el estado real del calendario
    if (syncedGoogleIds.size > 0) {
      const googleIdList = Array.from(syncedGoogleIds);
      await db()
        .delete(calendarEvents)
        .where(
          and(
            eq(calendarEvents.userId, userId),
            sql`${calendarEvents.startAt} >= ${timeMin} AND ${calendarEvents.startAt} <= ${timeMax}`,
            sql`${calendarEvents.googleId} NOT IN ${googleIdList}`
          )
        );
      logger.info({ userId, timeMin, timeMax }, 'Cleaned up deleted events in range');
    }

    logger.info({ userId, eventCount: googleEvents.length }, 'Events synced successfully');

    // 2. Trigger contact matching for affected contacts
    if (affectedContactEmails.size > 0) {
      const emailList = Array.from(affectedContactEmails);

      // Find contacts with these emails belonging to this advisor
      const contactsToUpdate = await db()
        .select({ id: contacts.id })
        .from(contacts)
        .where(and(eq(contacts.assignedAdvisorId, userId), sql`${contacts.email} IN ${emailList}`));

      if (contactsToUpdate.length > 0) {
        const contactIds = contactsToUpdate.map((c: { id: string }) => c.id);
        await updateContactsMeetingStatus(contactIds);
        logger.info(
          { userId, contactCount: contactIds.length },
          'Contact meeting statuses updated'
        );
      }
    }
  } catch (error) {
    logger.error({ userId, error }, 'Failed to sync calendar');
    throw error;
  }
}
