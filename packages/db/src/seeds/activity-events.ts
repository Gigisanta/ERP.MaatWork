/**
 * Seed Activity Events
 * 
 * Seeds activity log entries for metrics and audit purposes.
 * activityEvents: userId, type, metadata, occurredAt, advisorUserId, contactId
 */

import { db } from '../index';
import { activityEvents, users, contacts } from '../schema';
import { getRandomElement, getRandomDate } from './helpers';

// Activity event data constants
const ACTIVITY_TYPES = [
  'note_created',
  'meeting_added',
  'task_completed',
  'login',
  'download',
  'portfolio_alert'
];

/**
 * Seed activity events
 */
export async function seedActivityEvents(
  advisorUsers: typeof users.$inferSelect[],
  contactsList: typeof contacts.$inferSelect[]
) {
  console.log('📊 Seeding activity events...');

  const existingEvents = await db().select().from(activityEvents).limit(10);
  if (existingEvents.length >= 10) {
    console.log(`  ⊙ Activity events already seeded: ${existingEvents.length} events found\n`);
    return existingEvents;
  }

  const createdEvents: typeof activityEvents.$inferSelect[] = [];

  // Create 5-10 activity events per contact
  const contactsForEvents = contactsList.slice(0, 20);

  for (const contact of contactsForEvents) {
    const numEvents = Math.floor(Math.random() * 6) + 5;
    const advisor = advisorUsers.find(a => a.id === contact.assignedAdvisorId)
      ?? getRandomElement(advisorUsers);

    for (let i = 0; i < numEvents; i++) {
      const eventType = getRandomElement(ACTIVITY_TYPES);
      const occurredAt = getRandomDate(90, 0);

      const [event] = await db().insert(activityEvents).values({
        contactId: contact.id,
        userId: advisor.id,
        advisorUserId: advisor.id,
        type: eventType,
        metadata: {
          contactName: contact.fullName,
          advisorName: advisor.fullName,
          timestamp: occurredAt.toISOString()
        },
        occurredAt
      }).returning();

      createdEvents.push(event);
    }
  }

  console.log(`✅ Activity events seeded: ${createdEvents.length} events\n`);
  return createdEvents;
}
