/**
 * Transition Times Calculator
 *
 * Calculates average time between pipeline stage transitions
 */

import { db, contacts, pipelineStageHistory } from '@cactus/db';
import { eq, and, isNull, gte, lte, inArray, asc } from 'drizzle-orm';
import type { CalculatorContext, TransitionTimes, MonthRange, PipelineStageIds } from '../types';

interface HistoryEntry {
  toStage: string;
  changedAt: Date;
}

/**
 * Get contacts that had stage changes in the month
 */
async function getContactsWithChangesInMonth(ctx: CalculatorContext): Promise<string[]> {
  const { stageIds, range, accessFilter } = ctx;
  const { firstMeetingStageId, secondMeetingStageId, clienteStageId } = stageIds;
  const { monthStart, monthEnd } = range;

  const contactsWithChangesInMonth = await db()
    .select({
      contactId: pipelineStageHistory.contactId,
    })
    .from(pipelineStageHistory)
    .innerJoin(contacts, eq(pipelineStageHistory.contactId, contacts.id))
    .where(
      and(
        inArray(pipelineStageHistory.toStage, [
          firstMeetingStageId,
          secondMeetingStageId,
          clienteStageId,
        ]),
        gte(pipelineStageHistory.changedAt, monthStart),
        lte(pipelineStageHistory.changedAt, monthEnd),
        isNull(contacts.deletedAt),
        accessFilter.whereClause
      )
    )
    .groupBy(pipelineStageHistory.contactId);

  return contactsWithChangesInMonth.map((c: { contactId: string }) => c.contactId);
}

/**
 * Get full history and creation dates for contacts
 */
async function getContactHistoryAndCreations(
  contactIds: string[],
  stageIds: PipelineStageIds,
  range: MonthRange,
  accessFilter: CalculatorContext['accessFilter']
): Promise<{
  historyByContact: Map<string, HistoryEntry[]>;
  creationMap: Map<string, Date>;
}> {
  if (contactIds.length === 0) {
    return { historyByContact: new Map(), creationMap: new Map() };
  }

  const { prospectoStageId, firstMeetingStageId, secondMeetingStageId, clienteStageId } = stageIds;

  // Limit to last 2 years to optimize query
  const twoYearsAgo = new Date(range.monthEnd);
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const stageIdsToCheck = [
    prospectoStageId,
    firstMeetingStageId,
    secondMeetingStageId,
    clienteStageId,
  ].filter((id): id is string => id !== undefined);

  const [fullHistoryForContacts, contactCreations] = await Promise.all([
    // Get ALL history for these contacts (not just the month)
    db()
      .select({
        contactId: pipelineStageHistory.contactId,
        toStage: pipelineStageHistory.toStage,
        changedAt: pipelineStageHistory.changedAt,
      })
      .from(pipelineStageHistory)
      .innerJoin(contacts, eq(pipelineStageHistory.contactId, contacts.id))
      .where(
        and(
          inArray(pipelineStageHistory.contactId, contactIds),
          inArray(pipelineStageHistory.toStage, stageIdsToCheck),
          gte(pipelineStageHistory.changedAt, twoYearsAgo),
          isNull(contacts.deletedAt),
          accessFilter.whereClause
        )
      )
      .orderBy(asc(pipelineStageHistory.changedAt)),

    // Get contact creation dates
    db()
      .select({
        id: contacts.id,
        createdAt: contacts.createdAt,
      })
      .from(contacts)
      .where(
        and(inArray(contacts.id, contactIds), isNull(contacts.deletedAt), accessFilter.whereClause)
      ),
  ]);

  const creationMap = new Map<string, Date>(
    contactCreations.map((c: { id: string; createdAt: Date }) => [c.id, c.createdAt] as const)
  );

  // Group full history by contact
  const historyByContact = new Map<string, HistoryEntry[]>();
  for (const entry of fullHistoryForContacts) {
    if (!historyByContact.has(entry.contactId)) {
      historyByContact.set(entry.contactId, []);
    }
    historyByContact.get(entry.contactId)!.push({
      toStage: entry.toStage,
      changedAt: entry.changedAt,
    });
  }

  return { historyByContact, creationMap };
}

/**
 * Calculate transition times for a single contact
 */
function calculateContactTransitionTimes(
  history: HistoryEntry[],
  createdAt: Date | undefined,
  stageIds: PipelineStageIds,
  range: MonthRange
): {
  prospectoToFirst: number | null;
  firstToSecond: number | null;
  secondToClient: number | null;
} {
  const sortedHistory = history.sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime());
  const { firstMeetingStageId, secondMeetingStageId, clienteStageId } = stageIds;
  const { monthStart, monthEnd } = range;

  let prospectoToFirst: number | null = null;
  let firstToSecond: number | null = null;
  let secondToClient: number | null = null;

  // Prospecto → First meeting: calculate only if entered First meeting in the month
  const firstMeetingEntry = sortedHistory.find(
    (h) => h.toStage === firstMeetingStageId && h.changedAt >= monthStart && h.changedAt <= monthEnd
  );
  if (firstMeetingEntry && createdAt && createdAt instanceof Date) {
    const days =
      (firstMeetingEntry.changedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (days > 0) {
      prospectoToFirst = days;
    }
  }

  // First meeting → Second meeting: calculate only if entered Second meeting in the month
  const firstMeetingEntryInHistory = sortedHistory.find((h) => h.toStage === firstMeetingStageId);
  const secondMeetingEntry = sortedHistory.find(
    (h) =>
      h.toStage === secondMeetingStageId && h.changedAt >= monthStart && h.changedAt <= monthEnd
  );
  if (firstMeetingEntryInHistory && secondMeetingEntry) {
    const days =
      (secondMeetingEntry.changedAt.getTime() - firstMeetingEntryInHistory.changedAt.getTime()) /
      (1000 * 60 * 60 * 24);
    if (days > 0) {
      firstToSecond = days;
    }
  }

  // Second meeting → Client: calculate only if entered Client in the month
  const secondMeetingEntryInHistory = sortedHistory.find((h) => h.toStage === secondMeetingStageId);
  const clientEntry = sortedHistory.find(
    (h) => h.toStage === clienteStageId && h.changedAt >= monthStart && h.changedAt <= monthEnd
  );
  if (secondMeetingEntryInHistory && clientEntry) {
    const days =
      (clientEntry.changedAt.getTime() - secondMeetingEntryInHistory.changedAt.getTime()) /
      (1000 * 60 * 60 * 24);
    if (days > 0) {
      secondToClient = days;
    }
  }

  return { prospectoToFirst, firstToSecond, secondToClient };
}

/**
 * Calculate average value or null if empty
 */
function calculateAverage(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Calculate average transition times between stages
 */
export async function calculateTransitionTimes(ctx: CalculatorContext): Promise<TransitionTimes> {
  const contactIdsWithChanges = await getContactsWithChangesInMonth(ctx);

  if (contactIdsWithChanges.length === 0) {
    return {
      prospectoToFirstMeeting: null,
      firstToSecondMeeting: null,
      secondMeetingToClient: null,
    };
  }

  const { historyByContact, creationMap } = await getContactHistoryAndCreations(
    contactIdsWithChanges,
    ctx.stageIds,
    ctx.range,
    ctx.accessFilter
  );

  const prospectoToFirstTimes: number[] = [];
  const firstToSecondTimes: number[] = [];
  const secondToClientTimes: number[] = [];

  for (const contactId of contactIdsWithChanges) {
    const history = historyByContact.get(contactId);
    if (!history || history.length === 0) continue;

    const createdAt = creationMap.get(contactId);
    const times = calculateContactTransitionTimes(history, createdAt, ctx.stageIds, ctx.range);

    if (times.prospectoToFirst !== null) prospectoToFirstTimes.push(times.prospectoToFirst);
    if (times.firstToSecond !== null) firstToSecondTimes.push(times.firstToSecond);
    if (times.secondToClient !== null) secondToClientTimes.push(times.secondToClient);
  }

  return {
    prospectoToFirstMeeting: calculateAverage(prospectoToFirstTimes),
    firstToSecondMeeting: calculateAverage(firstToSecondTimes),
    secondMeetingToClient: calculateAverage(secondToClientTimes),
  };
}
