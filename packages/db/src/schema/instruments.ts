/**
 * Instrumentos financieros y alias
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  numeric,
  jsonb,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { lookupAssetClass } from './lookups';

/**
 * instruments
 * Universo de instrumentos con metadatos y códigos externos.
 */
export const instruments = pgTable(
  'instruments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    symbol: text('symbol').notNull(),
    name: text('name').notNull(),
    assetClass: text('asset_class').notNull().references(() => lookupAssetClass.id),
    currency: text('currency').notNull(),
    isin: text('isin'),
    externalCodes: jsonb('external_codes').notNull().default(sql`'{}'::jsonb`),
    maturityDate: date('maturity_date'),
    couponRate: numeric('coupon_rate', { precision: 9, scale: 6 }),
    riskRating: text('risk_rating'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    instrumentSymbolUnique: uniqueIndex('instruments_symbol_unique').on(table.symbol)
  })
);

/**
 * instrument_aliases
 * Códigos alternativos por broker para mapeo/conciliación.
 */
export const instrumentAliases = pgTable(
  'instrument_aliases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    instrumentId: uuid('instrument_id').notNull().references(() => instruments.id, { onDelete: 'cascade' }),
    broker: text('broker').notNull(), // balanz
    code: text('code').notNull()
  },
  (table) => ({
    instrumentAliasUnique: uniqueIndex('instrument_aliases_unique').on(
      table.instrumentId,
      table.broker,
      table.code
    )
  })
);






































