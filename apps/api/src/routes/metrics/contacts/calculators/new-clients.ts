/**
 * New Clients Calculator
 *
 * Calculates contacts that became clients in the month
 */

import { isDateInMonthRange } from '../helpers';
import type { MonthRange } from '../types';

export interface NewClientsResult {
  newClientsCount: number;
  clientContactIds: string[];
}

/**
 * Calculate new clients:
 * - Contacts that entered "Cliente" stage for the first time in the month
 */
export function calculateNewClients(
  range: MonthRange,
  clientByContact: Map<string, Date>
): NewClientsResult {
  let newClientsCount = 0;
  const clientContactIds: string[] = [];

  for (const [contactId, firstEntryDate] of clientByContact.entries()) {
    if (isDateInMonthRange(firstEntryDate, range)) {
      newClientsCount++;
      clientContactIds.push(contactId);
    }
  }

  return {
    newClientsCount,
    clientContactIds,
  };
}



























