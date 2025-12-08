/**
 * Meetings Calculator
 *
 * Calculates first and second meetings counts
 */

import { isDateInMonthRange } from '../helpers';
import type { MonthRange } from '../types';

/**
 * Count entries that happened for the first time in the month
 */
function countFirstTimeEntriesInMonth(
  entriesByContact: Map<string, Date>,
  range: MonthRange
): number {
  let count = 0;

  for (const [_, firstEntryDate] of entriesByContact.entries()) {
    if (isDateInMonthRange(firstEntryDate, range)) {
      count++;
    }
  }

  return count;
}

export interface MeetingsResult {
  firstMeetingsCount: number;
  secondMeetingsCount: number;
}

/**
 * Calculate first and second meetings counts
 * Only counts the FIRST time each contact enters each stage
 */
export function calculateMeetings(
  range: MonthRange,
  firstMeetingByContact: Map<string, Date>,
  secondMeetingByContact: Map<string, Date>
): MeetingsResult {
  return {
    firstMeetingsCount: countFirstTimeEntriesInMonth(firstMeetingByContact, range),
    secondMeetingsCount: countFirstTimeEntriesInMonth(secondMeetingByContact, range),
  };
}
