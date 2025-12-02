/**
 * Auditoría técnica y políticas de alertas
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * audit_logs
 * Auditoría técnica de acciones con contexto.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorUserId: uuid('actor_user_id').notNull().references(() => users.id),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    context: jsonb('context').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    // AI_DECISION: Add indexes for audit log queries
    // Justificación: Audit logs grow large and are frequently queried by user, entity type, and date
    // Impacto: Faster queries for audit logs filtering by actor, entity type, and date ranges
    auditLogsCreatedAtIdx: index('idx_audit_logs_created_at').on(table.createdAt),
    auditLogsActorUserIdIdx: index('idx_audit_logs_actor_user_id').on(table.actorUserId),
    auditLogsEntityTypeIdx: index('idx_audit_logs_entity_type').on(table.entityType),
    auditLogsEntityTypeEntityIdCreatedIdx: index('idx_audit_logs_entity_type_entity_id_created').on(
      table.entityType,
      table.entityId,
      table.createdAt
    )
  })
);

/**
 * alert_policies
 * Políticas configurables de alertas por scope (user/team/global).
 */
export const alertPolicies = pgTable(
  'alert_policies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scope: text('scope').notNull(), // user, team, global
    scopeId: uuid('scope_id'),
    type: text('type').notNull(), // saldo_liquido, desvio_cartera, inactividad
    params: jsonb('params').notNull().default(sql`'{}'::jsonb`),
    enabled: boolean('enabled').notNull().default(true)
  },
  (table) => ({
    alertPoliciesUnique: uniqueIndex('alert_policies_unique').on(
      table.scope,
      // COALESCE(scope_id::text, 'global') equivalente como expresión
      sql`COALESCE(${table.scopeId}::text, 'global')`,
      table.type
    )
  })
);


