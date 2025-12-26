/**
 * Contact Matcher Service
 *
 * Logic to match calendar events with contacts and update their status.
 */

import { db, contacts, calendarEvents, contactAliases } from '@maatwork/db';
import { eq, and, or, ilike, sql, asc } from 'drizzle-orm';
import type { Contact } from '@maatwork/db/schema'; // Assuming type availability, or infer
import { logger } from '../utils/logger';
import { normalizeName } from './normalization';

interface MeetingStatus {
  scheduled: boolean;
  completed: boolean;
  at: string | null; // ISO string
  eventId: string | null;
}

interface ContactMeetingStatus {
  firstMeeting: MeetingStatus;
  secondMeeting: MeetingStatus;
  lastCheckedAt: string;
}

const EMPTY_MEETING_STATUS: MeetingStatus = {
  scheduled: false,
  completed: false,
  at: null,
  eventId: null,
};

/**
 * Updates the meeting status for a list of contacts based on their email matching against calendar events.
 *
 * @param contactIds Array of contact IDs to update
 */
export async function updateContactsMeetingStatus(contactIds: string[]) {
  if (contactIds.length === 0) return;

  const contactsList = await db()
    .select()
    .from(contacts)
    .where(sql`${contacts.id} IN ${contactIds}`);

  for (const contact of contactsList) {
    if (!contact.email) continue;

    await updateSingleContactMeetingStatus(contact);
  }
}

/**
 * Re-evaluates meeting status for a single contact by looking up all related events.
 */
export async function updateSingleContactMeetingStatus(contact: typeof contacts.$inferSelect) {
  // We need at least an email or some aliases to match
  const contactEmail = contact.email;

  // 1. Get contact aliases
  const aliasesResult = await db()
    .select({ aliasNormalized: contactAliases.aliasNormalized })
    .from(contactAliases)
    .where(eq(contactAliases.contactId, contact.id));

  const aliases = new Set(aliasesResult.map((a: { aliasNormalized: string }) => a.aliasNormalized));

  // Add contact's own name as alias if present
  if (contact.fullName) {
    aliases.add(normalizeName(contact.fullName));
  }
  if (contact.firstName && contact.lastName) {
    aliases.add(normalizeName(`${contact.firstName} ${contact.lastName}`));
  }

  if (!contactEmail && aliases.size === 0) return;

  // 2. Fetch all events for the advisor (optimization: maybe limit to last X years if needed)
  // We fetch all because we need to check past history for "first meeting"
  const allEvents = await db()
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.userId, contact.assignedAdvisorId!))
    .orderBy(asc(calendarEvents.startAt));

  // 3. Filter events in memory using robust matching
  // AI_DECISION: In-memory filtering for complex attendee matching
  // Justificación: Matching contacts with calendar events requires checking nested JSON arrays (attendees) 
  //                and name normalization which is easier and faster in memory than complex SQL for small datasets.
  // Impacto: Improved matching accuracy without overly complex database queries.
  const events = allEvents.filter((event: typeof calendarEvents.$inferSelect) => {
    if (!event.attendees || !Array.isArray(event.attendees)) return false;

    return (event.attendees as { email?: string; displayName?: string }[]).some((attendee) => {
      // Match by Email
      if (
        contactEmail &&
        attendee.email &&
        attendee.email.toLowerCase() === contactEmail.toLowerCase()
      ) {
        return true;
      }

      // Match by Name/Alias
      if (attendee.displayName) {
        const normalizedDisplay = normalizeName(attendee.displayName);
        if (aliases.has(normalizedDisplay)) {
          return true;
        }
      }

      return false;
    });
  });

  // Filter valid meetings (confirmed, not cancelled)
  const validEvents = events.filter(
    (e: typeof calendarEvents.$inferSelect) => e.status !== 'cancelled'
  );

  const now = new Date();

  // Determine status
  const firstEvent = validEvents[0];
  const secondEvent = validEvents[1];

  const newStatus: ContactMeetingStatus = {
    firstMeeting: { ...EMPTY_MEETING_STATUS },
    secondMeeting: { ...EMPTY_MEETING_STATUS },
    lastCheckedAt: now.toISOString(),
  };

  if (firstEvent && firstEvent.startAt) {
    newStatus.firstMeeting = {
      scheduled: true,
      completed: firstEvent.startAt < now,
      at: firstEvent.startAt.toISOString(),
      eventId: firstEvent.id,
    };
  }

  if (secondEvent && secondEvent.startAt) {
    newStatus.secondMeeting = {
      scheduled: true,
      completed: secondEvent.startAt < now,
      at: secondEvent.startAt.toISOString(),
      eventId: secondEvent.id,
    };
  }

  // Update contact if status changed (using stringify to compare deep equality simply)
  // AI_DECISION: Simple deep equality check using JSON.stringify
  // Justificación: MeetingStatus is a simple object, stringify is efficient enough for this comparison 
  //                and avoids manual property checking or extra dependencies.
  // Impacto: Clean code, avoids unnecessary DB updates if status hasn't changed.

  // Only update if changed significantly
  const currentStatus = contact.meetingStatus as ContactMeetingStatus | null;

  const hasChanged =
    !currentStatus ||
    JSON.stringify(currentStatus.firstMeeting) !== JSON.stringify(newStatus.firstMeeting) ||
    JSON.stringify(currentStatus.secondMeeting) !== JSON.stringify(newStatus.secondMeeting);

  if (hasChanged) {
    await db()
      .update(contacts)
      .set({
        meetingStatus: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, contact.id));
  }
}
