/**
 * Sync Manager
 *
 * Orchestrates synchronization across domains when key data changes.
 * Ensures data consistency for Contacts, AUM, and Calendar.
 */

import { db, contactAliases, contacts } from '@maatwork/db';
import { eq } from 'drizzle-orm';
import { reprocessUnmatchedRowsForContact } from './aum';
import { updateSingleContactMeetingStatus } from './contact-matcher';
import { logger } from '../utils/logger';

/**
 * Triggered when a contact's aliases change (new manual match, or added via UI).
 * Re-runs matching for AUM rows and Calendar events.
 */
export async function onContactAliasesChanged(contactId: string) {
  logger.info({ contactId }, 'SyncManager: Contact aliases changed, reprocessing...');

  try {
    // 1. Fetch current aliases
    const aliasesRes = await db()
      .select({ aliasNormalized: contactAliases.aliasNormalized })
      .from(contactAliases)
      .where(eq(contactAliases.contactId, contactId));

    const aliases = aliasesRes.map((a: { aliasNormalized: string }) => a.aliasNormalized);

    // 2. Reprocess AUM rows
    await reprocessUnmatchedRowsForContact(contactId, aliases);

    // 3. Reprocess Calendar status
    // Need to fetch contact object first
    const [contact] = await db().select().from(contacts).where(eq(contacts.id, contactId)).limit(1);

    if (contact) {
      await updateSingleContactMeetingStatus(contact);
    }
  } catch (error) {
    logger.error({ err: error, contactId }, 'Error in SyncManager.onContactAliasesChanged');
  }
}

/**
 * Triggered when contact basic info changes (name, email).
 */
async function onContactUpdated(contactId: string) {
  // Same logic as aliases changed basically
  await onContactAliasesChanged(contactId);
}
