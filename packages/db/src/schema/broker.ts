/**
 * Integración Broker: cuentas, saldos, posiciones, transacciones
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  integer,
  numeric,
  jsonb,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { contacts } from './contacts';
import { instruments } from './instruments';

/**
 * integration_accounts
 * Configuraciones/credenciales (enmascaradas) para integraciones (Balanz).
 */
export const integrationAccounts = pgTable('integration_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  broker: text('broker').notNull(), // balanz
  maskedUsername: text('masked_username').notNull(),
  authType: text('auth_type').notNull(), // password, otp, token, cookies
  config: jsonb('config').notNull().default(sql`'{}'::jsonb`),
  status: text('status').notNull(), // active, disabled
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

/**
 * integration_jobs
 * Jobs programados (cron) para descargas/procesos de integración.
 */
export const integrationJobs = pgTable('integration_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: text('type').notNull(), // download_reports, movimientos, saldos, posiciones
  scheduleCron: text('schedule_cron').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id)
});

/**
 * integration_runs
 * Ejecuciones de jobs con estado, tiempos y estadísticas.
 */
export const integrationRuns = pgTable(
  'integration_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: uuid('job_id').notNull().references(() => integrationJobs.id),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    status: text('status').notNull(), // success, warning, failed
    error: text('error'),
    stats: jsonb('stats').notNull().default(sql`'{}'::jsonb`)
  },
  (table) => ({
    integrationRunsJobIdx: index('idx_integration_runs_job').on(table.jobId, table.startedAt)
  })
);

/**
 * integration_files
 * Archivos descargados por run con metadatos.
 */
export const integrationFiles = pgTable('integration_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id').notNull().references(() => integrationRuns.id, { onDelete: 'cascade' }),
  fileType: text('file_type').notNull(),
  path: text('path').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  checksum: text('checksum'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

/**
 * broker_accounts
 * Cuentas en broker por contacto. Unicidad por (broker, account_number).
 */
export const brokerAccounts = pgTable(
  'broker_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    broker: text('broker').notNull(), // balanz
    accountNumber: text('account_number').notNull(),
    holderName: text('holder_name'),
    contactId: uuid('contact_id').notNull().references(() => contacts.id),
    status: text('status').notNull(), // active, closed
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    brokerAccountUnique: uniqueIndex('broker_accounts_unique').on(table.broker, table.accountNumber),
    // AI_DECISION: Add index for contact + status + deletedAt queries
    // Justificación: Contact detail page carga broker accounts filtradas por contacto
    // Impacto: Faster broker accounts loading in contact detail page
    brokerAccountsContactStatusIdx: index('idx_broker_accounts_contact_status').on(
      table.contactId,
      table.status,
      table.deletedAt
    )
  })
);

/**
 * broker_balances
 * Saldos históricos por cuenta/fecha/moneda. Usado para MV de saldos actuales.
 */
export const brokerBalances = pgTable(
  'broker_balances',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    brokerAccountId: uuid('broker_account_id').notNull().references(() => brokerAccounts.id, { onDelete: 'cascade' }),
    asOfDate: date('as_of_date').notNull(),
    currency: text('currency').notNull(),
    liquidBalance: numeric('liquid_balance', { precision: 18, scale: 6 }).notNull(),
    totalBalance: numeric('total_balance', { precision: 18, scale: 6 }).notNull()
  },
  (table) => ({
    brokerBalancesUnique: uniqueIndex('broker_balances_unique').on(
      table.brokerAccountId,
      table.asOfDate,
      table.currency
    ),
    brokerBalancesLatestIdx: index('idx_broker_balances_latest').on(table.brokerAccountId, table.asOfDate)
  })
);

/**
 * broker_transactions
 * Transacciones históricas. Base para validaciones, reportes y alertas.
 */
export const brokerTransactions = pgTable(
  'broker_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    brokerAccountId: uuid('broker_account_id').notNull().references(() => brokerAccounts.id, { onDelete: 'cascade' }),
    tradeDate: date('trade_date').notNull(),
    settleDate: date('settle_date'),
    type: text('type').notNull(), // buy, sell, coupon, dividend, transfer_in, transfer_out, deposit, withdrawal, fee, interest
    instrumentId: uuid('instrument_id').references(() => instruments.id),
    quantity: numeric('quantity', { precision: 28, scale: 8 }),
    price: numeric('price', { precision: 18, scale: 6 }),
    grossAmount: numeric('gross_amount', { precision: 18, scale: 6 }),
    fees: numeric('fees', { precision: 18, scale: 6 }),
    netAmount: numeric('net_amount', { precision: 18, scale: 6 }),
    reference: text('reference'),
    externalRef: text('external_ref'),
    rawRef: jsonb('raw_ref'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    btxAccountSettleIdx: index('idx_btx_account_settle').on(table.brokerAccountId, table.settleDate),
    btxAccountTradeIdx: index('idx_btx_account_trade').on(table.brokerAccountId, table.tradeDate),
    btxTypeTradeIdx: index('idx_btx_type_trade').on(table.type, table.tradeDate),
    // AI_DECISION: Add composite index for transaction history queries
    // Justificación: Queries de historial filtran por cuenta, ordenan por fecha DESC y filtran por tipo
    // Impacto: Faster transaction history loading with proper ordering and filtering
    btxAccountTradeTypeIdx: index('idx_btx_account_trade_type').on(
      table.brokerAccountId,
      table.tradeDate,
      table.type
    ),
    // AI_DECISION: Add composite index optimized for DESC ordering with type filter
    // Justificación: Queries frecuentes filtran por cuenta, tipo y ordenan por trade_date DESC
    // Impacto: Faster transaction queries with DESC ordering and type filtering
    btxAccountTypeTradeDescIdx: index('idx_btx_account_type_trade_desc').on(
      table.brokerAccountId,
      table.type,
      table.tradeDate
    )
  })
);

/**
 * broker_positions
 * Posiciones por fecha. Fuente para monitoreo de desvíos vs cartera target.
 */
export const brokerPositions = pgTable(
  'broker_positions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    brokerAccountId: uuid('broker_account_id').notNull().references(() => brokerAccounts.id, { onDelete: 'cascade' }),
    asOfDate: date('as_of_date').notNull(),
    instrumentId: uuid('instrument_id').notNull().references(() => instruments.id),
    quantity: numeric('quantity', { precision: 28, scale: 8 }).notNull(),
    avgPrice: numeric('avg_price', { precision: 18, scale: 6 }),
    marketValue: numeric('market_value', { precision: 18, scale: 6 })
  },
  (table) => ({
    brokerPositionsUnique: uniqueIndex('broker_positions_unique').on(
      table.brokerAccountId,
      table.asOfDate,
      table.instrumentId
    ),
    brokerPositionsLatestIdx: index('idx_bpos_latest').on(table.brokerAccountId, table.asOfDate),
    // AI_DECISION: Add composite index optimized for DESC ordering with instrument filter
    // Justificación: Queries frecuentes filtran por cuenta, instrumento y ordenan por fecha DESC
    // Impacto: Faster position queries with DESC ordering and instrument filtering
    brokerPositionsAccountInstrumentDateIdx: index('idx_bpos_account_instrument_date').on(
      table.brokerAccountId,
      table.instrumentId,
      table.asOfDate
    )
  })
);

