/**
 * Business Line Closures Calculator
 *
 * Calculates closures by business line (inversiones, zurich, patrimonial)
 */

import { db, contacts, contactTags, tags } from '@maatwork/db';
import { and, eq, isNotNull, inArray } from 'drizzle-orm';
import type { BusinessLineClosures } from '../types';

/**
 * Calculate business line closures:
 * - Contacts that reached Cliente for the first time in the month
 * - With tags that have business line defined
 *
 * NOTE: A contact can have multiple business line tags, in which case
 * it counts in all corresponding lines
 */
export async function calculateBusinessLineClosures(
  clientContactIds: string[]
): Promise<BusinessLineClosures> {
  const businessLineClosures: BusinessLineClosures = {
    inversiones: 0,
    zurich: 0,
    patrimonial: 0,
  };

  if (clientContactIds.length === 0) {
    return businessLineClosures;
  }

  // Get tags for these contacts that have defined business lines
  const contactTagsWithBusinessLine = await db()
    .select({
      contactId: contactTags.contactId,
      businessLine: tags.businessLine,
    })
    .from(contactTags)
    .innerJoin(tags, eq(contactTags.tagId, tags.id))
    .where(
      and(
        inArray(contactTags.contactId, clientContactIds),
        eq(tags.scope, 'contact'),
        isNotNull(tags.businessLine),
        inArray(tags.businessLine, ['inversiones', 'zurich', 'patrimonial'])
      )
    );

  // Count unique contacts per business line using Set to avoid duplicates
  // If a contact has multiple tags of the same line, only count once
  const contactsByBusinessLine = new Map<string, Set<string>>();

  for (const row of contactTagsWithBusinessLine) {
    // The SQL filter already guarantees businessLine is not null and has a valid value
    const businessLine = row.businessLine!;
    if (!contactsByBusinessLine.has(businessLine)) {
      contactsByBusinessLine.set(businessLine, new Set());
    }
    contactsByBusinessLine.get(businessLine)!.add(row.contactId);
  }

  businessLineClosures.inversiones = contactsByBusinessLine.get('inversiones')?.size ?? 0;
  businessLineClosures.zurich = contactsByBusinessLine.get('zurich')?.size ?? 0;
  businessLineClosures.patrimonial = contactsByBusinessLine.get('patrimonial')?.size ?? 0;

  return businessLineClosures;
}
