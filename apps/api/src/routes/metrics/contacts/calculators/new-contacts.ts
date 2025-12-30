/**
 * New Contacts Calculator
 *
 * Calculates contacts that were created AND entered "Contactado" stage in the month
 */

import { db, contacts } from '@maatwork/db';
import { and, isNull, gte, lte, inArray } from 'drizzle-orm';
import { isDateInMonthRange } from '../helpers';
import type { CalculatorContext } from '../types';

export interface NewContactsResult {
  newContactsCount: number;
  contactIdsEnteredContactadoInMonth: string[];
}

/**
 * Calculate new contacts:
 * - Contacts created in the month
 * - That entered "Contactado" stage for the first time in the month
 */
export async function calculateNewContacts(
  ctx: CalculatorContext,
  contactadoByContact: Map<string, Date>
): Promise<NewContactsResult> {
  const { range, accessFilter } = ctx;

  // Filter contacts that entered Contactado for the first time in the month
  const contactIdsEnteredContactadoInMonth = Array.from(contactadoByContact.entries())
    .filter(([_, firstEntryDate]) => isDateInMonthRange(firstEntryDate, range))
    .map(([contactId]) => contactId);

  // Verify which of these contacts were created in the month (batch query)
  const contactsCreatedInMonth =
    contactIdsEnteredContactadoInMonth.length > 0
      ? await db()
          .select({ id: contacts.id })
          .from(contacts)
          .where(
            and(
              inArray(contacts.id, contactIdsEnteredContactadoInMonth),
              gte(contacts.createdAt, range.monthStart),
              lte(contacts.createdAt, range.monthEnd),
              isNull(contacts.deletedAt),
              accessFilter.whereClause
            )
          )
      : [];

  return {
    newContactsCount: contactsCreatedInMonth.length,
    contactIdsEnteredContactadoInMonth,
  };
}
