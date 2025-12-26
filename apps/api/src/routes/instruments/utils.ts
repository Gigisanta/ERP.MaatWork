/**
 * Utilidades para Instruments
 */

import { db } from '@maatwork/db';
import { instruments } from '@maatwork/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { ExternalCodes } from '../../types/python-service';

// URL del microservicio Python
export const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:3002';

/**
 * Buscar instrumentos en base de datos como fallback
 */
export async function searchInstrumentsInDB(query: string, maxResults: number) {
  const queryUpper = query.toUpperCase().trim();
  const queryPattern = `%${queryUpper}%`;

  const results = await db()
    .select({
      symbol: instruments.symbol,
      name: instruments.name,
      shortName: instruments.name,
      currency: instruments.currency,
      assetClass: instruments.assetClass,
      externalCodes: instruments.externalCodes,
      type: sql<string>`CASE 
        WHEN ${instruments.assetClass} = 'equity' THEN 'EQUITY'
        WHEN ${instruments.assetClass} = 'bond' THEN 'BOND'
        WHEN ${instruments.assetClass} = 'etf' THEN 'ETF'
        ELSE 'EQUITY'
      END`,
      sector: sql<string | null>`NULL`,
      industry: sql<string | null>`NULL`,
    })
    .from(instruments)
    .where(
      and(
        eq(instruments.active, true),
        sql`(
          ${instruments.symbol} ILIKE ${queryPattern} 
          OR ${instruments.name} ILIKE ${queryPattern}
          OR ${instruments.symbol} ILIKE ${`${queryUpper}%`}
        )`
      )
    )
    .orderBy(
      sql`CASE 
        WHEN ${instruments.symbol} ILIKE ${`${queryUpper}%`} THEN 1
        WHEN ${instruments.symbol} ILIKE ${queryPattern} THEN 2
        ELSE 3
      END`
    )
    .limit(maxResults);

  return results.map(
    (instrument: {
      symbol: string;
      name: string | null;
      shortName: string | null;
      currency: string | null;
      assetClass: string | null;
      externalCodes: unknown;
      type: string;
      sector: string | null;
      industry: string | null;
    }) => {
      const externalCodes = instrument.externalCodes as ExternalCodes | null;
      const exchange = externalCodes?.exchange || 'Unknown';

      return {
        symbol: instrument.symbol,
        name: instrument.name,
        shortName: instrument.shortName,
        currency: instrument.currency,
        exchange: exchange,
        type: instrument.type,
        sector: instrument.sector,
        industry: instrument.industry,
      };
    }
  );
}

export type DBInstrumentSearchResult = {
  symbol: string;
  name: string | null;
  shortName: string | null;
  currency: string | null;
  exchange: string;
  type: string;
  sector: string | null;
  industry: string | null;
};








