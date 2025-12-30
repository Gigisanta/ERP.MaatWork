/**
 * Identidad, equipos y configuraciones de usuarios
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * teams
 * Equipos de trabajo. Un `manager_user_id` puede liderar el equipo.
 */
export const teams = pgTable('teams', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  managerUserId: uuid('manager_user_id'),
  calendarUrl: text('calendar_url'), // URL de embed (existente, para compatibilidad)
  calendarId: text('calendar_id'), // Google Calendar ID (nuevo, para API integration)
  meetingRoomCalendarId: text('meeting_room_calendar_id'), // Calendario secundario (Sala de reuniones)
  calendarConnectedAt: timestamp('calendar_connected_at', { withTimezone: true }), // Cuándo se conectó
  calendarConnectedByUserId: uuid('calendar_connected_by_user_id').references(() => users.id), // Manager que conectó
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * users
 * Usuarios del sistema (asesores, managers, admin).
 * role: controla permisos a nivel app/RLS.
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    // AI_DECISION: Add username fields for case-insensitive login
    // Justificación: Permitir autenticación por username y optimizar búsqueda sin funciones
    // Impacto: Nuevas columnas y constraint único parcial para username normalizado
    username: text('username'),
    usernameNormalized: text('username_normalized'),
    fullName: text('full_name').notNull(),
    phone: text('phone'), // Número de teléfono para automatizaciones
    googleId: text('google_id'), // ID de Google (para matching rápido)
    role: text('role').notNull(), // advisor, manager, admin
    passwordHash: text('password_hash'),
    isActive: boolean('is_active').notNull().default(true),
    lastLogin: timestamp('last_login'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => {
    return {
      emailUnique: uniqueIndex('users_email_unique').on(table.email),
      // Unicidad por username normalizado sólo cuando está presente
      usersUsernameNormalizedUnique: uniqueIndex('users_username_normalized_unique')
        .on(table.usernameNormalized)
        .where(sql`${table.usernameNormalized} is not null`),
      usersUsernameNormalizedIdx: index('idx_users_username_normalized')
        .on(table.usernameNormalized)
        .where(sql`${table.usernameNormalized} is not null`),
      roleIdx: index('idx_users_role').on(table.role),
    };
  }
);

/**
 * team_membership
 * Miembros por equipo. `role` define si es miembro o líder.
 */
export const teamMembership = pgTable(
  'team_membership',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: text('role').notNull(), // member, lead
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    teamUserUnique: uniqueIndex('team_membership_unique').on(table.teamId, table.userId),
  })
);

/**
 * team_membership_requests
 * Solicitudes de advisors para unirse a equipos de managers.
 */
export const teamMembershipRequests = pgTable(
  'team_membership_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    managerId: uuid('manager_id')
      .notNull()
      .references(() => users.id),
    status: text('status').notNull().default('pending'), // pending, approved, rejected
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at'),
    resolvedByUserId: uuid('resolved_by_user_id').references(() => users.id),
  },
  (table) => ({
    teamMembershipRequestsUnique: uniqueIndex('team_membership_requests_unique').on(
      table.userId,
      table.managerId
    ),
  })
);

/**
 * advisor_aliases
 * Alias exactos de asesores para matchear valores crudos de CSV AUM.
 * Normalización: trim + lowercase en `aliasNormalized`.
 */
export const advisorAliases = pgTable(
  'advisor_aliases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    aliasRaw: text('alias_raw').notNull(),
    aliasNormalized: text('alias_normalized').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    advisorAliasUnique: uniqueIndex('advisor_aliases_normalized_unique').on(table.aliasNormalized),
    advisorAliasUserIdx: index('idx_advisor_aliases_user').on(table.userId),
  })
);

/**
 * career_plan_levels
 * Niveles del plan de carrera comercial por objetivos.
 * Define los niveles de carrera con objetivos anuales en USD.
 */
export const careerPlanLevels = pgTable(
  'career_plan_levels',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    category: text('category').notNull(), // Ej: "AGENTE F. JUNIOR"
    level: text('level').notNull(), // Ej: "Nivel 1 Junior"
    levelNumber: integer('level_number').notNull(), // Orden numérico (1, 2, 3...)
    index: numeric('index').notNull(), // Índice del nivel
    percentage: numeric('percentage').notNull(), // Porcentaje
    annualGoalUsd: integer('annual_goal_usd').notNull(), // Objetivo anual en USD (sin comas)
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    careerPlanLevelsLevelNumberUnique: uniqueIndex('career_plan_levels_level_number_unique').on(
      table.levelNumber
    ),
    careerPlanLevelsLevelNumberIdx: index('idx_career_plan_levels_level_number').on(
      table.levelNumber
    ),
    careerPlanLevelsIsActiveIdx: index('idx_career_plan_levels_is_active').on(table.isActive),
  })
);
