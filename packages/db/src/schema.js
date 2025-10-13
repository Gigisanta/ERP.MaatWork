"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledReports = exports.portfolioMonitoringDetails = exports.portfolioMonitoringSnapshot = exports.clientPortfolioOverrides = exports.clientPortfolioAssignments = exports.portfolioTemplateLines = exports.portfolioTemplates = exports.brokerPositions = exports.brokerTransactions = exports.brokerBalances = exports.brokerAccounts = exports.parseErrors = exports.stagingRawRecords = exports.integrationFiles = exports.integrationRuns = exports.integrationJobs = exports.integrationAccounts = exports.instrumentAliases = exports.instruments = exports.messageLog = exports.userChannelPreferences = exports.notifications = exports.notificationTemplates = exports.tasks = exports.taskRecurrences = exports.meetingTags = exports.noteTags = exports.notes = exports.audioFiles = exports.meetingAi = exports.meetingParticipants = exports.meetings = exports.contactTags = exports.segmentMembers = exports.segments = exports.tagRules = exports.tags = exports.attachments = exports.pipelineStageHistory = exports.contactFieldHistory = exports.contacts = exports.pipelineStages = exports.teamMembership = exports.users = exports.teams = exports.lookupNotificationType = exports.lookupMeetingSource = exports.lookupPriority = exports.lookupTaskStatus = exports.lookupAssetClass = void 0;
exports.matchingResolutions = exports.matchingAudit = exports.factCommission = exports.factAumSnapshot = exports.mapCuentaVariantes = exports.mapAsesorVariantes = exports.dimAdvisor = exports.dimClient = exports.stgComisiones = exports.stgClusterCuentas = exports.stgAumMadre = exports.alertPolicies = exports.auditLogs = exports.aumSnapshots = exports.dailyMetricsUser = exports.activityEvents = exports.reportRuns = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
// ==========================================================
// Catálogos (lookup) - reemplazo de enums volátiles
// ==========================================================
/**
 * lookup_asset_class
 * Catálogo de clases de activo. Evita enums rígidos y permite i18n.
 * - id: identificador estable (p.ej. 'equity').
 * - label: descripción legible.
 */
exports.lookupAssetClass = (0, pg_core_1.pgTable)('lookup_asset_class', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    label: (0, pg_core_1.text)('label').notNull()
});
exports.lookupTaskStatus = (0, pg_core_1.pgTable)('lookup_task_status', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    label: (0, pg_core_1.text)('label').notNull()
});
exports.lookupPriority = (0, pg_core_1.pgTable)('lookup_priority', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    label: (0, pg_core_1.text)('label').notNull()
});
exports.lookupMeetingSource = (0, pg_core_1.pgTable)('lookup_meeting_source', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    label: (0, pg_core_1.text)('label').notNull()
});
exports.lookupNotificationType = (0, pg_core_1.pgTable)('lookup_notification_type', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    label: (0, pg_core_1.text)('label').notNull()
});
// ==========================================================
// Identidad y equipos
// ==========================================================
/**
 * teams
 * Equipos de trabajo. Un `manager_user_id` puede liderar el equipo.
 */
exports.teams = (0, pg_core_1.pgTable)('teams', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.text)('name').notNull(),
    managerUserId: (0, pg_core_1.uuid)('manager_user_id'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
});
/**
 * users
 * Usuarios del sistema (asesores, managers, admin).
 * role: controla permisos a nivel app/RLS.
 */
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    email: (0, pg_core_1.text)('email').notNull(),
    fullName: (0, pg_core_1.text)('full_name').notNull(),
    role: (0, pg_core_1.text)('role').notNull(), // advisor, manager, admin
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    teamId: (0, pg_core_1.uuid)('team_id').references(() => exports.teams.id),
    // FK self-referencial agregado vía migración SQL para evitar ciclo de tipos en TS
    managerId: (0, pg_core_1.uuid)('manager_id'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => {
    return {
        emailUnique: (0, pg_core_1.uniqueIndex)('users_email_unique').on(table.email),
        roleIdx: (0, pg_core_1.index)('idx_users_role').on(table.role),
        managerIdx: (0, pg_core_1.index)('idx_users_manager').on(table.managerId),
        teamIdx: (0, pg_core_1.index)('idx_users_team').on(table.teamId)
    };
});
/**
 * team_membership
 * Miembros por equipo. `role` define si es miembro o líder.
 */
exports.teamMembership = (0, pg_core_1.pgTable)('team_membership', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    teamId: (0, pg_core_1.uuid)('team_id').notNull().references(() => exports.teams.id),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => exports.users.id),
    role: (0, pg_core_1.text)('role').notNull(), // member, lead
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    teamUserUnique: (0, pg_core_1.uniqueIndex)('team_membership_unique').on(table.teamId, table.userId)
}));
// ==========================================================
// Contactos y pipeline
// ==========================================================
/**
 * pipeline_stages
 * Definición de etapas del pipeline con orden y WIP limits.
 */
exports.pipelineStages = (0, pg_core_1.pgTable)('pipeline_stages', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    order: (0, pg_core_1.integer)('order').notNull(),
    color: (0, pg_core_1.text)('color').notNull().default('#6B7280'),
    wipLimit: (0, pg_core_1.integer)('wip_limit'), // Work In Progress limit
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    pipelineStagesOrderIdx: (0, pg_core_1.index)('idx_pipeline_stages_order').on(table.order)
}));
/**
 * contacts
 * Personas/Clientes con asignación a asesor/equipo.
 * `contact_last_touch_at` se usa para detectar inactividad.
 */
exports.contacts = (0, pg_core_1.pgTable)('contacts', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    firstName: (0, pg_core_1.text)('first_name').notNull(),
    lastName: (0, pg_core_1.text)('last_name').notNull(),
    fullName: (0, pg_core_1.text)('full_name'), // mantener en app/trigger
    email: (0, pg_core_1.text)('email'),
    phone: (0, pg_core_1.text)('phone'),
    phoneSecondary: (0, pg_core_1.text)('phone_secondary'),
    whatsapp: (0, pg_core_1.text)('whatsapp'),
    address: (0, pg_core_1.text)('address'),
    city: (0, pg_core_1.text)('city'),
    country: (0, pg_core_1.text)('country').default('AR'),
    dateOfBirth: (0, pg_core_1.date)('date_of_birth'),
    // lifecycleStage eliminado - ahora usamos solo pipelineStageId
    pipelineStageId: (0, pg_core_1.uuid)('pipeline_stage_id').references(() => exports.pipelineStages.id),
    source: (0, pg_core_1.text)('source'),
    riskProfile: (0, pg_core_1.text)('risk_profile'), // low, mid, high
    assignedAdvisorId: (0, pg_core_1.uuid)('assigned_advisor_id').references(() => exports.users.id),
    assignedTeamId: (0, pg_core_1.uuid)('assigned_team_id').references(() => exports.teams.id),
    nextStep: (0, pg_core_1.text)('next_step'), // Próximo paso/acción para el contacto
    notes: (0, pg_core_1.text)('notes'),
    customFields: (0, pg_core_1.jsonb)('custom_fields').notNull().default((0, drizzle_orm_1.sql) `'{}'::jsonb`),
    contactLastTouchAt: (0, pg_core_1.timestamp)('contact_last_touch_at', { withTimezone: true }),
    pipelineStageUpdatedAt: (0, pg_core_1.timestamp)('pipeline_stage_updated_at', { withTimezone: true }),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
    version: (0, pg_core_1.integer)('version').notNull().default(1),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    contactsAdvisorIdx: (0, pg_core_1.index)('idx_contacts_advisor').on(table.assignedAdvisorId),
    // contactsStageIdx eliminado - ya no usamos lifecycleStage
    contactsPipelineStageIdx: (0, pg_core_1.index)('idx_contacts_pipeline_stage').on(table.pipelineStageId),
    contactsTouchIdx: (0, pg_core_1.index)('idx_contacts_touch').on(table.contactLastTouchAt),
    // TRGM GIN index creado vía migración SQL
    contactsNameIdx: (0, pg_core_1.index)('idx_contacts_full_name').on(table.fullName),
    contactsEmailUnique: (0, pg_core_1.uniqueIndex)('contacts_email_unique').on(table.email)
}));
/**
 * contact_field_history
 * Auditoría de cambios en campos de contactos para rollback.
 */
exports.contactFieldHistory = (0, pg_core_1.pgTable)('contact_field_history', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    contactId: (0, pg_core_1.uuid)('contact_id').notNull().references(() => exports.contacts.id, { onDelete: 'cascade' }),
    fieldName: (0, pg_core_1.text)('field_name').notNull(),
    oldValue: (0, pg_core_1.text)('old_value'),
    newValue: (0, pg_core_1.text)('new_value'),
    changedByUserId: (0, pg_core_1.uuid)('changed_by_user_id').notNull().references(() => exports.users.id),
    changedAt: (0, pg_core_1.timestamp)('changed_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    contactFieldHistoryIdx: (0, pg_core_1.index)('idx_contact_field_history').on(table.contactId, table.changedAt)
}));
/**
 * pipeline_stage_history
 * Historial de cambios de etapa del pipeline por contacto.
 */
exports.pipelineStageHistory = (0, pg_core_1.pgTable)('pipeline_stage_history', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    contactId: (0, pg_core_1.uuid)('contact_id').notNull().references(() => exports.contacts.id),
    fromStage: (0, pg_core_1.text)('from_stage'),
    toStage: (0, pg_core_1.text)('to_stage').notNull(),
    reason: (0, pg_core_1.text)('reason'),
    changedByUserId: (0, pg_core_1.uuid)('changed_by_user_id').notNull().references(() => exports.users.id),
    changedAt: (0, pg_core_1.timestamp)('changed_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    pipelineHistoryIdx: (0, pg_core_1.index)('idx_pipeline_history_contact').on(table.contactId, table.changedAt)
}));
// ==========================================================
// Adjuntos
// ==========================================================
/**
 * attachments
 * Archivos adjuntos vinculados a contactos, notas o reuniones.
 */
exports.attachments = (0, pg_core_1.pgTable)('attachments', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    filename: (0, pg_core_1.text)('filename').notNull(),
    originalFilename: (0, pg_core_1.text)('original_filename').notNull(),
    mimeType: (0, pg_core_1.text)('mime_type').notNull(),
    sizeBytes: (0, pg_core_1.integer)('size_bytes').notNull(),
    storagePath: (0, pg_core_1.text)('storage_path').notNull(),
    checksum: (0, pg_core_1.text)('checksum'),
    // Polimórfico: puede estar asociado a contacto, nota o reunión
    contactId: (0, pg_core_1.uuid)('contact_id').references(() => exports.contacts.id, { onDelete: 'cascade' }),
    noteId: (0, pg_core_1.uuid)('note_id').references(() => exports.notes.id, { onDelete: 'cascade' }),
    meetingId: (0, pg_core_1.uuid)('meeting_id').references(() => exports.meetings.id, { onDelete: 'cascade' }),
    uploadedByUserId: (0, pg_core_1.uuid)('uploaded_by_user_id').notNull().references(() => exports.users.id),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    attachmentsContactIdx: (0, pg_core_1.index)('idx_attachments_contact').on(table.contactId),
    attachmentsNoteIdx: (0, pg_core_1.index)('idx_attachments_note').on(table.noteId),
    attachmentsMeetingIdx: (0, pg_core_1.index)('idx_attachments_meeting').on(table.meetingId)
}));
// ==========================================================
// Etiquetas y Segmentos
// ==========================================================
/**
 * tags
 * Etiquetas dinámicas por alcance (contact/meeting/note) con metadata visual.
 */
exports.tags = (0, pg_core_1.pgTable)('tags', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    scope: (0, pg_core_1.text)('scope').notNull(), // contact, meeting, note
    name: (0, pg_core_1.text)('name').notNull(),
    color: (0, pg_core_1.text)('color').notNull().default('#6B7280'),
    icon: (0, pg_core_1.text)('icon'), // emoji o icon name
    description: (0, pg_core_1.text)('description'),
    isSystem: (0, pg_core_1.boolean)('is_system').notNull().default(false),
    createdByUserId: (0, pg_core_1.uuid)('created_by_user_id').references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    scopeNameUnique: (0, pg_core_1.uniqueIndex)('tags_scope_name_unique').on(table.scope, table.name)
}));
/**
 * tag_rules
 * Reglas para asignación automática de etiquetas basadas en condiciones.
 */
exports.tagRules = (0, pg_core_1.pgTable)('tag_rules', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    tagId: (0, pg_core_1.uuid)('tag_id').notNull().references(() => exports.tags.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.text)('name').notNull(),
    conditions: (0, pg_core_1.jsonb)('conditions').notNull(), // Estructura de reglas (AND/OR, campos, operadores)
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    lastEvaluatedAt: (0, pg_core_1.timestamp)('last_evaluated_at', { withTimezone: true }),
    createdByUserId: (0, pg_core_1.uuid)('created_by_user_id').notNull().references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    tagRulesTagIdx: (0, pg_core_1.index)('idx_tag_rules_tag').on(table.tagId),
    tagRulesActiveIdx: (0, pg_core_1.index)('idx_tag_rules_active').on(table.isActive)
}));
/**
 * segments
 * Segmentos guardados de contactos basados en filtros o reglas.
 */
exports.segments = (0, pg_core_1.pgTable)('segments', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    filters: (0, pg_core_1.jsonb)('filters').notNull(), // Estructura de filtros
    isDynamic: (0, pg_core_1.boolean)('is_dynamic').notNull().default(true), // true = se refresca automáticamente
    contactCount: (0, pg_core_1.integer)('contact_count').notNull().default(0),
    lastRefreshedAt: (0, pg_core_1.timestamp)('last_refreshed_at', { withTimezone: true }),
    refreshSchedule: (0, pg_core_1.text)('refresh_schedule'), // cron expression
    ownerId: (0, pg_core_1.uuid)('owner_id').notNull().references(() => exports.users.id),
    isShared: (0, pg_core_1.boolean)('is_shared').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    segmentsOwnerIdx: (0, pg_core_1.index)('idx_segments_owner').on(table.ownerId),
    segmentsDynamicIdx: (0, pg_core_1.index)('idx_segments_dynamic').on(table.isDynamic)
}));
/**
 * segment_members
 * Membresía de contactos en segmentos (para segmentos dinámicos se regenera).
 */
exports.segmentMembers = (0, pg_core_1.pgTable)('segment_members', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    segmentId: (0, pg_core_1.uuid)('segment_id').notNull().references(() => exports.segments.id, { onDelete: 'cascade' }),
    contactId: (0, pg_core_1.uuid)('contact_id').notNull().references(() => exports.contacts.id, { onDelete: 'cascade' }),
    addedAt: (0, pg_core_1.timestamp)('added_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    segmentMembersUnique: (0, pg_core_1.uniqueIndex)('segment_members_unique').on(table.segmentId, table.contactId),
    segmentMembersSegmentIdx: (0, pg_core_1.index)('idx_segment_members_segment').on(table.segmentId),
    segmentMembersContactIdx: (0, pg_core_1.index)('idx_segment_members_contact').on(table.contactId)
}));
/**
 * contact_tags
 * Relación N:M entre contactos y etiquetas.
 */
exports.contactTags = (0, pg_core_1.pgTable)('contact_tags', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    contactId: (0, pg_core_1.uuid)('contact_id').notNull().references(() => exports.contacts.id, { onDelete: 'cascade' }),
    tagId: (0, pg_core_1.uuid)('tag_id').notNull().references(() => exports.tags.id, { onDelete: 'cascade' }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    contactTagUnique: (0, pg_core_1.uniqueIndex)('contact_tags_unique').on(table.contactId, table.tagId)
}));
// ==========================================================
// Reuniones y Notas con IA
// ==========================================================
/**
 * meetings
 * Reuniones vinculadas a un contacto y organizadas por un usuario.
 */
exports.meetings = (0, pg_core_1.pgTable)('meetings', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    contactId: (0, pg_core_1.uuid)('contact_id').notNull().references(() => exports.contacts.id),
    organizerUserId: (0, pg_core_1.uuid)('organizer_user_id').notNull().references(() => exports.users.id),
    startedAt: (0, pg_core_1.timestamp)('started_at', { withTimezone: true }).notNull(),
    endedAt: (0, pg_core_1.timestamp)('ended_at', { withTimezone: true }),
    source: (0, pg_core_1.text)('source').notNull().references(() => exports.lookupMeetingSource.id),
    externalMeetingId: (0, pg_core_1.text)('external_meeting_id'),
    recordingUrl: (0, pg_core_1.text)('recording_url'),
    status: (0, pg_core_1.text)('status').notNull(), // scheduled, completed, cancelled
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    meetingsContactStartedIdx: (0, pg_core_1.index)('idx_meetings_contact_started').on(table.contactId, table.startedAt)
}));
/**
 * meeting_participants
 * Participantes (user/contact/external) en una reunión.
 */
exports.meetingParticipants = (0, pg_core_1.pgTable)('meeting_participants', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    meetingId: (0, pg_core_1.uuid)('meeting_id').notNull().references(() => exports.meetings.id, { onDelete: 'cascade' }),
    participantType: (0, pg_core_1.text)('participant_type').notNull(), // user, contact, external
    userId: (0, pg_core_1.uuid)('user_id').references(() => exports.users.id),
    contactId: (0, pg_core_1.uuid)('contact_id').references(() => exports.contacts.id),
    email: (0, pg_core_1.text)('email'),
    displayName: (0, pg_core_1.text)('display_name')
});
/**
 * meeting_ai
 * Resultados de IA por reunión (resumen, compromisos, keywords, sentimiento).
 */
exports.meetingAi = (0, pg_core_1.pgTable)('meeting_ai', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    meetingId: (0, pg_core_1.uuid)('meeting_id').notNull().unique().references(() => exports.meetings.id, { onDelete: 'cascade' }),
    model: (0, pg_core_1.text)('model').notNull(),
    promptVersion: (0, pg_core_1.text)('prompt_version'),
    summary: (0, pg_core_1.text)('summary'),
    actionItems: (0, pg_core_1.jsonb)('action_items').notNull().default((0, drizzle_orm_1.sql) `'[]'::jsonb`),
    commitments: (0, pg_core_1.jsonb)('commitments').notNull().default((0, drizzle_orm_1.sql) `'[]'::jsonb`),
    keywords: (0, pg_core_1.text)('keywords').array().notNull().default((0, drizzle_orm_1.sql) `'{}'::text[]`),
    sentiment: (0, pg_core_1.numeric)('sentiment', { precision: 4, scale: 3 }),
    language: (0, pg_core_1.text)('language'),
    durationMs: (0, pg_core_1.integer)('duration_ms'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    // GIN keywords via migración SQL
    meetingAiKeywordsIdx: (0, pg_core_1.index)('idx_meeting_ai_keywords_dummy').on(table.meetingId)
}));
/**
 * audio_files
 * Archivos de audio.
 */
exports.audioFiles = (0, pg_core_1.pgTable)('audio_files', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    filename: (0, pg_core_1.text)('filename').notNull(),
    originalFilename: (0, pg_core_1.text)('original_filename').notNull(),
    mimeType: (0, pg_core_1.text)('mime_type').notNull(),
    sizeBytes: (0, pg_core_1.integer)('size_bytes').notNull(),
    durationSeconds: (0, pg_core_1.integer)('duration_seconds'),
    storagePath: (0, pg_core_1.text)('storage_path').notNull(),
    checksum: (0, pg_core_1.text)('checksum'),
    uploadedByUserId: (0, pg_core_1.uuid)('uploaded_by_user_id').notNull().references(() => exports.users.id),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    audioFilesUploadedByIdx: (0, pg_core_1.index)('idx_audio_files_uploaded_by').on(table.uploadedByUserId),
    audioFilesCreatedIdx: (0, pg_core_1.index)('idx_audio_files_created').on(table.createdAt)
}));
/**
 * notes
 * Notas unificadas (IA/manual/import) asociadas a contacto y opcionalmente reunión.
 */
exports.notes = (0, pg_core_1.pgTable)('notes', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    contactId: (0, pg_core_1.uuid)('contact_id').notNull().references(() => exports.contacts.id),
    meetingId: (0, pg_core_1.uuid)('meeting_id').references(() => exports.meetings.id, { onDelete: 'set null' }),
    authorUserId: (0, pg_core_1.uuid)('author_user_id').references(() => exports.users.id),
    source: (0, pg_core_1.text)('source').notNull(), // ai, manual, import
    noteType: (0, pg_core_1.text)('note_type').notNull(), // summary, action_items, general, audio
    content: (0, pg_core_1.text)('content').notNull(),
    audioFileId: (0, pg_core_1.uuid)('audio_file_id').references(() => exports.audioFiles.id),
    keywords: (0, pg_core_1.text)('keywords').array().notNull().default((0, drizzle_orm_1.sql) `'{}'::text[]`),
    sentiment: (0, pg_core_1.numeric)('sentiment', { precision: 4, scale: 3 }),
    language: (0, pg_core_1.text)('language'),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    notesContactCreatedIdx: (0, pg_core_1.index)('idx_notes_contact_created').on(table.contactId, table.createdAt),
    // GIN keywords y FTS via migración SQL
    notesKeywordsIdx: (0, pg_core_1.index)('idx_notes_keywords_dummy').on(table.contactId)
}));
/**
 * note_tags
 * Relación N:M entre notas y etiquetas.
 */
exports.noteTags = (0, pg_core_1.pgTable)('note_tags', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    noteId: (0, pg_core_1.uuid)('note_id').notNull().references(() => exports.notes.id, { onDelete: 'cascade' }),
    tagId: (0, pg_core_1.uuid)('tag_id').notNull().references(() => exports.tags.id, { onDelete: 'cascade' }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    noteTagUnique: (0, pg_core_1.uniqueIndex)('note_tags_unique').on(table.noteId, table.tagId)
}));
/**
 * meeting_tags
 * Relación N:M entre reuniones y etiquetas.
 */
exports.meetingTags = (0, pg_core_1.pgTable)('meeting_tags', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    meetingId: (0, pg_core_1.uuid)('meeting_id').notNull().references(() => exports.meetings.id, { onDelete: 'cascade' }),
    tagId: (0, pg_core_1.uuid)('tag_id').notNull().references(() => exports.tags.id, { onDelete: 'cascade' }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    meetingTagUnique: (0, pg_core_1.uniqueIndex)('meeting_tags_unique').on(table.meetingId, table.tagId)
}));
// ==========================================================
// Tareas y seguimiento
// ==========================================================
/**
 * task_recurrences
 * Definición de recurrencias para tareas (RRULE).
 */
exports.taskRecurrences = (0, pg_core_1.pgTable)('task_recurrences', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    rrule: (0, pg_core_1.text)('rrule').notNull(), // iCal RRULE format (FREQ=DAILY;INTERVAL=1;COUNT=10)
    timezone: (0, pg_core_1.text)('timezone').notNull().default('America/Argentina/Buenos_Aires'),
    startDate: (0, pg_core_1.date)('start_date').notNull(),
    endDate: (0, pg_core_1.date)('end_date'), // null = sin fin
    nextOccurrence: (0, pg_core_1.date)('next_occurrence'),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    taskRecurrencesNextIdx: (0, pg_core_1.index)('idx_task_recurrences_next').on(table.nextOccurrence, table.isActive)
}));
/**
 * tasks
 * Tareas/seguimiento con estado, prioridad y asignación.
 * `origin_ref` permite trazar a IA.
 */
exports.tasks = (0, pg_core_1.pgTable)('tasks', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    contactId: (0, pg_core_1.uuid)('contact_id').notNull().references(() => exports.contacts.id),
    meetingId: (0, pg_core_1.uuid)('meeting_id').references(() => exports.meetings.id),
    title: (0, pg_core_1.text)('title').notNull(),
    description: (0, pg_core_1.text)('description'),
    status: (0, pg_core_1.text)('status').notNull().references(() => exports.lookupTaskStatus.id),
    dueDate: (0, pg_core_1.date)('due_date'),
    dueTime: (0, pg_core_1.text)('due_time'), // HH:MM para hora específica
    priority: (0, pg_core_1.text)('priority').notNull().references(() => exports.lookupPriority.id),
    assignedToUserId: (0, pg_core_1.uuid)('assigned_to_user_id').notNull().references(() => exports.users.id),
    createdByUserId: (0, pg_core_1.uuid)('created_by_user_id').notNull().references(() => exports.users.id),
    createdFrom: (0, pg_core_1.text)('created_from').notNull(), // ai, manual, automation
    originRef: (0, pg_core_1.jsonb)('origin_ref'),
    recurrenceId: (0, pg_core_1.uuid)('recurrence_id').references(() => exports.taskRecurrences.id),
    parentTaskId: (0, pg_core_1.uuid)('parent_task_id'), // Para tareas recurrentes, referencia a la serie
    completedAt: (0, pg_core_1.timestamp)('completed_at', { withTimezone: true }),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
    version: (0, pg_core_1.integer)('version').notNull().default(1),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    tasksAssignedStatusDueIdx: (0, pg_core_1.index)('idx_tasks_assigned_status_due').on(table.assignedToUserId, table.status, table.dueDate),
    tasksOpenDuePartialIdx: (0, pg_core_1.index)('idx_tasks_open_due').on(table.dueDate).where((0, drizzle_orm_1.sql) `${table.status} in ('open','in_progress')`),
    tasksRecurrenceIdx: (0, pg_core_1.index)('idx_tasks_recurrence').on(table.recurrenceId)
}));
// ==========================================================
// Notificaciones y canales
// ==========================================================
/**
 * notification_templates
 * Plantillas de notificaciones con variables y versionado.
 */
exports.notificationTemplates = (0, pg_core_1.pgTable)('notification_templates', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    code: (0, pg_core_1.text)('code').notNull(), // Identificador único del template (ej: 'task_due_reminder')
    version: (0, pg_core_1.integer)('version').notNull().default(1),
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    subjectTemplate: (0, pg_core_1.text)('subject_template'), // Para email
    bodyTemplate: (0, pg_core_1.text)('body_template').notNull(), // Mustache/Handlebars template
    pushTemplate: (0, pg_core_1.text)('push_template'), // Template específico para push
    variables: (0, pg_core_1.jsonb)('variables').notNull().default((0, drizzle_orm_1.sql) `'[]'::jsonb`), // Lista de variables disponibles
    defaultChannel: (0, pg_core_1.text)('default_channel').notNull().default('in_app'), // in_app, email, push, whatsapp
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdByUserId: (0, pg_core_1.uuid)('created_by_user_id').references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    notificationTemplatesCodeVersionUnique: (0, pg_core_1.uniqueIndex)('notification_templates_code_version_unique').on(table.code, table.version),
    notificationTemplatesActiveIdx: (0, pg_core_1.index)('idx_notification_templates_active').on(table.isActive)
}));
/**
 * notifications
 * Eventos de alerta a usuario con payload estructurado y canales entregados.
 */
exports.notifications = (0, pg_core_1.pgTable)('notifications', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => exports.users.id),
    type: (0, pg_core_1.text)('type').notNull().references(() => exports.lookupNotificationType.id),
    templateId: (0, pg_core_1.uuid)('template_id').references(() => exports.notificationTemplates.id),
    severity: (0, pg_core_1.text)('severity').notNull(), // info, warning, critical
    contactId: (0, pg_core_1.uuid)('contact_id').references(() => exports.contacts.id),
    taskId: (0, pg_core_1.uuid)('task_id').references(() => exports.tasks.id),
    payload: (0, pg_core_1.jsonb)('payload').notNull().default((0, drizzle_orm_1.sql) `'{}'::jsonb`),
    renderedSubject: (0, pg_core_1.text)('rendered_subject'),
    renderedBody: (0, pg_core_1.text)('rendered_body').notNull(),
    deliveredChannels: (0, pg_core_1.text)('delivered_channels').array().notNull().default((0, drizzle_orm_1.sql) `'{}'::text[]`),
    readAt: (0, pg_core_1.timestamp)('read_at', { withTimezone: true }),
    snoozedUntil: (0, pg_core_1.timestamp)('snoozed_until', { withTimezone: true }),
    processed: (0, pg_core_1.boolean)('processed').notNull().default(false),
    clickedAt: (0, pg_core_1.timestamp)('clicked_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    notificationsUnreadIdx: (0, pg_core_1.index)('idx_notifications_unread')
        .on(table.userId, table.createdAt)
        .where((0, drizzle_orm_1.sql) `${table.readAt} is null`),
    notificationsUnprocessedIdx: (0, pg_core_1.index)('idx_notifications_unprocessed')
        .on(table.processed)
        .where((0, drizzle_orm_1.sql) `${table.processed} = false`),
    notificationsSnoozedIdx: (0, pg_core_1.index)('idx_notifications_snoozed')
        .on(table.userId, table.snoozedUntil)
        .where((0, drizzle_orm_1.sql) `${table.snoozedUntil} is not null`)
}));
/**
 * user_channel_preferences
 * Preferencias por canal (email/whatsapp/push) para notificaciones.
 */
exports.userChannelPreferences = (0, pg_core_1.pgTable)('user_channel_preferences', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => exports.users.id),
    channel: (0, pg_core_1.text)('channel').notNull(), // email, whatsapp, push
    enabled: (0, pg_core_1.boolean)('enabled').notNull().default(true),
    address: (0, pg_core_1.jsonb)('address'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    userChannelUnique: (0, pg_core_1.uniqueIndex)('user_channel_preferences_unique').on(table.userId, table.channel)
}));
/**
 * message_log
 * Bitácora de mensajes enviados por los distintos canales.
 */
exports.messageLog = (0, pg_core_1.pgTable)('message_log', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    channel: (0, pg_core_1.text)('channel').notNull(), // email, whatsapp, push
    toRef: (0, pg_core_1.jsonb)('to_ref').notNull(),
    subject: (0, pg_core_1.text)('subject'),
    body: (0, pg_core_1.text)('body').notNull(),
    status: (0, pg_core_1.text)('status').notNull(), // queued, sent, failed
    providerMessageId: (0, pg_core_1.text)('provider_message_id'),
    error: (0, pg_core_1.text)('error'),
    relatedNotificationId: (0, pg_core_1.uuid)('related_notification_id').references(() => exports.notifications.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
});
// ==========================================================
// Instrumentos
// ==========================================================
/**
 * instruments
 * Universo de instrumentos con metadatos y códigos externos.
 */
exports.instruments = (0, pg_core_1.pgTable)('instruments', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    symbol: (0, pg_core_1.text)('symbol').notNull(),
    name: (0, pg_core_1.text)('name').notNull(),
    assetClass: (0, pg_core_1.text)('asset_class').notNull().references(() => exports.lookupAssetClass.id),
    currency: (0, pg_core_1.text)('currency').notNull(),
    isin: (0, pg_core_1.text)('isin'),
    externalCodes: (0, pg_core_1.jsonb)('external_codes').notNull().default((0, drizzle_orm_1.sql) `'{}'::jsonb`),
    maturityDate: (0, pg_core_1.date)('maturity_date'),
    couponRate: (0, pg_core_1.numeric)('coupon_rate', { precision: 9, scale: 6 }),
    riskRating: (0, pg_core_1.text)('risk_rating'),
    active: (0, pg_core_1.boolean)('active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    instrumentSymbolUnique: (0, pg_core_1.uniqueIndex)('instruments_symbol_unique').on(table.symbol)
}));
/**
 * instrument_aliases
 * Códigos alternativos por broker para mapeo/conciliación.
 */
exports.instrumentAliases = (0, pg_core_1.pgTable)('instrument_aliases', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    instrumentId: (0, pg_core_1.uuid)('instrument_id').notNull().references(() => exports.instruments.id, { onDelete: 'cascade' }),
    broker: (0, pg_core_1.text)('broker').notNull(), // balanz
    code: (0, pg_core_1.text)('code').notNull()
}, (table) => ({
    instrumentAliasUnique: (0, pg_core_1.uniqueIndex)('instrument_aliases_unique').on(table.instrumentId, table.broker, table.code)
}));
// ==========================================================
// Integración Balanz y staging
// ==========================================================
/**
 * integration_accounts
 * Configuraciones/credenciales (enmascaradas) para integraciones (Balanz).
 */
exports.integrationAccounts = (0, pg_core_1.pgTable)('integration_accounts', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    broker: (0, pg_core_1.text)('broker').notNull(), // balanz
    maskedUsername: (0, pg_core_1.text)('masked_username').notNull(),
    authType: (0, pg_core_1.text)('auth_type').notNull(), // password, otp, token, cookies
    config: (0, pg_core_1.jsonb)('config').notNull().default((0, drizzle_orm_1.sql) `'{}'::jsonb`),
    status: (0, pg_core_1.text)('status').notNull(), // active, disabled
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow()
});
/**
 * integration_jobs
 * Jobs programados (cron) para descargas/procesos de integración.
 */
exports.integrationJobs = (0, pg_core_1.pgTable)('integration_jobs', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    type: (0, pg_core_1.text)('type').notNull(), // download_reports, movimientos, saldos, posiciones
    scheduleCron: (0, pg_core_1.text)('schedule_cron').notNull(),
    enabled: (0, pg_core_1.boolean)('enabled').notNull().default(true),
    lastRunAt: (0, pg_core_1.timestamp)('last_run_at', { withTimezone: true }),
    createdByUserId: (0, pg_core_1.uuid)('created_by_user_id').notNull().references(() => exports.users.id)
});
/**
 * integration_runs
 * Ejecuciones de jobs con estado, tiempos y estadísticas.
 */
exports.integrationRuns = (0, pg_core_1.pgTable)('integration_runs', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    jobId: (0, pg_core_1.uuid)('job_id').notNull().references(() => exports.integrationJobs.id),
    startedAt: (0, pg_core_1.timestamp)('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: (0, pg_core_1.timestamp)('finished_at', { withTimezone: true }),
    status: (0, pg_core_1.text)('status').notNull(), // success, warning, failed
    error: (0, pg_core_1.text)('error'),
    stats: (0, pg_core_1.jsonb)('stats').notNull().default((0, drizzle_orm_1.sql) `'{}'::jsonb`)
}, (table) => ({
    integrationRunsJobIdx: (0, pg_core_1.index)('idx_integration_runs_job').on(table.jobId, table.startedAt)
}));
/**
 * integration_files
 * Archivos descargados por run con metadatos.
 */
exports.integrationFiles = (0, pg_core_1.pgTable)('integration_files', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    runId: (0, pg_core_1.uuid)('run_id').notNull().references(() => exports.integrationRuns.id, { onDelete: 'cascade' }),
    fileType: (0, pg_core_1.text)('file_type').notNull(),
    path: (0, pg_core_1.text)('path').notNull(),
    sizeBytes: (0, pg_core_1.integer)('size_bytes').notNull(),
    checksum: (0, pg_core_1.text)('checksum'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
});
/**
 * staging_raw_records
 * Registros crudos para parseo/ETL, con flag de procesado.
 */
exports.stagingRawRecords = (0, pg_core_1.pgTable)('staging_raw_records', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    runId: (0, pg_core_1.uuid)('run_id').notNull().references(() => exports.integrationRuns.id, { onDelete: 'cascade' }),
    source: (0, pg_core_1.text)('source').notNull(), // movimientos, saldos, posiciones, extractos
    raw: (0, pg_core_1.jsonb)('raw').notNull(),
    processed: (0, pg_core_1.boolean)('processed').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
});
/**
 * parse_errors
 * Errores detectados durante el parseo por run.
 */
exports.parseErrors = (0, pg_core_1.pgTable)('parse_errors', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    runId: (0, pg_core_1.uuid)('run_id').notNull().references(() => exports.integrationRuns.id, { onDelete: 'cascade' }),
    recordRef: (0, pg_core_1.text)('record_ref'),
    error: (0, pg_core_1.text)('error').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
});
// ==========================================================
// Broker: cuentas, saldos, posiciones, transacciones
// ==========================================================
/**
 * broker_accounts
 * Cuentas en broker por contacto. Unicidad por (broker, account_number).
 */
exports.brokerAccounts = (0, pg_core_1.pgTable)('broker_accounts', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    broker: (0, pg_core_1.text)('broker').notNull(), // balanz
    accountNumber: (0, pg_core_1.text)('account_number').notNull(),
    holderName: (0, pg_core_1.text)('holder_name'),
    contactId: (0, pg_core_1.uuid)('contact_id').notNull().references(() => exports.contacts.id),
    status: (0, pg_core_1.text)('status').notNull(), // active, closed
    lastSyncedAt: (0, pg_core_1.timestamp)('last_synced_at', { withTimezone: true })
}, (table) => ({
    brokerAccountUnique: (0, pg_core_1.uniqueIndex)('broker_accounts_unique').on(table.broker, table.accountNumber)
}));
/**
 * broker_balances
 * Saldos históricos por cuenta/fecha/moneda. Usado para MV de saldos actuales.
 */
exports.brokerBalances = (0, pg_core_1.pgTable)('broker_balances', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    brokerAccountId: (0, pg_core_1.uuid)('broker_account_id').notNull().references(() => exports.brokerAccounts.id, { onDelete: 'cascade' }),
    asOfDate: (0, pg_core_1.date)('as_of_date').notNull(),
    currency: (0, pg_core_1.text)('currency').notNull(),
    liquidBalance: (0, pg_core_1.numeric)('liquid_balance', { precision: 18, scale: 6 }).notNull(),
    totalBalance: (0, pg_core_1.numeric)('total_balance', { precision: 18, scale: 6 }).notNull()
}, (table) => ({
    brokerBalancesUnique: (0, pg_core_1.uniqueIndex)('broker_balances_unique').on(table.brokerAccountId, table.asOfDate, table.currency),
    brokerBalancesLatestIdx: (0, pg_core_1.index)('idx_broker_balances_latest').on(table.brokerAccountId, table.asOfDate)
}));
/**
 * broker_transactions
 * Transacciones históricas. Base para validaciones, reportes y alertas.
 */
exports.brokerTransactions = (0, pg_core_1.pgTable)('broker_transactions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    brokerAccountId: (0, pg_core_1.uuid)('broker_account_id').notNull().references(() => exports.brokerAccounts.id, { onDelete: 'cascade' }),
    tradeDate: (0, pg_core_1.date)('trade_date').notNull(),
    settleDate: (0, pg_core_1.date)('settle_date'),
    type: (0, pg_core_1.text)('type').notNull(), // buy, sell, coupon, dividend, transfer_in, transfer_out, deposit, withdrawal, fee, interest
    instrumentId: (0, pg_core_1.uuid)('instrument_id').references(() => exports.instruments.id),
    quantity: (0, pg_core_1.numeric)('quantity', { precision: 28, scale: 8 }),
    price: (0, pg_core_1.numeric)('price', { precision: 18, scale: 6 }),
    grossAmount: (0, pg_core_1.numeric)('gross_amount', { precision: 18, scale: 6 }),
    fees: (0, pg_core_1.numeric)('fees', { precision: 18, scale: 6 }),
    netAmount: (0, pg_core_1.numeric)('net_amount', { precision: 18, scale: 6 }),
    reference: (0, pg_core_1.text)('reference'),
    externalRef: (0, pg_core_1.text)('external_ref'),
    rawRef: (0, pg_core_1.jsonb)('raw_ref'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    btxAccountSettleIdx: (0, pg_core_1.index)('idx_btx_account_settle').on(table.brokerAccountId, table.settleDate),
    btxAccountTradeIdx: (0, pg_core_1.index)('idx_btx_account_trade').on(table.brokerAccountId, table.tradeDate),
    btxTypeTradeIdx: (0, pg_core_1.index)('idx_btx_type_trade').on(table.type, table.tradeDate)
}));
/**
 * broker_positions
 * Posiciones por fecha. Fuente para monitoreo de desvíos vs cartera target.
 */
exports.brokerPositions = (0, pg_core_1.pgTable)('broker_positions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    brokerAccountId: (0, pg_core_1.uuid)('broker_account_id').notNull().references(() => exports.brokerAccounts.id, { onDelete: 'cascade' }),
    asOfDate: (0, pg_core_1.date)('as_of_date').notNull(),
    instrumentId: (0, pg_core_1.uuid)('instrument_id').notNull().references(() => exports.instruments.id),
    quantity: (0, pg_core_1.numeric)('quantity', { precision: 28, scale: 8 }).notNull(),
    avgPrice: (0, pg_core_1.numeric)('avg_price', { precision: 18, scale: 6 }),
    marketValue: (0, pg_core_1.numeric)('market_value', { precision: 18, scale: 6 })
}, (table) => ({
    brokerPositionsUnique: (0, pg_core_1.uniqueIndex)('broker_positions_unique').on(table.brokerAccountId, table.asOfDate, table.instrumentId),
    brokerPositionsLatestIdx: (0, pg_core_1.index)('idx_bpos_latest').on(table.brokerAccountId, table.asOfDate)
}));
// ==========================================================
// Carteras
// ==========================================================
/**
 * portfolio_templates
 * Plantillas de cartera con riesgo objetivo.
 */
exports.portfolioTemplates = (0, pg_core_1.pgTable)('portfolio_templates', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    riskLevel: (0, pg_core_1.text)('risk_level'), // low, mid, high
    createdByUserId: (0, pg_core_1.uuid)('created_by_user_id').notNull().references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
});
/**
 * portfolio_template_lines
 * Composición objetivo por clase de activo o instrumento.
 */
exports.portfolioTemplateLines = (0, pg_core_1.pgTable)('portfolio_template_lines', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    templateId: (0, pg_core_1.uuid)('template_id').notNull().references(() => exports.portfolioTemplates.id, { onDelete: 'cascade' }),
    targetType: (0, pg_core_1.text)('target_type').notNull(), // asset_class, instrument
    assetClass: (0, pg_core_1.text)('asset_class').references(() => exports.lookupAssetClass.id),
    instrumentId: (0, pg_core_1.uuid)('instrument_id').references(() => exports.instruments.id),
    targetWeight: (0, pg_core_1.numeric)('target_weight', { precision: 7, scale: 4 }).notNull()
}, (table) => ({
    targetWeightCheck: (0, pg_core_1.check)('chk_ptl_weight', (0, drizzle_orm_1.sql) `${table.targetWeight} >= 0 and ${table.targetWeight} <= 1`)
}));
/**
 * client_portfolio_assignments
 * Asignaciones de plantillas a clientes, con estado y vigencia.
 */
exports.clientPortfolioAssignments = (0, pg_core_1.pgTable)('client_portfolio_assignments', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    contactId: (0, pg_core_1.uuid)('contact_id').notNull().references(() => exports.contacts.id),
    templateId: (0, pg_core_1.uuid)('template_id').notNull().references(() => exports.portfolioTemplates.id),
    status: (0, pg_core_1.text)('status').notNull(), // active, paused, ended
    startDate: (0, pg_core_1.date)('start_date').notNull(),
    endDate: (0, pg_core_1.date)('end_date'),
    notes: (0, pg_core_1.text)('notes'),
    createdByUserId: (0, pg_core_1.uuid)('created_by_user_id').notNull().references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    cpaUnique: (0, pg_core_1.uniqueIndex)('client_portfolio_assignments_unique').on(table.contactId, table.templateId, table.startDate),
    cpaActiveIdx: (0, pg_core_1.index)('idx_cpa_active').on(table.contactId).where((0, drizzle_orm_1.sql) `${table.status} = 'active'`)
}));
/**
 * client_portfolio_overrides
 * Overrides por cliente/asignación a nivel clase o instrumento.
 */
exports.clientPortfolioOverrides = (0, pg_core_1.pgTable)('client_portfolio_overrides', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    assignmentId: (0, pg_core_1.uuid)('assignment_id').notNull().references(() => exports.clientPortfolioAssignments.id, { onDelete: 'cascade' }),
    targetType: (0, pg_core_1.text)('target_type').notNull(),
    assetClass: (0, pg_core_1.text)('asset_class').references(() => exports.lookupAssetClass.id),
    instrumentId: (0, pg_core_1.uuid)('instrument_id').references(() => exports.instruments.id),
    targetWeight: (0, pg_core_1.numeric)('target_weight', { precision: 7, scale: 4 }).notNull()
});
/**
 * portfolio_monitoring_snapshot
 * Snapshots diarios por cliente de desvíos totales.
 */
exports.portfolioMonitoringSnapshot = (0, pg_core_1.pgTable)('portfolio_monitoring_snapshot', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    contactId: (0, pg_core_1.uuid)('contact_id').notNull().references(() => exports.contacts.id),
    asOfDate: (0, pg_core_1.date)('as_of_date').notNull(),
    totalDeviationPct: (0, pg_core_1.numeric)('total_deviation_pct', { precision: 7, scale: 4 }).notNull(),
    generatedAt: (0, pg_core_1.timestamp)('generated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    pmsContactDateIdx: (0, pg_core_1.index)('idx_pms_contact_date').on(table.contactId, table.asOfDate)
}));
/**
 * portfolio_monitoring_details
 * Detalle de desvíos por asset/instrumento para un snapshot.
 */
exports.portfolioMonitoringDetails = (0, pg_core_1.pgTable)('portfolio_monitoring_details', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    snapshotId: (0, pg_core_1.uuid)('snapshot_id').notNull().references(() => exports.portfolioMonitoringSnapshot.id, { onDelete: 'cascade' }),
    targetType: (0, pg_core_1.text)('target_type').notNull(),
    assetClass: (0, pg_core_1.text)('asset_class').references(() => exports.lookupAssetClass.id),
    instrumentId: (0, pg_core_1.uuid)('instrument_id').references(() => exports.instruments.id),
    targetWeight: (0, pg_core_1.numeric)('target_weight', { precision: 7, scale: 4 }).notNull(),
    actualWeight: (0, pg_core_1.numeric)('actual_weight', { precision: 7, scale: 4 }).notNull(),
    deviationPct: (0, pg_core_1.numeric)('deviation_pct', { precision: 7, scale: 4 }).notNull()
});
// ==========================================================
// Reportes y métricas
// ==========================================================
/**
 * scheduled_reports
 * Programación de reportes (diarios/semanales) por usuario/owner.
 */
exports.scheduledReports = (0, pg_core_1.pgTable)('scheduled_reports', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.text)('name').notNull(),
    type: (0, pg_core_1.text)('type').notNull(), // daily_advisor, daily_manager, weekly_manager
    scheduleCron: (0, pg_core_1.text)('schedule_cron').notNull(),
    timezone: (0, pg_core_1.text)('timezone').notNull().default('America/Argentina/Buenos_Aires'),
    nextRunAt: (0, pg_core_1.timestamp)('next_run_at', { withTimezone: true }),
    lastRunAt: (0, pg_core_1.timestamp)('last_run_at', { withTimezone: true }),
    ownerUserId: (0, pg_core_1.uuid)('owner_user_id').notNull().references(() => exports.users.id),
    targets: (0, pg_core_1.jsonb)('targets').notNull().default((0, drizzle_orm_1.sql) `'{}'::jsonb`),
    params: (0, pg_core_1.jsonb)('params').notNull().default((0, drizzle_orm_1.sql) `'{}'::jsonb`),
    enabled: (0, pg_core_1.boolean)('enabled').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    schedReportsNextIdx: (0, pg_core_1.index)('idx_sched_reports_next').on(table.enabled, table.nextRunAt)
}));
/**
 * report_runs
 * Ejecuciones de reportes con estado y resumen de entrega.
 */
exports.reportRuns = (0, pg_core_1.pgTable)('report_runs', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    scheduledReportId: (0, pg_core_1.uuid)('scheduled_report_id').notNull().references(() => exports.scheduledReports.id, { onDelete: 'cascade' }),
    runAt: (0, pg_core_1.timestamp)('run_at', { withTimezone: true }).notNull().defaultNow(),
    status: (0, pg_core_1.text)('status').notNull(), // success, failed
    deliverySummary: (0, pg_core_1.jsonb)('delivery_summary').notNull().default((0, drizzle_orm_1.sql) `'{}'::jsonb`),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
});
/**
 * activity_events
 * Eventos de actividad para métricas y auditoría funcional.
 */
exports.activityEvents = (0, pg_core_1.pgTable)('activity_events', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => exports.users.id),
    advisorUserId: (0, pg_core_1.uuid)('advisor_user_id').references(() => exports.users.id),
    contactId: (0, pg_core_1.uuid)('contact_id').references(() => exports.contacts.id),
    type: (0, pg_core_1.text)('type').notNull(), // note_created, meeting_added, task_completed, login, download, portfolio_alert
    metadata: (0, pg_core_1.jsonb)('metadata').notNull().default((0, drizzle_orm_1.sql) `'{}'::jsonb`),
    occurredAt: (0, pg_core_1.timestamp)('occurred_at', { withTimezone: true }).notNull()
}, (table) => ({
    activityByUserIdx: (0, pg_core_1.index)('idx_activity_by_user').on(table.userId, table.occurredAt),
    activityByAdvisorIdx: (0, pg_core_1.index)('idx_activity_by_advisor').on(table.advisorUserId, table.occurredAt)
}));
/**
 * daily_metrics_user
 * Métricas agregadas por usuario/día para dashboards.
 */
exports.dailyMetricsUser = (0, pg_core_1.pgTable)('daily_metrics_user', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => exports.users.id),
    teamId: (0, pg_core_1.uuid)('team_id').references(() => exports.teams.id),
    date: (0, pg_core_1.date)('date').notNull(),
    numNewProspects: (0, pg_core_1.integer)('num_new_prospects').notNull().default(0),
    numContactsTouched: (0, pg_core_1.integer)('num_contacts_touched').notNull().default(0),
    numNotes: (0, pg_core_1.integer)('num_notes').notNull().default(0),
    numMeetings: (0, pg_core_1.integer)('num_meetings').notNull().default(0),
    numTasksCompleted: (0, pg_core_1.integer)('num_tasks_completed').notNull().default(0),
    aumTotal: (0, pg_core_1.numeric)('aum_total', { precision: 18, scale: 6 }).notNull().default((0, drizzle_orm_1.sql) `0`),
    liquidBalanceTotal: (0, pg_core_1.numeric)('liquid_balance_total', { precision: 18, scale: 6 }).notNull().default((0, drizzle_orm_1.sql) `0`),
    generatedAt: (0, pg_core_1.timestamp)('generated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    dailyMetricsUserUnique: (0, pg_core_1.uniqueIndex)('daily_metrics_user_unique').on(table.userId, table.date)
}));
/**
 * aum_snapshots
 * AUM histórico por cliente; base para reportes temporales.
 */
exports.aumSnapshots = (0, pg_core_1.pgTable)('aum_snapshots', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    contactId: (0, pg_core_1.uuid)('contact_id').notNull().references(() => exports.contacts.id),
    date: (0, pg_core_1.date)('date').notNull(),
    aumTotal: (0, pg_core_1.numeric)('aum_total', { precision: 18, scale: 6 }).notNull()
}, (table) => ({
    aumSnapshotsUnique: (0, pg_core_1.uniqueIndex)('aum_snapshots_unique').on(table.contactId, table.date)
}));
// ==========================================================
// Auditoría y alertas
// ==========================================================
/**
 * audit_logs
 * Auditoría técnica de acciones con contexto.
 */
exports.auditLogs = (0, pg_core_1.pgTable)('audit_logs', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    actorUserId: (0, pg_core_1.uuid)('actor_user_id').notNull().references(() => exports.users.id),
    action: (0, pg_core_1.text)('action').notNull(),
    entityType: (0, pg_core_1.text)('entity_type').notNull(),
    entityId: (0, pg_core_1.uuid)('entity_id').notNull(),
    context: (0, pg_core_1.jsonb)('context').notNull().default((0, drizzle_orm_1.sql) `'{}'::jsonb`),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
});
/**
 * alert_policies
 * Políticas configurables de alertas por scope (user/team/global).
 */
exports.alertPolicies = (0, pg_core_1.pgTable)('alert_policies', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    scope: (0, pg_core_1.text)('scope').notNull(), // user, team, global
    scopeId: (0, pg_core_1.uuid)('scope_id'),
    type: (0, pg_core_1.text)('type').notNull(), // saldo_liquido, desvio_cartera, inactividad
    params: (0, pg_core_1.jsonb)('params').notNull().default((0, drizzle_orm_1.sql) `'{}'::jsonb`),
    enabled: (0, pg_core_1.boolean)('enabled').notNull().default(true)
}, (table) => ({
    alertPoliciesUnique: (0, pg_core_1.uniqueIndex)('alert_policies_unique').on(table.scope, 
    // COALESCE(scope_id::text, 'global') equivalente como expresión
    (0, drizzle_orm_1.sql) `COALESCE(${table.scopeId}::text, 'global')`, table.type)
}));
// ==========================================================
// EPIC A: Datos & Atribución (AUM/Comisiones)
// ==========================================================
/**
 * stg_aum_madre
 * Staging: raw data del CSV madre "Balanz Cactus 2025 - AUM Balanz.csv".
 * FUENTE AUTORITATIVA de AUM y owner por cuenta/cliente.
 */
exports.stgAumMadre = (0, pg_core_1.pgTable)('stg_aum_madre', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    runId: (0, pg_core_1.uuid)('run_id').references(() => exports.integrationRuns.id, { onDelete: 'cascade' }),
    // Campos del CSV (coma decimal normalizada)
    actualizado: (0, pg_core_1.date)('actualizado'),
    idCuenta: (0, pg_core_1.text)('id_cuenta'), // idCuenta desde CSV
    comitente: (0, pg_core_1.integer)('comitente'),
    cuotapartista: (0, pg_core_1.integer)('cuotapartista'),
    descripcion: (0, pg_core_1.text)('descripcion'), // nombre cuenta
    asesor: (0, pg_core_1.text)('asesor'), // puede ser nombre o ID
    mail: (0, pg_core_1.text)('mail'),
    fechaAlta: (0, pg_core_1.date)('fecha_alta'),
    esJuridica: (0, pg_core_1.boolean)('es_juridica'),
    asesorTexto: (0, pg_core_1.text)('asesor_texto'), // asesor(texto) desde CSV
    equipo: (0, pg_core_1.text)('equipo'),
    unidad: (0, pg_core_1.text)('unidad'),
    arancel: (0, pg_core_1.text)('arancel'),
    esquemaComisiones: (0, pg_core_1.text)('esquema_comisiones'),
    referidor: (0, pg_core_1.text)('referidor'),
    negocio: (0, pg_core_1.text)('negocio'),
    primerFondeo: (0, pg_core_1.date)('primer_fondeo'),
    activo: (0, pg_core_1.boolean)('activo'),
    activoUlt12Meses: (0, pg_core_1.boolean)('activo_ult_12_meses'),
    aumEnDolares: (0, pg_core_1.numeric)('aum_en_dolares', { precision: 18, scale: 6 }),
    bolsaArg: (0, pg_core_1.numeric)('bolsa_arg', { precision: 18, scale: 6 }),
    fondosArg: (0, pg_core_1.numeric)('fondos_arg', { precision: 18, scale: 6 }),
    bolsaBci: (0, pg_core_1.numeric)('bolsa_bci', { precision: 18, scale: 6 }),
    pesos: (0, pg_core_1.numeric)('pesos', { precision: 18, scale: 6 }),
    mep: (0, pg_core_1.numeric)('mep', { precision: 18, scale: 6 }),
    cable: (0, pg_core_1.numeric)('cable', { precision: 18, scale: 6 }),
    cv7000: (0, pg_core_1.numeric)('cv7000', { precision: 18, scale: 6 }),
    cv10000: (0, pg_core_1.numeric)('cv10000', { precision: 18, scale: 6 }),
    // Metadatos
    processed: (0, pg_core_1.boolean)('processed').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
});
/**
 * stg_cluster_cuentas
 * Staging: raw data del reporte "Cluster Cuentas" (excel) mensual.
 * Usado para DESCUBRIMIENTO y refresh de atributos no-autoritativos.
 */
exports.stgClusterCuentas = (0, pg_core_1.pgTable)('stg_cluster_cuentas', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    runId: (0, pg_core_1.uuid)('run_id').references(() => exports.integrationRuns.id, { onDelete: 'cascade' }),
    // Campos del excel
    idcuenta: (0, pg_core_1.text)('idcuenta'),
    comitente: (0, pg_core_1.integer)('comitente'), // casted de decimal a int
    cuotapartista: (0, pg_core_1.integer)('cuotapartista'), // casted de decimal a int
    cuenta: (0, pg_core_1.text)('cuenta'),
    fechaAlta: (0, pg_core_1.date)('fecha_alta'),
    esJuridica: (0, pg_core_1.boolean)('es_juridica'),
    asesor: (0, pg_core_1.text)('asesor'), // raw, puede tener sufijos "2 - 1"
    equipo: (0, pg_core_1.text)('equipo'),
    unidad: (0, pg_core_1.text)('unidad'),
    arancel: (0, pg_core_1.text)('arancel'),
    esquemaComisiones: (0, pg_core_1.text)('esquema_comisiones'),
    referidor: (0, pg_core_1.text)('referidor'),
    negocio: (0, pg_core_1.text)('negocio'),
    primerFondeo: (0, pg_core_1.date)('primer_fondeo'),
    activo: (0, pg_core_1.boolean)('activo'),
    activoUlt12Meses: (0, pg_core_1.boolean)('activo_ult_12_meses'),
    aumEnDolares: (0, pg_core_1.numeric)('aum_en_dolares', { precision: 18, scale: 6 }),
    bolsaArg: (0, pg_core_1.numeric)('bolsa_arg', { precision: 18, scale: 6 }),
    fondosArg: (0, pg_core_1.numeric)('fondos_arg', { precision: 18, scale: 6 }),
    bolsaBci: (0, pg_core_1.numeric)('bolsa_bci', { precision: 18, scale: 6 }),
    pesos: (0, pg_core_1.numeric)('pesos', { precision: 18, scale: 6 }),
    mep: (0, pg_core_1.numeric)('mep', { precision: 18, scale: 6 }),
    cable: (0, pg_core_1.numeric)('cable', { precision: 18, scale: 6 }),
    cv7000: (0, pg_core_1.numeric)('cv7000', { precision: 18, scale: 6 }),
    cv10000: (0, pg_core_1.numeric)('cv10000', { precision: 18, scale: 6 }),
    // Metadatos
    processed: (0, pg_core_1.boolean)('processed').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
});
/**
 * stg_comisiones
 * Staging: raw data del reporte "Comisiones" (excel).
 */
exports.stgComisiones = (0, pg_core_1.pgTable)('stg_comisiones', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    runId: (0, pg_core_1.uuid)('run_id').references(() => exports.integrationRuns.id, { onDelete: 'cascade' }),
    // Campos del excel
    fechaConcertacion: (0, pg_core_1.date)('fecha_concertacion'),
    comitente: (0, pg_core_1.integer)('comitente'),
    cuotapartista: (0, pg_core_1.integer)('cuotapartista'),
    cuenta: (0, pg_core_1.text)('cuenta'),
    tipo: (0, pg_core_1.text)('tipo'),
    descripcion: (0, pg_core_1.text)('descripcion'),
    ticker: (0, pg_core_1.text)('ticker'),
    cantidad: (0, pg_core_1.numeric)('cantidad', { precision: 28, scale: 8 }),
    precio: (0, pg_core_1.numeric)('precio', { precision: 18, scale: 6 }),
    precioRef: (0, pg_core_1.numeric)('precio_ref', { precision: 18, scale: 6 }),
    ivaComision: (0, pg_core_1.numeric)('iva_comision', { precision: 18, scale: 6 }),
    comisionPesificada: (0, pg_core_1.numeric)('comision_pesificada', { precision: 18, scale: 6 }),
    cotizacionDolar: (0, pg_core_1.numeric)('cotizacion_dolar', { precision: 18, scale: 6 }),
    comisionDolarizada: (0, pg_core_1.numeric)('comision_dolarizada', { precision: 18, scale: 6 }),
    asesor: (0, pg_core_1.text)('asesor'), // raw
    cuilAsesor: (0, pg_core_1.text)('cuil_asesor'),
    equipo: (0, pg_core_1.text)('equipo'),
    unidadDeNegocio: (0, pg_core_1.text)('unidad_de_negocio'),
    productor: (0, pg_core_1.text)('productor'),
    idPersonaAsesor: (0, pg_core_1.integer)('id_persona_asesor'), // fuente de verdad para id asesor
    referidor: (0, pg_core_1.text)('referidor'),
    arancel: (0, pg_core_1.text)('arancel'),
    esquemaComisiones: (0, pg_core_1.text)('esquema_comisiones'),
    fechaAlta: (0, pg_core_1.date)('fecha_alta'),
    porcentaje: (0, pg_core_1.numeric)('porcentaje', { precision: 7, scale: 4 }), // para splits
    cuitFacturacion: (0, pg_core_1.text)('cuit_facturacion'),
    esJuridica: (0, pg_core_1.boolean)('es_juridica'),
    pais: (0, pg_core_1.text)('pais'),
    // Metadatos
    processed: (0, pg_core_1.boolean)('processed').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    stgComisionesFechaIdx: (0, pg_core_1.index)('idx_stg_comisiones_fecha').on(table.fechaConcertacion),
    stgComisionesComitIdx: (0, pg_core_1.index)('idx_stg_comisiones_comit').on(table.comitente)
}));
/**
 * dim_client
 * Dimensión de clientes normalizada desde staging.
 * Keys primarias: comitente + cuotapartista.
 */
exports.dimClient = (0, pg_core_1.pgTable)('dim_client', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    comitente: (0, pg_core_1.integer)('comitente').notNull(),
    cuotapartista: (0, pg_core_1.integer)('cuotapartista').notNull(),
    cuentaNorm: (0, pg_core_1.text)('cuenta_norm').notNull(), // normalizada: UPPER, sin tildes, trim
    idcuenta: (0, pg_core_1.text)('idcuenta'),
    esJuridica: (0, pg_core_1.boolean)('es_juridica'),
    fechaAlta: (0, pg_core_1.date)('fecha_alta'),
    activo: (0, pg_core_1.boolean)('activo'),
    primerFondeo: (0, pg_core_1.date)('primer_fondeo'),
    equipo: (0, pg_core_1.text)('equipo'),
    unidad: (0, pg_core_1.text)('unidad'),
    // Control de fuente
    descubiertoEnMadre: (0, pg_core_1.boolean)('descubierto_en_madre').notNull().default(false), // true si vino desde CSV madre
    descubiertoEnMensual: (0, pg_core_1.boolean)('descubierto_en_mensual').notNull().default(false), // true si vino desde mensual
    // Auditoría
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    dimClientComitCuotaUnique: (0, pg_core_1.uniqueIndex)('dim_client_comit_cuota_unique').on(table.comitente, table.cuotapartista),
    dimClientCuentaNormIdx: (0, pg_core_1.index)('idx_dim_client_cuenta_norm').on(table.cuentaNorm),
    dimClientEquipoIdx: (0, pg_core_1.index)('idx_dim_client_equipo').on(table.equipo)
}));
/**
 * dim_advisor
 * Dimensión de asesores normalizada.
 * Fuente primaria: idPersonaAsesor desde comisiones.
 */
exports.dimAdvisor = (0, pg_core_1.pgTable)('dim_advisor', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    idPersonaAsesor: (0, pg_core_1.integer)('id_persona_asesor').unique(), // source of truth
    asesorNorm: (0, pg_core_1.text)('asesor_norm').notNull(), // nombre normalizado
    cuilAsesor: (0, pg_core_1.text)('cuil_asesor'),
    equipo: (0, pg_core_1.text)('equipo'),
    unidad: (0, pg_core_1.text)('unidad'),
    arancel: (0, pg_core_1.text)('arancel'),
    esquemaComisiones: (0, pg_core_1.text)('esquema_comisiones'),
    referidor: (0, pg_core_1.text)('referidor'),
    // Auditoría
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    dimAdvisorNormIdx: (0, pg_core_1.index)('idx_dim_advisor_norm').on(table.asesorNorm),
    dimAdvisorEquipoIdx: (0, pg_core_1.index)('idx_dim_advisor_equipo').on(table.equipo)
}));
/**
 * map_asesor_variantes
 * Tabla de mapeo para vincular variantes de nombres de asesores a dim_advisor.
 * Ejemplo: "Juan Perez 2 - 1" -> "JUAN PEREZ"
 */
exports.mapAsesorVariantes = (0, pg_core_1.pgTable)('map_asesor_variantes', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    asesorRaw: (0, pg_core_1.text)('asesor_raw').notNull(), // nombre tal como viene en excel
    asesorNorm: (0, pg_core_1.text)('asesor_norm').notNull(), // nombre normalizado
    idAdvisor: (0, pg_core_1.uuid)('id_advisor').references(() => exports.dimAdvisor.id), // nullable hasta resolver
    confidence: (0, pg_core_1.numeric)('confidence', { precision: 4, scale: 3 }), // score de matching
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    mapAsesorRawUnique: (0, pg_core_1.uniqueIndex)('map_asesor_raw_unique').on(table.asesorRaw),
    mapAsesorNormIdx: (0, pg_core_1.index)('idx_map_asesor_norm').on(table.asesorNorm)
}));
/**
 * map_cuenta_variantes
 * Tabla de mapeo para normalización de cuentas.
 * Registra heurísticas de normalización aplicadas.
 */
exports.mapCuentaVariantes = (0, pg_core_1.pgTable)('map_cuenta_variantes', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    cuentaRaw: (0, pg_core_1.text)('cuenta_raw').notNull(),
    cuentaNorm: (0, pg_core_1.text)('cuenta_norm').notNull(),
    heuristica: (0, pg_core_1.text)('heuristica'), // descripción de regla aplicada
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    mapCuentaRawUnique: (0, pg_core_1.uniqueIndex)('map_cuenta_raw_unique').on(table.cuentaRaw)
}));
/**
 * fact_aum_snapshot
 * Tabla de hechos para AUM (Assets Under Management) por fecha.
 * Snapshot diario por cliente con breakdowns.
 */
exports.factAumSnapshot = (0, pg_core_1.pgTable)('fact_aum_snapshot', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    snapshotDate: (0, pg_core_1.date)('snapshot_date').notNull(),
    idClient: (0, pg_core_1.uuid)('id_client').notNull().references(() => exports.dimClient.id),
    idAdvisorOwner: (0, pg_core_1.uuid)('id_advisor_owner').references(() => exports.dimAdvisor.id), // dueño del cliente
    aumUsd: (0, pg_core_1.numeric)('aum_usd', { precision: 18, scale: 6 }).notNull(),
    // Breakdowns
    bolsaArg: (0, pg_core_1.numeric)('bolsa_arg', { precision: 18, scale: 6 }).default((0, drizzle_orm_1.sql) `0`),
    fondosArg: (0, pg_core_1.numeric)('fondos_arg', { precision: 18, scale: 6 }).default((0, drizzle_orm_1.sql) `0`),
    bolsaBci: (0, pg_core_1.numeric)('bolsa_bci', { precision: 18, scale: 6 }).default((0, drizzle_orm_1.sql) `0`),
    pesos: (0, pg_core_1.numeric)('pesos', { precision: 18, scale: 6 }).default((0, drizzle_orm_1.sql) `0`),
    mep: (0, pg_core_1.numeric)('mep', { precision: 18, scale: 6 }).default((0, drizzle_orm_1.sql) `0`),
    cable: (0, pg_core_1.numeric)('cable', { precision: 18, scale: 6 }).default((0, drizzle_orm_1.sql) `0`),
    cv7000: (0, pg_core_1.numeric)('cv7000', { precision: 18, scale: 6 }).default((0, drizzle_orm_1.sql) `0`),
    cv10000: (0, pg_core_1.numeric)('cv10000', { precision: 18, scale: 6 }).default((0, drizzle_orm_1.sql) `0`),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    factAumSnapshotUnique: (0, pg_core_1.uniqueIndex)('fact_aum_snapshot_unique').on(table.snapshotDate, table.idClient),
    factAumSnapshotDateIdx: (0, pg_core_1.index)('idx_fact_aum_snapshot_date').on(table.snapshotDate),
    factAumSnapshotAdvisorIdx: (0, pg_core_1.index)('idx_fact_aum_snapshot_advisor').on(table.idAdvisorOwner),
    // Constraint: suma de breakdowns debe aproximarse a aumUsd
    aumBreakdownCheck: (0, pg_core_1.check)('chk_aum_breakdown', (0, drizzle_orm_1.sql) `ABS(${table.aumUsd} - (COALESCE(${table.bolsaArg},0) + COALESCE(${table.fondosArg},0) + COALESCE(${table.bolsaBci},0) + COALESCE(${table.pesos},0) + COALESCE(${table.mep},0) + COALESCE(${table.cable},0) + COALESCE(${table.cv7000},0) + COALESCE(${table.cv10000},0))) <= 0.02`)
}));
/**
 * fact_commission
 * Tabla de hechos para comisiones.
 * Registra cada operación con su comisión dolarizada y allocada por porcentaje.
 */
exports.factCommission = (0, pg_core_1.pgTable)('fact_commission', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    opId: (0, pg_core_1.text)('op_id').notNull(), // identificador único de operación (generado)
    fecha: (0, pg_core_1.date)('fecha').notNull(),
    idClient: (0, pg_core_1.uuid)('id_client').notNull().references(() => exports.dimClient.id),
    idAdvisorBenef: (0, pg_core_1.uuid)('id_advisor_benef').references(() => exports.dimAdvisor.id), // quien cobra
    ticker: (0, pg_core_1.text)('ticker'),
    tipo: (0, pg_core_1.text)('tipo'),
    cantidad: (0, pg_core_1.numeric)('cantidad', { precision: 28, scale: 8 }),
    precio: (0, pg_core_1.numeric)('precio', { precision: 18, scale: 6 }),
    comisionUsd: (0, pg_core_1.numeric)('comision_usd', { precision: 18, scale: 6 }).notNull(),
    comisionUsdAlloc: (0, pg_core_1.numeric)('comision_usd_alloc', { precision: 18, scale: 6 }).notNull(), // con split aplicado
    ivaArs: (0, pg_core_1.numeric)('iva_ars', { precision: 18, scale: 6 }),
    porcentajeAlloc: (0, pg_core_1.numeric)('porcentaje_alloc', { precision: 7, scale: 4 }), // porcentaje aplicado
    equipo: (0, pg_core_1.text)('equipo'),
    unidad: (0, pg_core_1.text)('unidad'),
    // Flags
    ownerVsBenefMismatch: (0, pg_core_1.boolean)('owner_vs_benef_mismatch').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    factCommissionOpIdUnique: (0, pg_core_1.uniqueIndex)('fact_commission_op_id_unique').on(table.opId),
    factCommissionFechaIdx: (0, pg_core_1.index)('idx_fact_commission_fecha').on(table.fecha),
    factCommissionClientIdx: (0, pg_core_1.index)('idx_fact_commission_client').on(table.idClient),
    factCommissionAdvisorIdx: (0, pg_core_1.index)('idx_fact_commission_advisor').on(table.idAdvisorBenef),
    factCommissionTipoIdx: (0, pg_core_1.index)('idx_fact_commission_tipo').on(table.tipo)
}));
/**
 * matching_audit
 * Auditoría del proceso de matching cliente-comisión-asesor.
 * Registra cada decisión de match con estado, regla aplicada y contexto.
 */
exports.matchingAudit = (0, pg_core_1.pgTable)('matching_audit', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    runId: (0, pg_core_1.uuid)('run_id').references(() => exports.integrationRuns.id),
    sourceTable: (0, pg_core_1.text)('source_table').notNull(), // stg_aum_madre | stg_cluster_cuentas | stg_comisiones
    sourceRecordId: (0, pg_core_1.uuid)('source_record_id').notNull(),
    matchStatus: (0, pg_core_1.text)('match_status').notNull(), // matched | multi_match | no_match | mismatch_owner_benef | pending
    matchRule: (0, pg_core_1.text)('match_rule'), // P1_comitente | P2_cuotapartista | P3_cuenta_norm | P4_fuzzy
    targetClientId: (0, pg_core_1.uuid)('target_client_id').references(() => exports.dimClient.id),
    targetAdvisorId: (0, pg_core_1.uuid)('target_advisor_id').references(() => exports.dimAdvisor.id),
    confidence: (0, pg_core_1.numeric)('confidence', { precision: 4, scale: 3 }),
    context: (0, pg_core_1.jsonb)('context').notNull().default((0, drizzle_orm_1.sql) `'{}'::jsonb`),
    resolvedByUserId: (0, pg_core_1.uuid)('resolved_by_user_id').references(() => exports.users.id),
    resolvedAt: (0, pg_core_1.timestamp)('resolved_at', { withTimezone: true }),
    resolutionComment: (0, pg_core_1.text)('resolution_comment'), // Comentario obligatorio al resolver
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    matchingAuditSourceIdx: (0, pg_core_1.index)('idx_matching_audit_source').on(table.sourceTable, table.sourceRecordId),
    matchingAuditStatusIdx: (0, pg_core_1.index)('idx_matching_audit_status').on(table.matchStatus)
}));
/**
 * matching_resolutions
 * Tabla WORM (Write-Once-Read-Many) para resoluciones manuales de matching.
 * Auditoría inmutable de acciones manuales sobre casos pendientes.
 */
exports.matchingResolutions = (0, pg_core_1.pgTable)('matching_resolutions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    matchingAuditId: (0, pg_core_1.uuid)('matching_audit_id').notNull().references(() => exports.matchingAudit.id),
    action: (0, pg_core_1.text)('action').notNull(), // confirm | merge | ignore | remap
    targetIds: (0, pg_core_1.jsonb)('target_ids').notNull(), // IDs seleccionados en bulk
    comment: (0, pg_core_1.text)('comment').notNull(), // Comentario obligatorio
    resolvedByUserId: (0, pg_core_1.uuid)('resolved_by_user_id').notNull().references(() => exports.users.id),
    resolvedAt: (0, pg_core_1.timestamp)('resolved_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    matchingResolutionsAuditIdx: (0, pg_core_1.index)('idx_matching_resolutions_audit').on(table.matchingAuditId),
    matchingResolutionsUserIdx: (0, pg_core_1.index)('idx_matching_resolutions_user').on(table.resolvedByUserId)
}));
