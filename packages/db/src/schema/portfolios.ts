/**
 * Carteras: plantillas, asignaciones, overrides y monitoreo
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  numeric,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { contacts } from './contacts';
import { instruments } from './instruments';
import { lookupAssetClass } from './lookups';

/**
 * portfolios
 * Tabla unificada para carteras.
 * Carteras simples que pueden asignarse a contactos para gestión en masa.
 */
export const portfolios = pgTable('portfolios', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').unique(), // Identificador único (ej: 'AGG_CONSERVATIVE')
  name: text('name').notNull(),
  description: text('description'),
  createdByUserId: uuid('created_by_user_id')
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  portfolioCodeIdx: index('idx_portfolio_code').on(table.code),
  portfolioDeletedAtIdx: index('idx_portfolio_deleted_at').on(table.deletedAt),
}));


/**
 * portfolio_lines
 * Composición objetivo por clase de activo o instrumento.
 * Reemplaza portfolio_template_lines y benchmark_components.
 */
export const portfolioLines = pgTable(
  'portfolio_lines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    portfolioId: uuid('portfolio_id')
      .notNull()
      .references(() => portfolios.id, { onDelete: 'cascade' }),
    targetType: text('target_type').notNull(), // asset_class, instrument
    assetClass: text('asset_class').references(() => lookupAssetClass.id),
    instrumentId: uuid('instrument_id').references(() => instruments.id),
    targetWeight: numeric('target_weight', { precision: 7, scale: 4 }).notNull(),
  },
  (table) => ({
    targetWeightCheck: check(
      'chk_ptl_weight',
      sql`${table.targetWeight} >= 0 and ${table.targetWeight} <= 1`
    ),
    // AI_DECISION: Add composite index for portfolio line queries
    // Justificación: Queries load all lines for a template and sort by weight. Composite index speeds up sorting.
    // Impacto: Faster portfolio composition loading
    portfolioLinesPortfolioWeightIdx: index('idx_portfolio_lines_portfolio_weight').on(
      table.portfolioId,
      table.targetWeight
    ),
  })
);

/**
 * client_portfolio_assignments
 * Asignaciones de plantillas a clientes, con estado y vigencia.
 */
export const clientPortfolioAssignments = pgTable(
  'client_portfolio_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id),
    portfolioId: uuid('portfolio_id')
      .notNull()
      .references(() => portfolios.id),
    status: text('status').notNull(), // active, paused, ended
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    notes: text('notes'),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    cpaUnique: uniqueIndex('client_portfolio_assignments_unique').on(
      table.contactId,
      table.portfolioId,
      table.startDate
    ),
    cpaActiveIdx: index('idx_cpa_active')
      .on(table.contactId)
      .where(sql`${table.status} = 'active'`),
    // AI_DECISION: Índice compuesto para conteos de portfolios por contacto y estado
    // Justificación: Dashboard queries filtran portfolios activos por contacto
    // Impacto: Faster dashboard portfolio counts
    cpaContactStatusIdx: index('idx_client_portfolio_assignments_contact_status').on(
      table.contactId,
      table.status
    ),
  })
);

/**
 * client_portfolio_overrides
 * Overrides por cliente/asignación a nivel clase o instrumento.
 */
export const clientPortfolioOverrides = pgTable('client_portfolio_overrides', {
  id: uuid('id').defaultRandom().primaryKey(),
  assignmentId: uuid('assignment_id')
    .notNull()
    .references(() => clientPortfolioAssignments.id, { onDelete: 'cascade' }),
  targetType: text('target_type').notNull(),
  assetClass: text('asset_class').references(() => lookupAssetClass.id),
  instrumentId: uuid('instrument_id').references(() => instruments.id),
  targetWeight: numeric('target_weight', { precision: 7, scale: 4 }).notNull(),
});

/**
 * portfolio_monitoring_snapshot
 * Snapshots diarios por cliente de desvíos totales.
 */
export const portfolioMonitoringSnapshot = pgTable(
  'portfolio_monitoring_snapshot',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id),
    asOfDate: date('as_of_date').notNull(),
    totalDeviationPct: numeric('total_deviation_pct', { precision: 7, scale: 4 }).notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pmsContactDateIdx: index('idx_pms_contact_date').on(table.contactId, table.asOfDate),
  })
);

/**
 * portfolio_monitoring_details
 * Detalle de desvíos por asset/instrumento para un snapshot.
 */
export const portfolioMonitoringDetails = pgTable('portfolio_monitoring_details', {
  id: uuid('id').defaultRandom().primaryKey(),
  snapshotId: uuid('snapshot_id')
    .notNull()
    .references(() => portfolioMonitoringSnapshot.id, { onDelete: 'cascade' }),
  targetType: text('target_type').notNull(),
  assetClass: text('asset_class').references(() => lookupAssetClass.id),
  instrumentId: uuid('instrument_id').references(() => instruments.id),
  targetWeight: numeric('target_weight', { precision: 7, scale: 4 }).notNull(),
  actualWeight: numeric('actual_weight', { precision: 7, scale: 4 }).notNull(),
  deviationPct: numeric('deviation_pct', { precision: 7, scale: 4 }).notNull(),
});
