/**
 * Market Type Conversion Calculator
 *
 * Calculates contacts vs clients by market type (natural/referido/frio)
 * Includes breakdown by cold market subtypes (redes_sociales, llamado_frio)
 *
 * AI_DECISION: Separar la lógica de conversión por tipo de mercado en su propio calculador
 * Justificación: Sigue el patrón de business-line-closures.ts, permitiendo evolución independiente
 * Impacto: Métrica nueva que permite analizar eficiencia de conversión por fuente de mercado
 */

import { db, contacts, pipelineStageHistory } from '@cactus/db';
import { and, eq, isNull, sql, gte, lte, or, like } from 'drizzle-orm';
import type { AccessFilter, MonthRange, MarketTypeConversion, ColdMarketBreakdown } from '../types';

/**
 * Main market types
 * - natural: Natural market (existing relationships)
 * - referido: Referrals
 * - frio: Cold market (no prior relationship)
 */
export const MARKET_TYPES = ['natural', 'referido', 'frio'] as const;
export type MarketType = (typeof MARKET_TYPES)[number];

/**
 * Cold market subtypes (stored as "frio:subtype")
 */
export const COLD_MARKET_SUBTYPES = ['redes_sociales', 'llamado_frio'] as const;
export type ColdMarketSubtype = (typeof COLD_MARKET_SUBTYPES)[number];

/**
 * Helper to parse source and extract main type
 * "natural" -> "natural"
 * "frio:redes_sociales" -> "frio"
 */
function getMainMarketType(source: string | null): string | null {
  if (!source) return null;
  return source.split(':')[0];
}

/**
 * Helper to extract cold market subtype
 * "frio:redes_sociales" -> "redes_sociales"
 * "frio" -> null
 */
function getColdMarketSubtype(source: string | null): string | null {
  if (!source || !source.startsWith('frio:')) return null;
  return source.split(':')[1] || null;
}

/**
 * Calculate contacts vs clients by market type
 *
 * @param range - Month date range for filtering
 * @param accessFilter - Access control filter
 * @param clienteStageId - ID of the "Cliente" pipeline stage
 * @param contactadoStageId - ID of the "Contactado" pipeline stage (first contact stage)
 */
export async function calculateMarketTypeConversion(
  range: MonthRange,
  accessFilter: AccessFilter,
  clienteStageId: string,
  contactadoStageId: string
): Promise<MarketTypeConversion> {
  const { monthStart, monthEnd } = range;

  // Initialize results
  const result: MarketTypeConversion = {
    natural: {
      contacts: 0,
      clients: 0,
      conversionRate: 0,
    },
    referido: {
      contacts: 0,
      clients: 0,
      conversionRate: 0,
    },
    frio: {
      contacts: 0,
      clients: 0,
      conversionRate: 0,
      breakdown: {
        redesSociales: { contacts: 0, clients: 0, conversionRate: 0 },
        llamadoFrio: { contacts: 0, clients: 0, conversionRate: 0 },
      },
    },
  };

  // Get all contacts created in the month
  // Use LIKE to match "frio%" for all cold market subtypes
  const newContacts = await db()
    .select({
      source: contacts.source,
    })
    .from(contacts)
    .where(
      and(
        gte(contacts.createdAt, monthStart),
        lte(contacts.createdAt, monthEnd),
        isNull(contacts.deletedAt),
        or(
          eq(contacts.source, 'natural'),
          eq(contacts.source, 'referido'),
          like(contacts.source, 'frio%')
        ),
        accessFilter.whereClause
      )
    );

  // Count contacts by type
  for (const row of newContacts) {
    const mainType = getMainMarketType(row.source);
    const subType = getColdMarketSubtype(row.source);

    if (mainType === 'natural') {
      result.natural.contacts++;
    } else if (mainType === 'referido') {
      result.referido.contacts++;
    } else if (mainType === 'frio') {
      result.frio.contacts++;
      if (subType === 'redes_sociales') {
        result.frio.breakdown.redesSociales.contacts++;
      } else if (subType === 'llamado_frio') {
        result.frio.breakdown.llamadoFrio.contacts++;
      }
    }
  }

  // Get contacts that became clients in the month (first time) by market type
  const clientsInMonth = await db()
    .select({
      contactId: pipelineStageHistory.contactId,
      source: contacts.source,
      changedAt: pipelineStageHistory.changedAt,
    })
    .from(pipelineStageHistory)
    .innerJoin(contacts, eq(pipelineStageHistory.contactId, contacts.id))
    .where(
      and(
        eq(pipelineStageHistory.toStage, clienteStageId),
        gte(pipelineStageHistory.changedAt, monthStart),
        lte(pipelineStageHistory.changedAt, monthEnd),
        isNull(contacts.deletedAt),
        or(
          eq(contacts.source, 'natural'),
          eq(contacts.source, 'referido'),
          like(contacts.source, 'frio%')
        ),
        accessFilter.whereClause
      )
    );

  // Filter to only first-time clients (no earlier entries to Cliente stage)
  const contactIds = [...new Set(clientsInMonth.map((c: { contactId: string }) => c.contactId))];

  if (contactIds.length > 0) {
    // Check for contacts that already entered Cliente before this month
    const contactsWithEarlierClientEntry = await db()
      .selectDistinct({ contactId: pipelineStageHistory.contactId })
      .from(pipelineStageHistory)
      .where(
        and(
          eq(pipelineStageHistory.toStage, clienteStageId),
          sql`${pipelineStageHistory.contactId} IN (${sql.join(
            contactIds.map((id) => sql`${id}`),
            sql`, `
          )})`,
          sql`${pipelineStageHistory.changedAt} < ${monthStart}`
        )
      );

    const contactsWithEarlierEntriesSet = new Set(
      contactsWithEarlierClientEntry.map((e: { contactId: string }) => e.contactId)
    );

    // Count unique first-time clients by market type
    const processedContacts = new Set<string>();

    for (const client of clientsInMonth) {
      if (
        !contactsWithEarlierEntriesSet.has(client.contactId) &&
        client.source &&
        !processedContacts.has(client.contactId)
      ) {
        processedContacts.add(client.contactId);

        const mainType = getMainMarketType(client.source);
        const subType = getColdMarketSubtype(client.source);

        if (mainType === 'natural') {
          result.natural.clients++;
        } else if (mainType === 'referido') {
          result.referido.clients++;
        } else if (mainType === 'frio') {
          result.frio.clients++;
          if (subType === 'redes_sociales') {
            result.frio.breakdown.redesSociales.clients++;
          } else if (subType === 'llamado_frio') {
            result.frio.breakdown.llamadoFrio.clients++;
          }
        }
      }
    }
  }

  // Calculate conversion rates
  const calcRate = (clients: number, contacts: number) =>
    contacts > 0 ? Math.round((clients / contacts) * 100 * 10) / 10 : 0;

  result.natural.conversionRate = calcRate(result.natural.clients, result.natural.contacts);
  result.referido.conversionRate = calcRate(result.referido.clients, result.referido.contacts);
  result.frio.conversionRate = calcRate(result.frio.clients, result.frio.contacts);
  result.frio.breakdown.redesSociales.conversionRate = calcRate(
    result.frio.breakdown.redesSociales.clients,
    result.frio.breakdown.redesSociales.contacts
  );
  result.frio.breakdown.llamadoFrio.conversionRate = calcRate(
    result.frio.breakdown.llamadoFrio.clients,
    result.frio.breakdown.llamadoFrio.contacts
  );

  return result;
}
