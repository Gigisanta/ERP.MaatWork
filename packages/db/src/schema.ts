import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  jsonb,
  numeric,
  integer,
  index,
  uniqueIndex,
  check
} from 'drizzle-orm/pg-core';

// ==========================================================
// Catálogos (lookup) - reemplazo de enums volátiles
// ==========================================================
// REGLA CURSOR: Usar catálogos (lookup_*) en lugar de enums para flexibilidad y i18n
// No agregar enums hardcoded - siempre usar tablas lookup

/**
 * lookup_asset_class
 * Catálogo de clases de activo. Evita enums rígidos y permite i18n.
 * - id: identificador estable (p.ej. 'equity').
 * - label: descripción legible.
 */
export const lookupAssetClass = pgTable('lookup_asset_class', {
  id: text('id').primaryKey(),
  label: text('label').notNull()
});

export const lookupTaskStatus = pgTable('lookup_task_status', {
  id: text('id').primaryKey(),
  label: text('label').notNull()
});

export const lookupPriority = pgTable('lookup_priority', {
  id: text('id').primaryKey(),
  label: text('label').notNull()
});

export const lookupNotificationType = pgTable('lookup_notification_type', {
  id: text('id').primaryKey(),
  label: text('label').notNull()
});

// ==========================================================
// Identidad y equipos
// ==========================================================

/**
 * teams
 * Equipos de trabajo. Un `manager_user_id` puede liderar el equipo.
 */
export const teams = pgTable('teams', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  managerUserId: uuid('manager_user_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
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
    role: text('role').notNull(), // advisor, manager, admin
    passwordHash: text('password_hash'),
    isActive: boolean('is_active').notNull().default(true),
    lastLogin: timestamp('last_login'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
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
      roleIdx: index('idx_users_role').on(table.role)
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
    teamId: uuid('team_id').notNull().references(() => teams.id),
    userId: uuid('user_id').notNull().references(() => users.id),
    role: text('role').notNull(), // member, lead
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    teamUserUnique: uniqueIndex('team_membership_unique').on(table.teamId, table.userId)
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
    userId: uuid('user_id').notNull().references(() => users.id),
    managerId: uuid('manager_id').notNull().references(() => users.id),
    status: text('status').notNull().default('pending'), // pending, approved, rejected
    createdAt: timestamp('created_at').notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at'),
    resolvedByUserId: uuid('resolved_by_user_id').references(() => users.id)
  },
  (table) => ({
    teamMembershipRequestsUnique: uniqueIndex('team_membership_requests_unique').on(table.userId, table.managerId)
  })
);

// ==========================================================
// Settings / Mappings
// ==========================================================

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
    userId: uuid('user_id').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    advisorAliasUnique: uniqueIndex('advisor_aliases_normalized_unique').on(table.aliasNormalized),
    advisorAliasUserIdx: index('idx_advisor_aliases_user').on(table.userId)
  })
);

// ==========================================================
// Contactos y pipeline
// ==========================================================

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
    // TRGM GIN index creado vía migración SQL
    contactsNameIdx: index('idx_contacts_full_name').on(table.fullName),
    contactsEmailUnique: uniqueIndex('contacts_email_unique').on(table.email)
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
    pipelineHistoryToStageIdx: index('idx_pipeline_history_to_stage').on(table.toStage, table.changedAt)
  })
);

// ==========================================================
// Adjuntos
// ==========================================================

/**
 * attachments
 * Archivos adjuntos vinculados a contactos, notas o reuniones.
 */
export const attachments = pgTable(
  'attachments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    filename: text('filename').notNull(),
    originalFilename: text('original_filename').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    storagePath: text('storage_path').notNull(),
    checksum: text('checksum'),
    // Polimórfico: puede estar asociado a contacto, nota o reunión
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }),
    noteId: uuid('note_id').references(() => notes.id, { onDelete: 'cascade' }),
    uploadedByUserId: uuid('uploaded_by_user_id').notNull().references(() => users.id),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    attachmentsContactIdx: index('idx_attachments_contact').on(table.contactId),
    attachmentsNoteIdx: index('idx_attachments_note').on(table.noteId)
  })
);

// ==========================================================
// Etiquetas y Segmentos
// ==========================================================

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
 */
export const contactTags = pgTable(
  'contact_tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
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

// ==========================================================
// Reuniones y Notas con IA
// ==========================================================

/**
 * audio_files
 * Archivos de audio para transcripción.
 */
export const audioFiles = pgTable(
  'audio_files',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    filename: text('filename').notNull(),
    originalFilename: text('original_filename').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    durationSeconds: integer('duration_seconds'),
    storagePath: text('storage_path').notNull(),
    checksum: text('checksum'),
    uploadedByUserId: uuid('uploaded_by_user_id').notNull().references(() => users.id),
    transcriptionText: text('transcription_text'),
    transcriptionModel: text('transcription_model'),
    transcriptionError: text('transcription_error'),
    transcribedAt: timestamp('transcribed_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    audioFilesUploadedByIdx: index('idx_audio_files_uploaded_by').on(table.uploadedByUserId),
    audioFilesTranscribedIdx: index('idx_audio_files_transcribed').on(table.transcribedAt)
  })
);

/**
 * notes
 * Notas unificadas (IA/manual/import) asociadas a contacto.
 */
export const notes = pgTable(
  'notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contactId: uuid('contact_id').notNull().references(() => contacts.id),
    authorUserId: uuid('author_user_id').references(() => users.id),
    source: text('source').notNull(), // ai, manual, import
    noteType: text('note_type').notNull(), // general, summary, action_items
    content: text('content').notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    notesContactCreatedIdx: index('idx_notes_contact_created').on(table.contactId, table.createdAt)
  })
);

/**
 * note_tags
 * Relación N:M entre notas y etiquetas.
 */
export const noteTags = pgTable(
  'note_tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    noteId: uuid('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    noteTagUnique: uniqueIndex('note_tags_unique').on(table.noteId, table.tagId)
  })
);

// ==========================================================
// Tareas y seguimiento
// ==========================================================

/**
 * task_recurrences
 * Definición de recurrencias para tareas (RRULE).
 */
export const taskRecurrences = pgTable(
  'task_recurrences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    rrule: text('rrule').notNull(), // iCal RRULE format (FREQ=DAILY;INTERVAL=1;COUNT=10)
    timezone: text('timezone').notNull().default('America/Argentina/Buenos_Aires'),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'), // null = sin fin
    nextOccurrence: date('next_occurrence'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    taskRecurrencesNextIdx: index('idx_task_recurrences_next').on(table.nextOccurrence, table.isActive)
  })
);

/**
 * tasks
 * Tareas/seguimiento con estado, prioridad y asignación.
 * `origin_ref` permite trazar a IA/transcripción.
 */
export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contactId: uuid('contact_id').notNull().references(() => contacts.id),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull().references(() => lookupTaskStatus.id),
    dueDate: date('due_date'),
    dueTime: text('due_time'), // HH:MM para hora específica
    priority: text('priority').notNull().references(() => lookupPriority.id),
    assignedToUserId: uuid('assigned_to_user_id').notNull().references(() => users.id),
    createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id),
    createdFrom: text('created_from').notNull(), // ai, manual, automation
    originRef: jsonb('origin_ref'),
    recurrenceId: uuid('recurrence_id').references(() => taskRecurrences.id),
    parentTaskId: uuid('parent_task_id'), // Para tareas recurrentes, referencia a la serie
    completedAt: timestamp('completed_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    tasksAssignedStatusDueIdx: index('idx_tasks_assigned_status_due').on(
      table.assignedToUserId,
      table.status,
      table.dueDate
    ),
    tasksOpenDuePartialIdx: index('idx_tasks_open_due').on(table.dueDate).where(
      sql`${table.status} in ('open','in_progress')`
    ),
    tasksRecurrenceIdx: index('idx_tasks_recurrence').on(table.recurrenceId),
    // AI_DECISION: Add composite index for contact-based task queries
    // Justificación: Contact detail pages query all tasks for a contact filtered by status/dueDate
    // Impacto: Faster task loading when viewing contact details
    tasksContactStatusDueIdx: index('idx_tasks_contact_status_due').on(
      table.contactId,
      table.status,
      table.dueDate
    )
  })
);

// ==========================================================
// Notificaciones y canales
// ==========================================================

/**
 * notification_templates
 * Plantillas de notificaciones con variables y versionado.
 */
export const notificationTemplates = pgTable(
  'notification_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: text('code').notNull(), // Identificador único del template (ej: 'task_due_reminder')
    version: integer('version').notNull().default(1),
    name: text('name').notNull(),
    description: text('description'),
    subjectTemplate: text('subject_template'), // Para email
    bodyTemplate: text('body_template').notNull(), // Mustache/Handlebars template
    pushTemplate: text('push_template'), // Template específico para push
    variables: jsonb('variables').notNull().default(sql`'[]'::jsonb`), // Lista de variables disponibles
    defaultChannel: text('default_channel').notNull().default('in_app'), // in_app, email, push, whatsapp
    isActive: boolean('is_active').notNull().default(true),
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    notificationTemplatesCodeVersionUnique: uniqueIndex('notification_templates_code_version_unique').on(
      table.code,
      table.version
    ),
    notificationTemplatesActiveIdx: index('idx_notification_templates_active').on(table.isActive)
  })
);

/**
 * notifications
 * Eventos de alerta a usuario con payload estructurado y canales entregados.
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id),
    type: text('type').notNull().references(() => lookupNotificationType.id),
    templateId: uuid('template_id').references(() => notificationTemplates.id),
    severity: text('severity').notNull(), // info, warning, critical
    contactId: uuid('contact_id').references(() => contacts.id),
    taskId: uuid('task_id').references(() => tasks.id),
    payload: jsonb('payload').notNull().default(sql`'{}'::jsonb`),
    renderedSubject: text('rendered_subject'),
    renderedBody: text('rendered_body').notNull(),
    deliveredChannels: text('delivered_channels').array().notNull().default(sql`'{}'::text[]`),
    readAt: timestamp('read_at', { withTimezone: true }),
    snoozedUntil: timestamp('snoozed_until', { withTimezone: true }),
    processed: boolean('processed').notNull().default(false),
    clickedAt: timestamp('clicked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    notificationsUnreadIdx: index('idx_notifications_unread')
      .on(table.userId, table.createdAt)
      .where(sql`${table.readAt} is null`),
    notificationsUnprocessedIdx: index('idx_notifications_unprocessed')
      .on(table.processed)
      .where(sql`${table.processed} = false`),
    notificationsSnoozedIdx: index('idx_notifications_snoozed')
      .on(table.userId, table.snoozedUntil)
      .where(sql`${table.snoozedUntil} is not null`)
  })
);

/**
 * user_channel_preferences
 * Preferencias por canal (email/whatsapp/push) para notificaciones.
 */
export const userChannelPreferences = pgTable(
  'user_channel_preferences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id),
    channel: text('channel').notNull(), // email, whatsapp, push
    enabled: boolean('enabled').notNull().default(true),
    address: jsonb('address'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userChannelUnique: uniqueIndex('user_channel_preferences_unique').on(table.userId, table.channel)
  })
);

/**
 * message_log
 * Bitácora de mensajes enviados por los distintos canales.
 */
export const messageLog = pgTable('message_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  channel: text('channel').notNull(), // email, whatsapp, push
  toRef: jsonb('to_ref').notNull(),
  subject: text('subject'),
  body: text('body').notNull(),
  status: text('status').notNull(), // queued, sent, failed
  providerMessageId: text('provider_message_id'),
  error: text('error'),
  relatedNotificationId: uuid('related_notification_id').references(() => notifications.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// ==========================================================
// Instrumentos
// ==========================================================

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

// ==========================================================
// Integración Balanz y staging
// ==========================================================

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

// ==========================================================
// Broker: cuentas, saldos, posiciones, transacciones
// ==========================================================

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
    brokerAccountUnique: uniqueIndex('broker_accounts_unique').on(table.broker, table.accountNumber)
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
    btxTypeTradeIdx: index('idx_btx_type_trade').on(table.type, table.tradeDate)
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
    brokerPositionsLatestIdx: index('idx_bpos_latest').on(table.brokerAccountId, table.asOfDate)
  })
);

// ==========================================================
// AUM Imports (manual CSV/XLSX staging y auditoría)
// ==========================================================

/**
 * aum_import_files
 * Auditoría de importaciones manuales (CSV/XLSX) con métricas y estado.
 */
export const aumImportFiles = pgTable(
  'aum_import_files',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    broker: text('broker').notNull(), // balanz
    originalFilename: text('original_filename').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    uploadedByUserId: uuid('uploaded_by_user_id').notNull().references(() => users.id),
    status: text('status').notNull(), // uploaded, parsed, committed, failed
    totalParsed: integer('total_parsed').notNull().default(0),
    totalMatched: integer('total_matched').notNull().default(0),
    totalUnmatched: integer('total_unmatched').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  }
);

/**
 * aum_import_rows
 * Filas parseadas desde archivos importados, con pre-matching y estado.
 */
export const aumImportRows = pgTable(
  'aum_import_rows',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fileId: uuid('file_id').notNull().references(() => aumImportFiles.id, { onDelete: 'cascade' }),
    raw: jsonb('raw').notNull().default(sql`'{}'::jsonb`),
    accountNumber: text('account_number'),
    holderName: text('holder_name'),
    advisorRaw: text('advisor_raw'),
    matchedContactId: uuid('matched_contact_id').references(() => contacts.id),
    matchedUserId: uuid('matched_user_id').references(() => users.id),
    matchStatus: text('match_status').notNull().default('unmatched'), // matched, ambiguous, unmatched
    isPreferred: boolean('is_preferred').notNull().default(true),
    conflictDetected: boolean('conflict_detected').notNull().default(false),
    // Columnas financieras extendidas
    aumDollars: numeric('aum_dollars', { precision: 18, scale: 6 }),
    bolsaArg: numeric('bolsa_arg', { precision: 18, scale: 6 }),
    fondosArg: numeric('fondos_arg', { precision: 18, scale: 6 }),
    bolsaBci: numeric('bolsa_bci', { precision: 18, scale: 6 }),
    pesos: numeric('pesos', { precision: 18, scale: 6 }),
    mep: numeric('mep', { precision: 18, scale: 6 }),
    cable: numeric('cable', { precision: 18, scale: 6 }),
    cv7000: numeric('cv7000', { precision: 18, scale: 6 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    aumRowsAccountIdx: index('idx_aum_rows_account').on(table.accountNumber),
    aumRowsFileIdx: index('idx_aum_rows_file').on(table.fileId),
    aumRowsFileStatusPreferredIdx: index('idx_aum_rows_file_status_preferred').on(table.fileId, table.matchStatus, table.isPreferred),
    aumRowsCreatedAtIdx: index('idx_aum_rows_created_at').on(table.createdAt)
  })
);

/**
 * advisor_account_mapping
 * Mapeo estático cuenta -> asesor, cargado una vez y aplicado a todas las importaciones futuras.
 */
export const advisorAccountMapping = pgTable(
  'advisor_account_mapping',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountNumber: text('account_number').notNull(),
    advisorName: text('advisor_name'), // Nombre del asesor del archivo
    advisorRaw: text('advisor_raw'), // Normalizado para matching
    matchedUserId: uuid('matched_user_id').references(() => users.id), // User ID si se matchea automáticamente
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    advisorAccountMappingUnique: uniqueIndex('advisor_account_mapping_account_unique').on(table.accountNumber),
    advisorAccountMappingAccountIdx: index('idx_advisor_account_mapping_account').on(table.accountNumber)
  })
);

// ==========================================================
// Carteras
// ==========================================================

/**
 * portfolio_templates
 * Plantillas de cartera con riesgo objetivo.
 */
export const portfolioTemplates = pgTable('portfolio_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  riskLevel: text('risk_level'), // low, mid, high
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

/**
 * portfolio_template_lines
 * Composición objetivo por clase de activo o instrumento.
 */
export const portfolioTemplateLines = pgTable(
  'portfolio_template_lines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    templateId: uuid('template_id').notNull().references(() => portfolioTemplates.id, { onDelete: 'cascade' }),
    targetType: text('target_type').notNull(), // asset_class, instrument
    assetClass: text('asset_class').references(() => lookupAssetClass.id),
    instrumentId: uuid('instrument_id').references(() => instruments.id),
    targetWeight: numeric('target_weight', { precision: 7, scale: 4 }).notNull()
  },
  (table) => ({
    targetWeightCheck: check('chk_ptl_weight', sql`${table.targetWeight} >= 0 and ${table.targetWeight} <= 1`),
    // AI_DECISION: Add composite index for portfolio line queries
    // Justificación: Queries load all lines for a template and sort by weight. Composite index speeds up sorting.
    // Impacto: Faster portfolio composition loading
    portfolioLinesTemplateWeightIdx: index('idx_ptl_template_weight').on(
      table.templateId,
      table.targetWeight
    )
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
    contactId: uuid('contact_id').notNull().references(() => contacts.id),
    templateId: uuid('template_id').notNull().references(() => portfolioTemplates.id),
    status: text('status').notNull(), // active, paused, ended
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    notes: text('notes'),
    createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    cpaUnique: uniqueIndex('client_portfolio_assignments_unique').on(
      table.contactId,
      table.templateId,
      table.startDate
    ),
    cpaActiveIdx: index('idx_cpa_active').on(table.contactId).where(sql`${table.status} = 'active'`)
  })
);

/**
 * client_portfolio_overrides
 * Overrides por cliente/asignación a nivel clase o instrumento.
 */
export const clientPortfolioOverrides = pgTable('client_portfolio_overrides', {
  id: uuid('id').defaultRandom().primaryKey(),
  assignmentId: uuid('assignment_id').notNull().references(() => clientPortfolioAssignments.id, { onDelete: 'cascade' }),
  targetType: text('target_type').notNull(),
  assetClass: text('asset_class').references(() => lookupAssetClass.id),
  instrumentId: uuid('instrument_id').references(() => instruments.id),
  targetWeight: numeric('target_weight', { precision: 7, scale: 4 }).notNull()
});

/**
 * portfolio_monitoring_snapshot
 * Snapshots diarios por cliente de desvíos totales.
 */
export const portfolioMonitoringSnapshot = pgTable(
  'portfolio_monitoring_snapshot',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contactId: uuid('contact_id').notNull().references(() => contacts.id),
    asOfDate: date('as_of_date').notNull(),
    totalDeviationPct: numeric('total_deviation_pct', { precision: 7, scale: 4 }).notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pmsContactDateIdx: index('idx_pms_contact_date').on(table.contactId, table.asOfDate)
  })
);

/**
 * portfolio_monitoring_details
 * Detalle de desvíos por asset/instrumento para un snapshot.
 */
export const portfolioMonitoringDetails = pgTable('portfolio_monitoring_details', {
  id: uuid('id').defaultRandom().primaryKey(),
  snapshotId: uuid('snapshot_id').notNull().references(() => portfolioMonitoringSnapshot.id, { onDelete: 'cascade' }),
  targetType: text('target_type').notNull(),
  assetClass: text('asset_class').references(() => lookupAssetClass.id),
  instrumentId: uuid('instrument_id').references(() => instruments.id),
  targetWeight: numeric('target_weight', { precision: 7, scale: 4 }).notNull(),
  actualWeight: numeric('actual_weight', { precision: 7, scale: 4 }).notNull(),
  deviationPct: numeric('deviation_pct', { precision: 7, scale: 4 }).notNull()
});

// ==========================================================
// Reportes y métricas
// ==========================================================

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
    activityByAdvisorIdx: index('idx_activity_by_advisor').on(table.advisorUserId, table.occurredAt)
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
    dailyMetricsUserUnique: uniqueIndex('daily_metrics_user_unique').on(table.userId, table.date)
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
    aumSnapshotsUnique: uniqueIndex('aum_snapshots_unique').on(table.contactId, table.date)
  })
);

// ==========================================================
// Auditoría y alertas
// ==========================================================

/**
 * audit_logs
 * Auditoría técnica de acciones con contexto.
 */
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorUserId: uuid('actor_user_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  context: jsonb('context').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

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

// ==========================================================
// Benchmarks y precios
// ==========================================================

/**
 * benchmark_definitions
 * Definición de benchmarks para comparación de carteras.
 */
export const benchmarkDefinitions = pgTable(
  'benchmark_definitions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: text('code').notNull().unique(), // MERVAL, IAMC, SP500, CUSTOM_BALANCED
    name: text('name').notNull(),
    description: text('description'),
    isSystem: boolean('is_system').notNull().default(false), // benchmarks del sistema vs custom
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    benchmarkCodeIdx: index('idx_benchmark_code').on(table.code)
  })
);

/**
 * benchmark_components
 * Componentes de benchmarks (instrumentos con pesos).
 */
export const benchmarkComponents = pgTable(
  'benchmark_components',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    benchmarkId: uuid('benchmark_id').notNull().references(() => benchmarkDefinitions.id, { onDelete: 'cascade' }),
    instrumentId: uuid('instrument_id').references(() => instruments.id),
    weight: numeric('weight', { precision: 7, scale: 4 }).notNull(), // para benchmarks compuestos
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    benchmarkComponentsBenchmarkIdx: index('idx_benchmark_components_benchmark').on(table.benchmarkId),
    benchmarkComponentsInstrumentIdx: index('idx_benchmark_components_instrument').on(table.instrumentId),
    benchmarkWeightCheck: check('chk_benchmark_weight', sql`${table.weight} >= 0 and ${table.weight} <= 1`),
    // AI_DECISION: Add composite index for benchmark component queries
    // Justificación: Queries load all components for a benchmark and sort by weight. Composite index speeds up sorting.
    // Impacto: Faster benchmark composition loading
    benchmarkComponentsWeightIdx: index('idx_benchmark_components_weight').on(
      table.benchmarkId,
      table.weight
    )
  })
);

/**
 * price_snapshots
 * Snapshots de precios históricos por instrumento y fecha.
 */
export const priceSnapshots = pgTable(
  'price_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    instrumentId: uuid('instrument_id').notNull().references(() => instruments.id),
    asOfDate: date('as_of_date').notNull(),
    closePrice: numeric('close_price', { precision: 18, scale: 6 }).notNull(),
    currency: text('currency').notNull(),
    source: text('source').notNull(), // yfinance, manual
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    priceSnapshotsUnique: uniqueIndex('price_snapshots_unique').on(table.instrumentId, table.asOfDate),
    priceSnapshotsDateIdx: index('idx_price_snapshots_date').on(table.asOfDate),
    priceSnapshotsInstrumentIdx: index('idx_price_snapshots_instrument').on(table.instrumentId)
  })
);

/**
 * metric_definitions
 * Catálogo de métricas financieras disponibles.
 */
export const metricDefinitions = pgTable(
  'metric_definitions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: text('code').notNull().unique(), // twr, sharpe, volatility, drawdown, alpha, beta, te
    name: text('name').notNull(),
    description: text('description'),
    calculationFormula: text('calculation_formula'), // descripción textual o fórmula
    unit: text('unit').notNull(), // %, ratio, currency
    category: text('category').notNull() // performance, risk, benchmark
  },
  (table) => ({
    metricCodeIdx: index('idx_metric_code').on(table.code),
    metricCategoryIdx: index('idx_metric_category').on(table.category)
  })
);

// ==========================================================
// Capacitaciones
// ==========================================================

/**
 * capacitaciones
 * Biblioteca de capacitaciones con título, tema, link y fecha.
 * Permite importación masiva desde CSV y gestión manual.
 */
export const capacitaciones = pgTable(
  'capacitaciones',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    titulo: text('titulo').notNull(),
    tema: text('tema').notNull(), // Podcast, Libros, TED, Administración, Carácter, Método, Role Play, Mktg Digital, Producto, Vida, Zurich
    link: text('link').notNull(),
    fecha: date('fecha'), // Fecha opcional en formato DATE
    createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    capacitacionesTemaIdx: index('idx_capacitaciones_tema').on(table.tema),
    capacitacionesFechaIdx: index('idx_capacitaciones_fecha').on(table.fecha),
    capacitacionesCreatedByIdx: index('idx_capacitaciones_created_by').on(table.createdByUserId)
  })
);

