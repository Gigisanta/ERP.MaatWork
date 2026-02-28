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
 * Updates meeting status for a list of contacts based on their email matching against calendar events.
 *
 * OPTIMIZATION: Batch fetches all aliases and events upfront to avoid N+1 queries
 *
 * @param contactIds Array of contact IDs to update
 */
export async function updateContactsMeetingStatus(contactIds: string[]) {
  if (contactIds.length === 0) return;

  const contactsList = await db()
    .select({
      id: contacts.id,
      email: contacts.email,
      fullName: contacts.fullName,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      assignedAdvisorId: contacts.assignedAdvisorId,
      meeingStatus: contacts.meetingStatus,
    })
    .from(contacts)
    .where(sql`${contacts.id} IN ${contactIds}`);

  // Batch fetch: Get all aliases for all contacts in a single query
  const allAliases = await db()
    .select({
      contactId: contactAliases.contactId,
      aliasNormalized: contactAliases.aliasNormalized,
    })
    .from(contactAliases)
    .where(sql`${contactAliases.contactId} IN ${contactIds}`);

  // Build a map for quick lookup: contactId -> Set of alias names
  const aliasesMap = new Map<string, Set<string>>();
  for (const alias of allAliases) {
    if (!aliasesMap.has(alias.contactId)) {
      aliasesMap.set(alias.contactId, new Set());
    }
    aliasesMap.get(alias.contactId)!.add(alias.aliasNormalized);
  }

  // Batch fetch: Get all advisor IDs and fetch their events in bulk
  const advisorIds = contactsList
    .map((c: (typeof contactsList)[0]) => c.assignedAdvisorId)
    .filter((id: string | null): id is string => id != null);
  const uniqueAdvisorIds = [...new Set(advisorIds)];

  // Fetch all events for all advisors at once
  const allAdvisorEvents = await db()
    .select({
      id: calendarEvents.id,
      userId: calendarEvents.userId,
      startAt: calendarEvents.startAt,
      status: calendarEvents.status,
      attendees: calendarEvents.attendees,
    })
    .from(calendarEvents)
    .where(sql`${calendarEvents.userId} IN ${uniqueAdvisorIds}`)
    .orderBy(asc(calendarEvents.startAt));

  // Build a map: advisorId -> events array
  const eventsMap = new Map<string, (typeof calendarEvents.$inferSelect)[]>();
  for (const event of allAdvisorEvents) {
    if (!eventsMap.has(event.userId)) {
      eventsMap.set(event.userId, []);
    }
    eventsMap.get(event.userId)!.push(event);
  }

  // Process each contact using pre-fetched data
  for (const contact of contactsList) {
    if (!contact.email) continue;

    const contactAliases = aliasesMap.get(contact.id) || new Set();
    const advisorEvents = contact.assignedAdvisorId
      ? eventsMap.get(contact.assignedAdvisorId) || []
      : [];

    await updateSingleContactMeetingStatus(contact, contactAliases, advisorEvents);
  }
}

/**
 * Re-evaluates meeting status for a single contact using pre-fetched data
 *
 * @param contact The contact object
 * @param aliases Pre-fetched set of normalized aliases
 * @param advisorEvents Pre-fetched events for the advisor
 */
export async function updateSingleContactMeetingStatus(
  contact: typeof contacts.$inferSelect,
  aliases: Set<string>,
  advisorEvents: (typeof calendarEvents.$inferSelect)[]
) {
  // We need at least an email or some aliases to match
  const contactEmail = contact.email;

  // Add contact's own name as alias if present
  if (contact.fullName) {
    aliases.add(normalizeName(contact.fullName));
  }
  if (contact.firstName && contact.lastName) {
    aliases.add(normalizeName(`${contact.firstName} ${contact.lastName}`));
  }

  if (!contactEmail && aliases.size === 0) return;

  // Filter events in memory using robust matching
  const events = advisorEvents.filter((event) => {
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
  const validEvents = events.filter((e) => e.status !== 'cancelled');

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

  // Only update if changed significantly (optimize comparison to avoid JSON.stringify)
  const currentStatus = contact.meeingStatus as ContactMeetingStatus | null;

  const hasChanged =
    !currentStatus ||
    !deepEqual(currentStatus.firstMeeting, newStatus.firstMeeting) ||
    !deepEqual(currentStatus.secondMeeting, newStatus.secondMeeting);

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

/**
 * Deep equality check for simple objects (avoids JSON.stringify overhead)
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!(key in (b as Record<string, unknown>))) return false;
    if ((a as Record<string, unknown>)[key] !== (b as Record<string, unknown>)[key]) {
      return false;
    }
  }
  return true;
}
