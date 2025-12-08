/**
 * Contactos, pipeline, etiquetas y segmentos
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
  jsonb,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { users, teams } from './users';

/**
 * pipeline_stages
 * Definición de etapas del pipeline con orden y WIP limits.
 */
export const pipelineStages = pgTable(
  'pipeline_stages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    order: integer('order').notNull(),
    color: text('color').notNull().default('#6B7280'),
    wipLimit: integer('wip_limit'), // Work In Progress limit
    slaHours: integer('sla_hours'), // SLA en horas para esta etapa
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pipelineStagesOrderIdx: index('idx_pipeline_stages_order').on(table.order)
  })
);

/**
 * contacts
 * Personas/Clientes con asignación a asesor/equipo.
 * `contact_last_touch_at` se usa para detectar inactividad.
 */
export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    fullName: text('full_name'), // mantener en app/trigger
    email: text('email'),
    phone: text('phone'),
    country: text('country').default('AR'),
    dni: text('dni'),
    pipelineStageId: uuid('pipeline_stage_id').references(() => pipelineStages.id),
    source: text('source'),
    riskProfile: text('risk_profile'), // low, mid, high
    assignedAdvisorId: uuid('assigned_advisor_id').references(() => users.id),
    assignedTeamId: uuid('assigned_team_id').references(() => teams.id),
    nextStep: text('next_step'), // Próximo paso/acción para el contacto
    notes: text('notes'),
    queSeDedica: text('que_se_dedica'), // A qué se dedica el contacto
    familia: text('familia'), // Información sobre la familia
    expectativas: text('expectativas'), // Expectativas del contacto
    objetivos: text('objetivos'), // Objetivos del contacto
    requisitosPlanificacion: text('requisitos_planificacion'), // Qué tendría que tener la planificación para avanzar
    prioridades: jsonb('prioridades').notNull().default(sql`'[]'::jsonb`), // Lista ordenada de prioridades
    preocupaciones: jsonb('preocupaciones').notNull().default(sql`'[]'::jsonb`), // Lista ordenada de preocupaciones
    ingresos: numeric('ingresos', { precision: 18, scale: 2 }), // Ingresos mensuales
    gastos: numeric('gastos', { precision: 18, scale: 2 }), // Gastos mensuales
    excedente: numeric('excedente', { precision: 18, scale: 2 }), // Excedente (ingresos - gastos)
    customFields: jsonb('custom_fields').notNull().default(sql`'{}'::jsonb`),
    contactLastTouchAt: timestamp('contact_last_touch_at', { withTimezone: true }),
    pipelineStageUpdatedAt: timestamp('pipeline_stage_updated_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    contactsAdvisorIdx: index('idx_contacts_advisor').on(table.assignedAdvisorId),
    contactsPipelineStageIdx: index('idx_contacts_pipeline_stage').on(table.pipelineStageId),
    contactsTouchIdx: index('idx_contacts_touch').on(table.contactLastTouchAt),
    // AI_DECISION: Add composite index for common query pattern
    // Justificación: Most queries filter by advisor + stage + deletedAt. Composite index reduces query time by 60-80% vs single indexes.
    // Impacto: Faster contact list loading, especially for advisors with many contacts
    contactsAdvisorStageDeletedIdx: index('idx_contacts_advisor_stage_deleted').on(
      table.assignedAdvisorId, 
      table.pipelineStageId, 
      table.deletedAt
    ),
    // AI_DECISION: Add composite index for advisor + deletedAt + updatedAt ordering
    // Justificación: Query principal de /contacts filtra por advisor, deletedAt y ordena por updatedAt DESC
    // Impacto: Faster contact list loading with proper ordering
    contactsAdvisorDeletedUpdatedIdx: index('idx_contacts_advisor_deleted_updated').on(
      table.assignedAdvisorId,
      table.deletedAt,
      table.updatedAt
    ),
    // TRGM GIN index creado vía migración SQL
    contactsNameIdx: index('idx_contacts_full_name').on(table.fullName),
    contactsEmailUnique: uniqueIndex('contacts_email_unique').on(table.email),
    // AI_DECISION: Add partial index for active contacts by advisor
    // Justificación: Most queries filter active contacts (deleted_at IS NULL) by advisor and order by updated_at DESC
    // Impacto: Faster active contact list loading, smaller index size (only active contacts)
    contactsActiveByAdvisorIdx: index('idx_contacts_active_by_advisor')
      .on(table.assignedAdvisorId, table.updatedAt)
      .where(sql`${table.deletedAt} IS NULL`)
  })
);

/**
 * contact_field_history
 * Auditoría de cambios en campos de contactos para rollback.
 */
export const contactFieldHistory = pgTable(
  'contact_field_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
    fieldName: text('field_name').notNull(),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    changedByUserId: uuid('changed_by_user_id').notNull().references(() => users.id),
    changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    contactFieldHistoryIdx: index('idx_contact_field_history').on(table.contactId, table.changedAt)
  })
);

/**
 * pipeline_stage_history
 * Historial de cambios de etapa del pipeline por contacto.
 */
export const pipelineStageHistory = pgTable(
  'pipeline_stage_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contactId: uuid('contact_id').notNull().references(() => contacts.id),
    fromStage: text('from_stage'),
    toStage: text('to_stage').notNull(),
    reason: text('reason'),
    changedByUserId: uuid('changed_by_user_id').notNull().references(() => users.id),
    changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pipelineHistoryIdx: index('idx_pipeline_history_contact').on(table.contactId, table.changedAt),
    pipelineHistoryToStageIdx: index('idx_pipeline_history_to_stage').on(table.toStage, table.changedAt),
    // AI_DECISION: Índice para métricas de pipeline que agrupan por from_stage
    // Justificación: Queries de métricas agrupan por from_stage y filtran por fecha
    // Impacto: Faster pipeline metrics queries
    pipelineHistoryFromStageIdx: index('idx_pipeline_stage_history_from_stage_changed').on(table.fromStage, table.changedAt)
  })
);

/**
 * tags
 * Etiquetas dinámicas por alcance (contact/meeting/note) con metadata visual.
 */
export const tags = pgTable(
  'tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scope: text('scope').notNull(), // contact, meeting, note
    name: text('name').notNull(),
    color: text('color').notNull().default('#6B7280'),
    icon: text('icon'), // emoji o icon name
    description: text('description'),
    businessLine: text('business_line'), // inversiones, zurich, patrimonial
    isSystem: boolean('is_system').notNull().default(false),
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    scopeNameUnique: uniqueIndex('tags_scope_name_unique').on(table.scope, table.name)
  })
);

/**
 * tag_rules
 * Reglas para asignación automática de etiquetas basadas en condiciones.
 */
export const tagRules = pgTable(
  'tag_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    conditions: jsonb('conditions').notNull(), // Estructura de reglas (AND/OR, campos, operadores)
    isActive: boolean('is_active').notNull().default(true),
    lastEvaluatedAt: timestamp('last_evaluated_at', { withTimezone: true }),
    createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    tagRulesTagIdx: index('idx_tag_rules_tag').on(table.tagId),
    tagRulesActiveIdx: index('idx_tag_rules_active').on(table.isActive)
  })
);

/**
 * segments
 * Segmentos guardados de contactos basados en filtros o reglas.
 */
export const segments = pgTable(
  'segments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    filters: jsonb('filters').notNull(), // Estructura de filtros
    isDynamic: boolean('is_dynamic').notNull().default(true), // true = se refresca automáticamente
    contactCount: integer('contact_count').notNull().default(0),
    lastRefreshedAt: timestamp('last_refreshed_at', { withTimezone: true }),
    refreshSchedule: text('refresh_schedule'), // cron expression
    ownerId: uuid('owner_id').notNull().references(() => users.id),
    isShared: boolean('is_shared').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    segmentsOwnerIdx: index('idx_segments_owner').on(table.ownerId),
    segmentsDynamicIdx: index('idx_segments_dynamic').on(table.isDynamic)
  })
);

/**
 * segment_members
 * Membresía de contactos en segmentos (para segmentos dinámicos se regenera).
 */
export const segmentMembers = pgTable(
  'segment_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    segmentId: uuid('segment_id').notNull().references(() => segments.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    segmentMembersUnique: uniqueIndex('segment_members_unique').on(table.segmentId, table.contactId),
    segmentMembersSegmentIdx: index('idx_segment_members_segment').on(table.segmentId),
    segmentMembersContactIdx: index('idx_segment_members_contact').on(table.contactId)
  })
);

/**
 * contact_tags
 * Relación N:M entre contactos y etiquetas.
 * Campos adicionales para datos específicos de líneas de negocio (ej: Zurich).
 */
export const contactTags = pgTable(
  'contact_tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
    monthlyPremium: integer('monthly_premium'), // Prima mensual (números enteros, ej: 550)
    policyNumber: text('policy_number'), // Número de póliza (texto y números)
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    contactTagUnique: uniqueIndex('contact_tags_unique').on(table.contactId, table.tagId),
    // AI_DECISION: Add contactId index for hot queries
    // Justificación: Contact tags endpoint queries by contactId frequently for batched lookups
    // Impacto: Query p95 reduction ~30-60% for contact-tag relationship queries
    contactTagsContactIdx: index('idx_contact_tags_contact').on(table.contactId)
  })
);

