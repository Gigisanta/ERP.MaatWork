/**
 * Reportes, métricas y eventos de actividad
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
import { users, teams } from './users';
import { contacts } from './contacts';

/**
 * scheduled_reports
 * Programación de reportes (diarios/semanales) por usuario/owner.
 */
export const scheduledReports = pgTable(
  'scheduled_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    type: text('type').notNull(), // daily_advisor, daily_manager, weekly_manager
    scheduleCron: text('schedule_cron').notNull(),
    timezone: text('timezone').notNull().default('America/Argentina/Buenos_Aires'),
    nextRunAt: timestamp('next_run_at', { withTimezone: true }),
    lastRunAt: timestamp('last_run_at', { withTimezone: true }),
    ownerUserId: uuid('owner_user_id').notNull().references(() => users.id),
    targets: jsonb('targets').notNull().default(sql`'{}'::jsonb`),
    params: jsonb('params').notNull().default(sql`'{}'::jsonb`),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    schedReportsNextIdx: index('idx_sched_reports_next').on(table.enabled, table.nextRunAt)
  })
);

/**
 * report_runs
 * Ejecuciones de reportes con estado y resumen de entrega.
 */
export const reportRuns = pgTable('report_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  scheduledReportId: uuid('scheduled_report_id').notNull().references(() => scheduledReports.id, { onDelete: 'cascade' }),
  runAt: timestamp('run_at', { withTimezone: true }).notNull().defaultNow(),
  status: text('status').notNull(), // success, failed
  deliverySummary: jsonb('delivery_summary').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

/**
 * activity_events
 * Eventos de actividad para métricas y auditoría funcional.
 */
export const activityEvents = pgTable(
  'activity_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id),
    advisorUserId: uuid('advisor_user_id').references(() => users.id),
    contactId: uuid('contact_id').references(() => contacts.id),
    type: text('type').notNull(), // note_created, meeting_added, task_completed, login, download, portfolio_alert
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull()
  },
  (table) => ({
    activityByUserIdx: index('idx_activity_by_user').on(table.userId, table.occurredAt),
    activityByAdvisorIdx: index('idx_activity_by_advisor').on(table.advisorUserId, table.occurredAt),
    // AI_DECISION: Add composite index for dashboard queries filtering by user and type
    // Justificación: Dashboard queries filter by user_id, type and order by occurred_at DESC
    // Impacto: Faster activity dashboard loading with proper filtering and ordering
    activityUserTypeOccurredIdx: index('idx_activity_user_type_occurred').on(
      table.userId,
      table.type,
      table.occurredAt
    )
  })
);

/**
 * daily_metrics_user
 * Métricas agregadas por usuario/día para dashboards.
 */
export const dailyMetricsUser = pgTable(
  'daily_metrics_user',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id),
    teamId: uuid('team_id').references(() => teams.id),
    date: date('date').notNull(),
    numNewProspects: integer('num_new_prospects').notNull().default(0),
    numContactsTouched: integer('num_contacts_touched').notNull().default(0),
    numNotes: integer('num_notes').notNull().default(0),
    numTasksCompleted: integer('num_tasks_completed').notNull().default(0),
    aumTotal: numeric('aum_total', { precision: 18, scale: 6 }).notNull().default(sql`0`),
    liquidBalanceTotal: numeric('liquid_balance_total', { precision: 18, scale: 6 }).notNull().default(sql`0`),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    dailyMetricsUserUnique: uniqueIndex('daily_metrics_user_unique').on(table.userId, table.date),
    // AI_DECISION: Add index for queries ordered by date DESC
    // Justificación: Dashboard carga métricas ordenadas por fecha DESC
    // Impacto: Faster metrics dashboard loading with proper ordering
    dailyMetricsUserDateIdx: index('idx_daily_metrics_user_date').on(table.userId, table.date)
  })
);

/**
 * monthly_goals
 * Objetivos mensuales globales para métricas del pipeline.
 */
export const monthlyGoals = pgTable(
  'monthly_goals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    month: integer('month').notNull(), // 1-12
    year: integer('year').notNull(),
    newProspectsGoal: integer('new_prospects_goal').notNull().default(0),
    firstMeetingsGoal: integer('first_meetings_goal').notNull().default(0),
    secondMeetingsGoal: integer('second_meetings_goal').notNull().default(0),
    newClientsGoal: integer('new_clients_goal').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    monthlyGoalsUnique: uniqueIndex('monthly_goals_unique').on(table.month, table.year)
  })
);

/**
 * aum_snapshots
 * AUM histórico por cliente; base para reportes temporales.
 */
export const aumSnapshots = pgTable(
  'aum_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contactId: uuid('contact_id').notNull().references(() => contacts.id),
    date: date('date').notNull(),
    aumTotal: numeric('aum_total', { precision: 18, scale: 6 }).notNull()
  },
  (table) => ({
    aumSnapshotsUnique: uniqueIndex('aum_snapshots_unique').on(table.contactId, table.date),
    // AI_DECISION: Add composite index for aggregations by contact ordered by date DESC
    // Justificación: Analytics queries agregan AUM por contacto ordenado por fecha DESC
    // Impacto: Faster AUM analytics queries with proper ordering
    aumSnapshotsContactDateIdx: index('idx_aum_snapshots_contact_date').on(table.contactId, table.date),
    // AI_DECISION: Add index on date for daily analytics aggregation
    // Justificación: Optimiza queries que agregan AUM por fecha (team analytics)
    // Impacto: Avoids seq scan on large aum_snapshots table for date-based queries
    aumSnapshotsDateIdx: index('idx_aum_snapshots_date').on(table.date)
  })
);

















































