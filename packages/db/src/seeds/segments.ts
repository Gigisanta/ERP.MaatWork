/**
 * Seed Segments
 *
 * Seeds client segments/groups for marketing and analysis.
 * segments: name, filters (jsonb), ownerId, isDynamic, contactCount
 * segmentMembers: segmentId, contactId
 */

import { db } from '../index';
import { segments, segmentMembers, contacts, users } from '../schema';
import { eq, and } from 'drizzle-orm';
import { getRandomElements } from './helpers';

// Segment data constants
const SEGMENTS_DATA = [
  {
    name: 'Alto Patrimonio',
    description: 'Clientes con patrimonio superior a USD 500,000',
    filters: { minAum: 500000 },
  },
  {
    name: 'Perfil Conservador',
    description: 'Clientes con perfil de riesgo bajo',
    filters: { riskProfile: 'low' },
  },
  {
    name: 'Perfil Agresivo',
    description: 'Clientes con perfil de riesgo alto',
    filters: { riskProfile: 'high' },
  },
  {
    name: 'Nuevos Clientes',
    description: 'Clientes incorporados en los últimos 90 días',
    filters: { recentDays: 90 },
  },
  {
    name: 'Inactivos',
    description: 'Clientes sin actividad en los últimos 60 días',
    filters: { inactiveDays: 60 },
  },
  {
    name: 'VIP',
    description: 'Clientes con servicio premium',
    filters: { isVip: true },
  },
];

/**
 * Seed segments and assign contacts
 */
export async function seedSegments(
  contactsList: (typeof contacts.$inferSelect)[],
  advisorUsers: (typeof users.$inferSelect)[]
) {
  console.log('📊 Seeding segments...');

  const createdSegments: (typeof segments.$inferSelect)[] = [];
  const ownerUser = advisorUsers[0];

  if (!ownerUser) {
    console.log('  ⚠️ No users available for segment creation');
    return [];
  }

  for (const segmentData of SEGMENTS_DATA) {
    const existing = await db()
      .select()
      .from(segments)
      .where(eq(segments.name, segmentData.name))
      .limit(1);

    let segment: typeof segments.$inferSelect;

    if (existing.length === 0) {
      const [created] = await db()
        .insert(segments)
        .values({
          name: segmentData.name,
          description: segmentData.description,
          filters: segmentData.filters,
          ownerId: ownerUser.id,
          isDynamic: true,
          contactCount: 0,
          isShared: false,
        })
        .returning();
      segment = created;
      createdSegments.push(segment);
      console.log(`  ✓ Created segment: ${segmentData.name}`);
    } else {
      segment = existing[0]!;
      createdSegments.push(segment);
    }

    // Assign random contacts to segment
    await assignContactsToSegment(segment, contactsList);
  }

  console.log(`✅ Segments seeded: ${createdSegments.length} segments\n`);
  return createdSegments;
}

/**
 * Assign contacts to a segment
 */
async function assignContactsToSegment(
  segment: typeof segments.$inferSelect,
  contactsList: (typeof contacts.$inferSelect)[]
): Promise<void> {
  // Assign 5-15 random contacts per segment
  const numContacts = Math.floor(Math.random() * 10) + 5;
  const selectedContacts = getRandomElements(contactsList, numContacts);

  let assignmentsCreated = 0;

  for (const contact of selectedContacts) {
    const existingAssignment = await db()
      .select()
      .from(segmentMembers)
      .where(
        and(eq(segmentMembers.segmentId, segment.id), eq(segmentMembers.contactId, contact.id))
      )
      .limit(1);

    if (existingAssignment.length === 0) {
      await db()
        .insert(segmentMembers)
        .values({
          segmentId: segment.id,
          contactId: contact.id,
        })
        .onConflictDoNothing();
      assignmentsCreated++;
    }
  }

  if (assignmentsCreated > 0) {
    // Update contact count
    await db()
      .update(segments)
      .set({ contactCount: assignmentsCreated })
      .where(eq(segments.id, segment.id));

    console.log(`    ✓ Assigned ${assignmentsCreated} contacts to ${segment.name}`);
  }
}
