/**
 * Alias Service
 *
 * Manages contact aliases to learn and resolve name variations.
 */

import { db, contactAliases, contacts } from '@maatwork/db';
import { eq, and, sql } from 'drizzle-orm';
import { normalizeName } from './normalization';
import { logger } from '../utils/logger';

/**
 * Find a contact by alias or normalized name.
 *
 * @param name Raw name to search for
 * @returns Found contact ID or null
 */
export async function findContactByName(name: string): Promise<string | null> {
  const normalized = normalizeName(name);
  if (!normalized) return null;

  const dbi = db();

  try {
    // 1. Try exact match on contact.normalized_full_name
    const contactMatch = await dbi
      .select({ id: contacts.id })
      .from(contacts)
      .where(eq(contacts.normalizedFullName, normalized))
      .limit(1);

    if (contactMatch.length > 0) {
      return contactMatch[0].id;
    }

    // 2. Try match on contact_aliases
    const aliasMatch = await dbi
      .select({ contactId: contactAliases.contactId })
      .from(contactAliases)
      .where(eq(contactAliases.aliasNormalized, normalized))
      .limit(1);

    if (aliasMatch.length > 0) {
      return aliasMatch[0].contactId;
    }
  } catch (error) {
    logger.error({ err: error, name }, 'Error finding contact by name');
  }

  return null;
}

import { onContactAliasesChanged } from './sync-manager';

/**
 * Add a new alias for a contact.
 * Typically called when a manual match is confirmed or a new contact is created.
 */
export async function addContactAlias(
  contactId: string,
  rawName: string,
  source: 'aum_import' | 'calendar' | 'manual',
  isVerified: boolean = false
): Promise<void> {
  const normalized = normalizeName(rawName);
  if (!normalized) return;

  const dbi = db();
  let added = false;

  try {
    // Check if alias exists
    const existing = await dbi
      .select()
      .from(contactAliases)
      .where(
        and(eq(contactAliases.contactId, contactId), eq(contactAliases.aliasNormalized, normalized))
      )
      .limit(1);

    if (existing.length === 0) {
      await dbi.insert(contactAliases).values({
        contactId,
        alias: rawName,
        aliasNormalized: normalized,
        source,
        confidence: isVerified ? 1.0 : 0.8,
        isVerified,
      });
      added = true;
      logger.info({ contactId, alias: rawName }, 'Added new contact alias');
    } else if (isVerified && !existing[0].isVerified) {
      // Upgrade confidence if now verified
      await dbi
        .update(contactAliases)
        .set({ isVerified: true, confidence: 1.0 })
        .where(eq(contactAliases.id, existing[0].id));
      added = true;
    }

    // Trigger sync if something changed
    if (added) {
      // Run in background
      onContactAliasesChanged(contactId).catch((err) => {
        logger.error({ err, contactId }, 'Background sync failed after alias update');
      });
    }
  } catch (error) {
    logger.error({ err: error, contactId, rawName }, 'Error adding contact alias');
  }
}

/**
 * Ensures a contact has its own full name as a normalized alias/field.
 * Can be used as a background job or trigger.
 */
async function ensureContactNormalization(contactId: string, fullName: string): Promise<void> {
  const normalized = normalizeName(fullName);
  if (!normalized) return;

  const dbi = db();

  // Update main contact record normalized field
  await dbi
    .update(contacts)
    .set({ normalizedFullName: normalized })
    .where(eq(contacts.id, contactId));
}
