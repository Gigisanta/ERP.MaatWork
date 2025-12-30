/**
 * Batch Monthly Metrics Calculator
 *
 * Optimized calculator that fetches data in batches to reduce database roundtrips.
 */

import { db, contacts, pipelineStageHistory } from '@maatwork/db';
import { eq, and, isNull, sql, gte, lte, inArray, asc, min } from 'drizzle-orm';
import { createMonthRange } from './helpers';
import { calculateMeetings } from './calculators/meetings';
import { calculateNewClients } from './calculators/new-clients';
import { calculateBusinessLineClosures } from './calculators/business-line-closures';
import { calculateTransitionTimesFromData } from './calculators/transition-times-batch';
import { calculateMarketTypeConversionFromData } from './calculators/market-type-conversion-batch';
import type {
  AccessFilter,
  PipelineStageIds,
  MonthlyMetrics,
  MonthRange,
  CalculatorContext,
} from './types';

interface BatchParams {
  months: { month: number; year: number }[];
  stageIds: PipelineStageIds;
  accessFilter: AccessFilter;
}

/**
 * Calculates metrics for multiple months in a single batch
 */
export async function calculateBatchMonthlyMetrics(params: BatchParams): Promise<MonthlyMetrics[]> {
  const { months, stageIds, accessFilter } = params;
  const {
    contactadoStageId,
    firstMeetingStageId,
    secondMeetingStageId,
    clienteStageId,
    prospectoStageId,
  } = stageIds;

  // 1. Determine full range
  const ranges = months.map((m) => createMonthRange(m.month, m.year));
  const fullStart = new Date(Math.min(...ranges.map((r) => r.monthStart.getTime())));
  const fullEnd = new Date(Math.max(...ranges.map((r) => r.monthEnd.getTime())));

  // Also we need history from before the full range to determine "first time"
  // To be safe, we look at ALL history for the relevant contacts.

  // 2. Get First Time Entry for each stage for ALL relevant contacts
  // This is the core optimization: find the EARLIEST entry for each contact/stage

  const relevantStageIds = [
    contactadoStageId,
    firstMeetingStageId,
    secondMeetingStageId,
    clienteStageId,
  ];

  // AI_DECISION: Fetch minimum entry dates for all stages in a single query
  // Justificación: Replaces N*4*3 queries with 1 main history query and 1 creation query
  const firstHistoryEntries = await db()
    .select({
      contactId: pipelineStageHistory.contactId,
      toStage: pipelineStageHistory.toStage,
      firstEntry: min(pipelineStageHistory.changedAt),
    })
    .from(pipelineStageHistory)
    .innerJoin(contacts, eq(pipelineStageHistory.contactId, contacts.id))
    .where(
      and(
        inArray(pipelineStageHistory.toStage, relevantStageIds),
        isNull(contacts.deletedAt),
        accessFilter.whereClause
      )
    )
    .groupBy(pipelineStageHistory.contactId, pipelineStageHistory.toStage);

  // Map to store (contactId, stageId) -> Date
  const firstEntryMap = new Map<string, Map<string, Date>>();

  firstHistoryEntries.forEach(
    (entry: { contactId: string; toStage: string; firstEntry: string | null }) => {
      if (!firstEntryMap.has(entry.contactId)) {
        firstEntryMap.set(entry.contactId, new Map());
      }
      if (entry.firstEntry) {
        firstEntryMap.get(entry.contactId)!.set(entry.toStage, new Date(entry.firstEntry));
      }
    }
  );

  // 3. Get contact creation dates and stages for contacts created in range or involved in history
  const contactIdsWithHistory = Array.from(firstEntryMap.keys());

  // Also need contacts created in the full range regardless of history
  const contactsCreatedInRange = await db()
    .select({
      id: contacts.id,
      createdAt: contacts.createdAt,
      pipelineStageId: contacts.pipelineStageId,
      source: contacts.source,
    })
    .from(contacts)
    .where(
      and(
        gte(contacts.createdAt, fullStart),
        lte(contacts.createdAt, fullEnd),
        isNull(contacts.deletedAt),
        accessFilter.whereClause
      )
    );

  const allRelevantContactsMap = new Map<
    string,
    { createdAt: Date; stageAtCreation: string | null; source: string | null }
  >();

  contactsCreatedInRange.forEach(
    (c: { id: string; createdAt: Date; pipelineStageId: string | null; source: string | null }) => {
      allRelevantContactsMap.set(c.id, {
        createdAt: new Date(c.createdAt),
        stageAtCreation: c.pipelineStageId,
        source: c.source,
      });
    }
  );

  // If some contacts with history were NOT in the creation range, fetch them too
  const missingContactIds = contactIdsWithHistory.filter((id) => !allRelevantContactsMap.has(id));
  if (missingContactIds.length > 0) {
    // Process in chunks of 500 to avoid SQL limit issues
    for (let i = 0; i < missingContactIds.length; i += 500) {
      const chunk = missingContactIds.slice(i, i + 500);
      const extraContacts = await db()
        .select({
          id: contacts.id,
          createdAt: contacts.createdAt,
          pipelineStageId: contacts.pipelineStageId,
          source: contacts.source,
        })
        .from(contacts)
        .where(inArray(contacts.id, chunk));

      extraContacts.forEach(
        (c: {
          id: string;
          createdAt: Date;
          pipelineStageId: string | null;
          source: string | null;
        }) => {
          allRelevantContactsMap.set(c.id, {
            createdAt: new Date(c.createdAt),
            stageAtCreation: c.pipelineStageId,
            source: c.source,
          });
        }
      );
    }
  }

  // 4. Update firstEntryMap with creation data (if contact was created directly in a stage)
  allRelevantContactsMap.forEach((data, contactId) => {
    if (data.stageAtCreation && relevantStageIds.includes(data.stageAtCreation)) {
      if (!firstEntryMap.has(contactId)) {
        firstEntryMap.set(contactId, new Map());
      }
      const existingFirst = firstEntryMap.get(contactId)!.get(data.stageAtCreation);
      if (!existingFirst || data.createdAt < existingFirst) {
        firstEntryMap.get(contactId)!.set(data.stageAtCreation, data.createdAt);
      }
    }
  });

  // 5. Prepare data for Transition Times and Market Conversion (need full history and all contacts)
  // Transition times need ALL history for those contacts
  const allHistoryForTransition = await db()
    .select({
      contactId: pipelineStageHistory.contactId,
      toStage: pipelineStageHistory.toStage,
      changedAt: pipelineStageHistory.changedAt,
    })
    .from(pipelineStageHistory)
    .innerJoin(contacts, eq(pipelineStageHistory.contactId, contacts.id))
    .where(
      and(
        inArray(pipelineStageHistory.contactId, Array.from(allRelevantContactsMap.keys())),
        inArray(
          pipelineStageHistory.toStage,
          [prospectoStageId, firstMeetingStageId, secondMeetingStageId, clienteStageId].filter(
            (id): id is string => !!id
          )
        ),
        isNull(contacts.deletedAt),
        accessFilter.whereClause
      )
    )
    .orderBy(asc(pipelineStageHistory.changedAt));

  const historyByContact = new Map<string, { toStage: string; changedAt: Date }[]>();
  allHistoryForTransition.forEach(
    (h: { contactId: string; toStage: string; changedAt: string }) => {
      if (!historyByContact.has(h.contactId)) {
        historyByContact.set(h.contactId, []);
      }
      historyByContact.get(h.contactId)!.push({
        toStage: h.toStage,
        changedAt: new Date(h.changedAt),
      });
    }
  );

  // 6. Calculate for each month using the pre-fetched data
  const results: MonthlyMetrics[] = [];

  for (const range of ranges) {
    const month = range.monthStart.getUTCMonth() + 1;
    const year = range.monthStart.getUTCFullYear();

    // Filter maps for this month
    const contactadoInMonth = new Map<string, Date>();
    const firstMeetingInMonth = new Map<string, Date>();
    const secondMeetingInMonth = new Map<string, Date>();
    const clientInMonth = new Map<string, Date>();

    firstEntryMap.forEach((stages, contactId) => {
      const contactado = stages.get(contactadoStageId);
      if (contactado) contactadoInMonth.set(contactId, contactado);

      const firstM = stages.get(firstMeetingStageId);
      if (firstM) firstMeetingInMonth.set(contactId, firstM);

      const secondM = stages.get(secondMeetingStageId);
      if (secondM) secondMeetingInMonth.set(contactId, secondM);

      const client = stages.get(clienteStageId);
      if (client) clientInMonth.set(contactId, client);
    });

    // Reuse existing calculator logic where possible, but with pre-filtered maps
    // 1. New Contacts
    const contactIdsEnteredContactadoInMonth = Array.from(contactadoInMonth.entries())
      .filter(([_, date]) => date >= range.monthStart && date <= range.monthEnd)
      .map(([id]) => id);

    const newContactsCount = contactIdsEnteredContactadoInMonth.filter((id) => {
      const contact = allRelevantContactsMap.get(id);
      return (
        contact && contact.createdAt >= range.monthStart && contact.createdAt <= range.monthEnd
      );
    }).length;

    // 2. Meetings
    const { firstMeetingsCount, secondMeetingsCount } = calculateMeetings(
      range,
      firstMeetingInMonth,
      secondMeetingInMonth
    );

    // 3. New Clients
    const { newClientsCount, clientContactIds } = calculateNewClients(range, clientInMonth);

    // 4. Business Line Closures (this one still needs a query, but it's only 1 per month and only for clients)
    // We can optimize this too if needed, but it's usually small.
    const businessLineClosures = await calculateBusinessLineClosures(clientContactIds);

    // 5. Transition Times (Batch version)
    const transitionTimes = calculateTransitionTimesFromData(
      historyByContact,
      allRelevantContactsMap,
      stageIds,
      range
    );

    // 6. Market Conversion (Batch version)
    const marketTypeConversion = calculateMarketTypeConversionFromData(
      allRelevantContactsMap,
      historyByContact,
      clienteStageId,
      range
    );

    results.push({
      month,
      year,
      newProspects: newContactsCount,
      firstMeetings: firstMeetingsCount,
      secondMeetings: secondMeetingsCount,
      newClients: newClientsCount,
      businessLineClosures,
      transitionTimes,
      marketTypeConversion,
    });
  }

  return results;
}
