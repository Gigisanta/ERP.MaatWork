/**
 * Seed Tags
 *
 * Seeds tags and contact-tag associations.
 * Note: The actual schema has no tag categories - tags have scope (contact/meeting/note).
 */

import { db } from '../index';
import { tags, contactTags, contacts } from '../schema';
import { eq, and } from 'drizzle-orm';
import { getRandomElements } from './helpers';

interface TagData {
  scope: string;
  name: string;
  color: string;
  businessLine?: string;
}

// Tag data constants - tags have scope, name, color
const TAGS_DATA: TagData[] = [
  // Business Line Tags
  { scope: 'contact', name: 'Options', color: '#003399', businessLine: 'zurich' },
  { scope: 'contact', name: 'Invest', color: '#0055CC', businessLine: 'zurich' },
  { scope: 'contact', name: 'Impact', color: '#0077FF', businessLine: 'zurich' },
  { scope: 'contact', name: 'InvestorsTrust', color: '#10B981', businessLine: 'investorstrust' },
  { scope: 'contact', name: 'Balanz', color: '#F59E0B', businessLine: 'inversiones' },
  { scope: 'contact', name: 'Auto', color: '#6B7280', businessLine: 'patrimonial' },
  { scope: 'contact', name: 'Hogar', color: '#4B5563', businessLine: 'patrimonial' },

  // Investment profile tags
  { scope: 'contact', name: 'Conservador', color: '#3B82F6' },
  { scope: 'contact', name: 'Moderado', color: '#8B5CF6' },
  { scope: 'contact', name: 'Agresivo', color: '#EF4444' },
  { scope: 'contact', name: 'Muy Agresivo', color: '#DC2626' },
  // Client type tags
  { scope: 'contact', name: 'VIP', color: '#10B981' },
  { scope: 'contact', name: 'Premium', color: '#F59E0B' },
  { scope: 'contact', name: 'Standard', color: '#6B7280' },
  { scope: 'contact', name: 'Nuevo', color: '#06B6D4' },
  // Interest tags
  { scope: 'contact', name: 'Acciones', color: '#EC4899' },
  { scope: 'contact', name: 'Bonos', color: '#14B8A6' },
  { scope: 'contact', name: 'FCI', color: '#F97316' },
  { scope: 'contact', name: 'CEDEARs', color: '#A855F7' },
  { scope: 'contact', name: 'Crypto', color: '#FBBF24' },
  { scope: 'contact', name: 'Real Estate', color: '#84CC16' },
  // Origin tags
  { scope: 'contact', name: 'Referido', color: '#8B5CF6' },
  { scope: 'contact', name: 'Evento', color: '#F43F5E' },
  { scope: 'contact', name: 'Web', color: '#3B82F6' },
  { scope: 'contact', name: 'LinkedIn', color: '#0077B5' },
  { scope: 'contact', name: 'WhatsApp', color: '#25D366' },
  // Status tags
  { scope: 'contact', name: 'Activo', color: '#22C55E' },
  { scope: 'contact', name: 'Inactivo', color: '#EF4444' },
  { scope: 'contact', name: 'En proceso', color: '#F59E0B' },
  { scope: 'contact', name: 'Requiere seguimiento', color: '#EC4899' },
];

/**
 * Seed tags
 */
export async function seedTags(contactsList: (typeof contacts.$inferSelect)[]) {
  // eslint-disable-next-line no-console
    console.log('🏷️  Seeding tags...');

  const createdTags: (typeof tags.$inferSelect)[] = [];

  // Create tags
  for (const tagData of TAGS_DATA) {
    const existing = await db()
      .select()
      .from(tags)
      .where(and(eq(tags.scope, tagData.scope), eq(tags.name, tagData.name)))
      .limit(1);

    if (existing.length === 0) {
      const [created] = await db()
        .insert(tags)
        .values({
          scope: tagData.scope,
          name: tagData.name,
          color: tagData.color,
          businessLine: tagData.businessLine || null,
          isSystem: false,
        })
        .returning();
      createdTags.push(created);
      // eslint-disable-next-line no-console
    console.log(`  ✓ Created tag: ${tagData.name}`);
    } else {
      createdTags.push(existing[0]!);
    }
  }

  // Assign tags to contacts
  if (contactsList.length > 0 && createdTags.length > 0) {
    // eslint-disable-next-line no-console
    console.log('  🏷️  Assigning tags to contacts...');
    let assignmentsCreated = 0;

    for (const contact of contactsList) {
      // Assign 1-3 random tags per contact
      const numTags = Math.floor(Math.random() * 3) + 1;
      const selectedTags = getRandomElements(createdTags, numTags);

      for (const tag of selectedTags) {
        const existingAssignment = await db()
          .select()
          .from(contactTags)
          .where(and(eq(contactTags.contactId, contact.id), eq(contactTags.tagId, tag.id)))
          .limit(1);

        if (existingAssignment.length === 0) {
          await db()
            .insert(contactTags)
            .values({
              contactId: contact.id,
              tagId: tag.id,
            })
            .onConflictDoNothing();
          assignmentsCreated++;
        }
      }
    }

    // eslint-disable-next-line no-console
    console.log(`    ✓ Created ${assignmentsCreated} tag assignments`);
  }

  // eslint-disable-next-line no-console
    console.log(`✅ Tags seeded: ${createdTags.length} tags\n`);
  return createdTags;
}
