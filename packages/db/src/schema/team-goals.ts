/**
 * Metas y objetivos específicos por equipo
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { teams } from './users';

/**
 * team_goals
 * Metas mensuales específicas para un equipo.
 */
export const teamGoals = pgTable(
  'team_goals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    teamId: uuid('team_id').notNull().references(() => teams.id),
    month: integer('month').notNull(), // 1-12
    year: integer('year').notNull(),
    type: text('type').notNull(), // new_aum, new_clients, meetings, revenue, etc.
    targetValue: numeric('target_value', { precision: 18, scale: 2 }).notNull().default('0'),
    currentValue: numeric('current_value', { precision: 18, scale: 2 }).default('0'), // Cache del valor actual
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    teamGoalsUnique: uniqueIndex('team_goals_unique').on(
      table.teamId,
      table.month,
      table.year,
      table.type
    ),
    teamGoalsTeamIdx: index('idx_team_goals_team').on(table.teamId),
    teamGoalsDateIdx: index('idx_team_goals_date').on(table.year, table.month)
  })
);

