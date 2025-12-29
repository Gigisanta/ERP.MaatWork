/**
 * Market Type Conversion Calculator (Batch Version)
 */

import type { MarketTypeConversion, MonthRange } from '../types';

/**
 * Helper to parse source and extract main type
 */
function getMainMarketType(source: string | null): string | null {
  if (!source) return null;
  return source.split(':')[0];
}

/**
 * Helper to extract cold market subtype
 */
function getColdMarketSubtype(source: string | null): string | null {
  if (!source || !source.startsWith('frio:')) return null;
  return source.split(':')[1] || null;
}

/**
 * Batch version of market type conversion calculation
 */
export function calculateMarketTypeConversionFromData(
  contactsMap: Map<string, { createdAt: Date; source: string | null }>,
  historyByContact: Map<string, { toStage: string; changedAt: Date }[]>,
  clienteStageId: string,
  range: MonthRange
): MarketTypeConversion {
  const { monthStart, monthEnd } = range;

  const result: MarketTypeConversion = {
    natural: { contacts: 0, clients: 0, conversionRate: 0 },
    referido: { contacts: 0, clients: 0, conversionRate: 0 },
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

  // 1. Count contacts created in month
  contactsMap.forEach((data) => {
    if (data.createdAt >= monthStart && data.createdAt <= monthEnd) {
      const mainType = getMainMarketType(data.source);
      const subType = getColdMarketSubtype(data.source);

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
  });

  // 2. Count contacts that became clients in the month (first time)
  historyByContact.forEach((history, contactId) => {
    const sortedHistory = [...history].sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime());
    const firstClientEntry = sortedHistory.find(h => h.toStage === clienteStageId);
    
    // Check if the FIRST entry to Cliente happened in this month
    if (firstClientEntry && firstClientEntry.changedAt >= monthStart && firstClientEntry.changedAt <= monthEnd) {
      const contactData = contactsMap.get(contactId);
      if (contactData && contactData.source) {
        const mainType = getMainMarketType(contactData.source);
        const subType = getColdMarketSubtype(contactData.source);

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
  });

  // 3. Calculate conversion rates
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




