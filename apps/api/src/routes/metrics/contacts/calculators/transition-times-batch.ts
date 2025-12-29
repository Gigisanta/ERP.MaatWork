/**
 * Transition Times Calculator (Batch Version)
 */

import type { TransitionTimes, MonthRange, PipelineStageIds } from '../types';

interface HistoryEntry {
  toStage: string;
  changedAt: Date;
}

/**
 * Calculate average value or null if empty
 */
function calculateAverage(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
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
  const sortedHistory = [...history].sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime());
  const { firstMeetingStageId, secondMeetingStageId, clienteStageId } = stageIds;
  const { monthStart, monthEnd } = range;

  let prospectoToFirst: number | null = null;
  let firstToSecond: number | null = null;
  let secondToClient: number | null = null;

  // Prospecto → First meeting: calculate only if entered First meeting in the month
  const firstMeetingEntry = sortedHistory.find(
    (h) => h.toStage === firstMeetingStageId && h.changedAt >= monthStart && h.changedAt <= monthEnd
  );
  if (firstMeetingEntry && createdAt) {
    const days = (firstMeetingEntry.changedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (days > 0) {
      prospectoToFirst = days;
    }
  }

  // First meeting → Second meeting: calculate only if entered Second meeting in the month
  const firstMeetingEntryInHistory = sortedHistory.find((h) => h.toStage === firstMeetingStageId);
  const secondMeetingEntry = sortedHistory.find(
    (h) => h.toStage === secondMeetingStageId && h.changedAt >= monthStart && h.changedAt <= monthEnd
  );
  if (firstMeetingEntryInHistory && secondMeetingEntry) {
    const days = (secondMeetingEntry.changedAt.getTime() - firstMeetingEntryInHistory.changedAt.getTime()) / (1000 * 60 * 60 * 24);
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
    const days = (clientEntry.changedAt.getTime() - secondMeetingEntryInHistory.changedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (days > 0) {
      secondToClient = days;
    }
  }

  return { prospectoToFirst, firstToSecond, secondToClient };
}

/**
 * Batch version of transition times calculation
 */
export function calculateTransitionTimesFromData(
  historyByContact: Map<string, HistoryEntry[]>,
  creationMap: Map<string, { createdAt: Date }>,
  stageIds: PipelineStageIds,
  range: MonthRange
): TransitionTimes {
  const prospectoToFirstTimes: number[] = [];
  const firstToSecondTimes: number[] = [];
  const secondToClientTimes: number[] = [];

  const { firstMeetingStageId, secondMeetingStageId, clienteStageId } = stageIds;
  const { monthStart, monthEnd } = range;

  // Identify contacts that had changes in THIS month
  const contactsWithChangesInMonth = Array.from(historyByContact.entries())
    .filter(([_, history]) => history.some(h => 
      [firstMeetingStageId, secondMeetingStageId, clienteStageId].includes(h.toStage) &&
      h.changedAt >= monthStart && h.changedAt <= monthEnd
    ))
    .map(([contactId]) => contactId);

  for (const contactId of contactsWithChangesInMonth) {
    const history = historyByContact.get(contactId);
    if (!history) continue;

    const creation = creationMap.get(contactId);
    const times = calculateContactTransitionTimes(history, creation?.createdAt, stageIds, range);

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




