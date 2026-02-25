/**
 * Contact Metrics Helpers
 *
 * AI_DECISION: Helper function para obtener primera vez que contactos entran a una etapa
 * Justificación: Reduce código duplicado, mejora performance usando agregaciones SQL, hace el código más mantenible
 * Impacto: Reemplaza 4 implementaciones repetitivas con una función optimizada
 */

import { db, contacts, pipelineStages, pipelineStageHistory } from '@maatwork/db';
import { eq, and, isNull, sql, gte, lte, inArray, type InferSelectModel } from 'drizzle-orm';
import type { AccessFilter, MonthRange } from './types';

type PipelineStage = InferSelectModel<typeof pipelineStages>;

/**
 * Get pipeline stages by names in a single batch query
 */
export async function getPipelineStagesByNames(
  stageNames: string[]
): Promise<Map<string, PipelineStage>> {
  const allStages = await db()
    .select()
    .from(pipelineStages)
    .where(inArray(pipelineStages.name, stageNames));

  return new Map<string, PipelineStage>(
    allStages.map((stage: PipelineStage) => [stage.name, stage])
  );
}

/**
 * Helper function para obtener primera vez que contactos entran a una etapa
 */
export async function getFirstTimeStageEntries(
  stageId: string,
  range: MonthRange,
  accessFilter: AccessFilter
): Promise<Map<string, Date>> {
  const { monthStart, monthEnd } = range;

  // AI_DECISION: Filtrar por rango de fechas para contar solo contactos que entraron por primera vez en el mes
  // Justificación: Si un contacto entra a una etapa en Enero, luego va a otra etapa, y vuelve en Marzo,
  // no debemos contarlo en Marzo porque ya había estado en esa etapa antes
  // Impacto: Métricas correctas que no cuentan contactos que retroceden de etapa

  // Get all entries in the date range
  const entriesInRange = await db()
    .select({
      contactId: pipelineStageHistory.contactId,
      changedAt: pipelineStageHistory.changedAt,
    })
    .from(pipelineStageHistory)
    .innerJoin(contacts, eq(pipelineStageHistory.contactId, contacts.id))
    .where(
      and(
        eq(pipelineStageHistory.toStage, stageId),
        gte(pipelineStageHistory.changedAt, monthStart),
        lte(pipelineStageHistory.changedAt, monthEnd),
        isNull(contacts.deletedAt),
        accessFilter.whereClause
      )
    );

  // Verify for each contact if there are earlier entries (batch check)
  const firstEntryByContact = new Map<string, Date>();
  const contactIdsToCheck = new Set(
    entriesInRange.map((e: { contactId: string; changedAt: Date }) => e.contactId)
  );

  if (contactIdsToCheck.size > 0) {
    const contactsWithEarlierEntries = await db()
      .selectDistinct({ contactId: pipelineStageHistory.contactId })
      .from(pipelineStageHistory)
      .where(
        and(
          eq(pipelineStageHistory.toStage, stageId),
          inArray(pipelineStageHistory.contactId, Array.from(contactIdsToCheck)),
          sql`${pipelineStageHistory.changedAt} < ${monthStart}`
        )
      );

    const contactsWithEarlierEntriesSet = new Set(
      contactsWithEarlierEntries.map((e: { contactId: string }) => e.contactId)
    );

    // Only include contacts that DON'T have earlier entries (first time in the month)
    for (const entry of entriesInRange) {
      if (!contactsWithEarlierEntriesSet.has(entry.contactId)) {
        const contactId = entry.contactId;
        const changedAt =
          entry.changedAt instanceof Date ? entry.changedAt : new Date(entry.changedAt);

        // If already exists, take the MIN (earliest in the month)
        const existing = firstEntryByContact.get(contactId);
        if (!existing || changedAt < existing) {
          firstEntryByContact.set(contactId, changedAt);
        }
      }
    }
  }

  // Also consider contacts created directly in this stage (without history)
  const contactsCreatedInStage = await db()
    .select({
      id: contacts.id,
      createdAt: contacts.createdAt,
    })
    .from(contacts)
    .where(
      and(
        eq(contacts.pipelineStageId, stageId),
        gte(contacts.createdAt, monthStart),
        lte(contacts.createdAt, monthEnd),
        isNull(contacts.deletedAt),
        accessFilter.whereClause
      )
    );

  // Add contacts created directly if they don't have history
  const contactsWithHistory = new Set(firstEntryByContact.keys());
  for (const contact of contactsCreatedInStage) {
    if (!contactsWithHistory.has(contact.id)) {
      const createdAt =
        contact.createdAt instanceof Date ? contact.createdAt : new Date(contact.createdAt);
      firstEntryByContact.set(contact.id, createdAt);
    }
  }

  return firstEntryByContact;
}

/**
 * Check if a date is within the month range
 */
export function isDateInMonthRange(date: Date | string, range: MonthRange): boolean {
  const entryDate = date instanceof Date ? date : new Date(date);
  const entryDateStart = new Date(
    entryDate.getFullYear(),
    entryDate.getMonth(),
    entryDate.getDate()
  );
  const monthStartDate = new Date(
    range.monthStart.getFullYear(),
    range.monthStart.getMonth(),
    range.monthStart.getDate()
  );
  const monthEndDate = new Date(
    range.monthEnd.getFullYear(),
    range.monthEnd.getMonth(),
    range.monthEnd.getDate()
  );

  return entryDateStart >= monthStartDate && entryDateStart <= monthEndDate;
}

/**
 * Create month range from month and year
 */
export function createMonthRange(month: number, year: number): MonthRange {
  return {
    monthStart: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
    monthEnd: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
  };
}
