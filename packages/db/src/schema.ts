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

export const lookupMeetingSource = pgTable('lookup_meeting_source', {
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
      roleIdx: index('idx_users_role').on(table.role)
    };
  }
);

// ==========================================================
// Sistema de Comparación Mensual de Cuentas
// ==========================================================

/**
 * maestro_cuentas
 * Tabla maestro con el estado vigente de todas las cuentas.
 * Fuente de verdad para comparaciones mensuales.
 */
export const maestroCuentas = pgTable(
  'maestro_cuentas',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    idcuenta: text('idcuenta').notNull(),
    comitente: integer('comitente').notNull(),
    cuotapartista: integer('cuotapartista').notNull(),
    descripcion: text('descripcion').notNull(), // nombre de la cuenta
    asesor: text('asesor'), // asesor asignado (fuente de verdad)
    // Metadatos
    activo: boolean('activo').notNull().default(true),
    fechaAlta: date('fecha_alta'),
    fechaUltimaActualizacion: timestamp('fecha_ultima_actualizacion', { withTimezone: true }).notNull().defaultNow(),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    maestroCuentasIdcuentaUnique: uniqueIndex('maestro_cuentas_idcuenta_unique').on(table.idcuenta),
    maestroCuentasComitenteCuotaIdx: index('idx_maestro_cuentas_comitente_cuota').on(table.comitente, table.cuotapartista),
    maestroCuentasAsesorIdx: index('idx_maestro_cuentas_asesor').on(table.asesor),
    maestroCuentasActivoIdx: index('idx_maestro_cuentas_activo').on(table.activo)
  })
);

/**
 * staging_mensual
 * Tabla temporal para datos del Excel mensual antes de aplicar cambios.
 * Se limpia después de cada procesamiento.
 */
export const stagingMensual = pgTable(
  'staging_mensual',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    cargaId: uuid('carga_id').notNull(), // referencia a auditoria_cargas
    idcuenta: text('idcuenta').notNull(),
    comitente: integer('comitente').notNull(),
    cuotapartista: integer('cuotapartista').notNull(),
    descripcion: text('descripcion').notNull(),
    asesor: text('asesor'), // del Excel (puede estar vacío)
    // Metadatos del archivo
    hashArchivo: text('hash_archivo').notNull(),
    fechaCarga: timestamp('fecha_carga', { withTimezone: true }).notNull().defaultNow(),
    procesado: boolean('procesado').notNull().default(false)
  },
  (table) => ({
    stagingMensualCargaIdx: index('idx_staging_mensual_carga').on(table.cargaId),
    stagingMensualIdcuentaIdx: index('idx_staging_mensual_idcuenta').on(table.idcuenta),
    stagingMensualHashIdx: index('idx_staging_mensual_hash').on(table.hashArchivo)
  })
);

/**
 * asignaciones_asesor
 * Asignaciones manuales de asesores para clientes sueltos.
 * Permite completar datos faltantes y reasignar asesores.
 */
export const asignacionesAsesor = pgTable(
  'asignaciones_asesor',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    idcuenta: text('idcuenta').notNull(),
    asesorAnterior: text('asesor_anterior'), // valor previo (si había)
    asesorNuevo: text('asesor_nuevo').notNull(), // nuevo valor asignado
    motivo: text('motivo'), // razón del cambio
    aplicado: boolean('aplicado').notNull().default(false),
    aplicadoEn: timestamp('aplicado_en', { withTimezone: true }),
    cargaId: uuid('carga_id').notNull(), // referencia a auditoria_cargas
    asignadoPorUserId: uuid('asignado_por_user_id').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    asignacionesAsesorIdcuentaIdx: index('idx_asignaciones_asesor_idcuenta').on(table.idcuenta),
    asignacionesAsesorCargaIdx: index('idx_asignaciones_asesor_carga').on(table.cargaId),
    asignacionesAsesorAplicadoIdx: index('idx_asignaciones_asesor_aplicado').on(table.aplicado)
  })
);

/**
 * auditoria_cargas
 * Registro de cada carga mensual con metadatos y resultados.
 * Permite trazabilidad y control de idempotencia.
 */
export const auditoriaCargas = pgTable(
  'auditoria_cargas',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    mes: text('mes').notNull(), // formato YYYY-MM
    nombreArchivo: text('nombre_archivo').notNull(),
    hashArchivo: text('hash_archivo').notNull(),
    tamanoArchivo: integer('tamano_archivo').notNull(),
    // Estadísticas de la carga
    totalRegistros: integer('total_registros').notNull(),
    nuevosDetectados: integer('nuevos_detectados').notNull().default(0),
    modificadosDetectados: integer('modificados_detectados').notNull().default(0),
    ausentesDetectados: integer('ausentes_detectados').notNull().default(0),
    sinAsesor: integer('sin_asesor').notNull().default(0),
    // Estado del procesamiento
    estado: text('estado').notNull().default('cargado'), // cargado, revisando, aplicado, cancelado
    aplicadoEn: timestamp('aplicado_en', { withTimezone: true }),
    aplicadoPorUserId: uuid('aplicado_por_user_id').references(() => users.id),
    // Metadatos
    cargadoPorUserId: uuid('cargado_por_user_id').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    auditoriaCargasMesIdx: index('idx_auditoria_cargas_mes').on(table.mes),
    auditoriaCargasHashIdx: index('idx_auditoria_cargas_hash').on(table.hashArchivo),
    auditoriaCargasEstadoIdx: index('idx_auditoria_cargas_estado').on(table.estado),
    auditoriaCargasMesHashUnique: uniqueIndex('auditoria_cargas_mes_hash_unique').on(table.mes, table.hashArchivo)
  })
);

/**
 * snapshots_maestro
 * Snapshots históricos del maestro antes y después de aplicar cambios.
 * Permite auditoría completa y rollback si es necesario.
 */
export const snapshotsMaestro = pgTable(
  'snapshots_maestro',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    cargaId: uuid('carga_id').notNull().references(() => auditoriaCargas.id),
    tipo: text('tipo').notNull(), // 'antes' o 'despues'
    // Snapshot completo del maestro en JSON
    datos: jsonb('datos').notNull(),
    // Metadatos
    totalRegistros: integer('total_registros').notNull(),
    hashDatos: text('hash_datos').notNull(), // hash de los datos para verificación
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    snapshotsMaestroCargaIdx: index('idx_snapshots_maestro_carga').on(table.cargaId),
    snapshotsMaestroTipoIdx: index('idx_snapshots_maestro_tipo').on(table.tipo),
    snapshotsMaestroHashIdx: index('idx_snapshots_maestro_hash').on(table.hashDatos)
  })
);

/**
 * diff_detalle
 * Detalle de los cambios detectados en cada carga.
 * Registra qué cambió exactamente en cada registro.
 */
export const diffDetalle = pgTable(
  'diff_detalle',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    cargaId: uuid('carga_id').notNull().references(() => auditoriaCargas.id),
    tipo: text('tipo').notNull(), // 'nuevo', 'modificado', 'ausente'
    idcuenta: text('idcuenta').notNull(),
    // Valores anteriores (null para nuevos)
    comitenteAnterior: integer('comitente_anterior'),
    cuotapartistaAnterior: integer('cuotapartista_anterior'),
    descripcionAnterior: text('descripcion_anterior'),
    asesorAnterior: text('asesor_anterior'),
    // Valores nuevos (null para ausentes)
    comitenteNuevo: integer('comitente_nuevo'),
    cuotapartistaNuevo: integer('cuotapartista_nuevo'),
    descripcionNueva: text('descripcion_nueva'),
    asesorNuevo: text('asesor_nuevo'),
    // Metadatos
    camposCambiados: text('campos_cambiados').array().notNull().default(sql`'{}'::text[]`),
    requiereConfirmacionAsesor: boolean('requiere_confirmacion_asesor').notNull().default(false),
    aplicado: boolean('aplicado').notNull().default(false),
    aplicadoEn: timestamp('aplicado_en', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    diffDetalleCargaIdx: index('idx_diff_detalle_carga').on(table.cargaId),
    diffDetalleTipoIdx: index('idx_diff_detalle_tipo').on(table.tipo),
    diffDetalleIdcuentaIdx: index('idx_diff_detalle_idcuenta').on(table.idcuenta),
    diffDetalleAplicadoIdx: index('idx_diff_detalle_aplicado').on(table.aplicado),
    diffDetalleConfirmacionIdx: index('idx_diff_detalle_confirmacion').on(table.requiereConfirmacionAsesor)
  })
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
    phoneSecondary: text('phone_secondary'),
    whatsapp: text('whatsapp'),
    address: text('address'),
    city: text('city'),
    country: text('country').default('AR'),
    dateOfBirth: date('date_of_birth'),
    lifecycleStage: text('lifecycle_stage').notNull(), // lead, prospect, client, inactive
    pipelineStageId: uuid('pipeline_stage_id').references(() => pipelineStages.id),
    source: text('source'),
    riskProfile: text('risk_profile'), // low, mid, high
    assignedAdvisorId: uuid('assigned_advisor_id').references(() => users.id),
    assignedTeamId: uuid('assigned_team_id').references(() => teams.id),
    notes: text('notes'),
    customFields: jsonb('custom_fields').notNull().default(sql`'{}'::jsonb`),
    contactLastTouchAt: timestamp('contact_last_touch_at', { withTimezone: true }),
    pipelineStageUpdatedAt: timestamp('pipeline_stage_updated_at', { withTimezone: true }),
    slaStatus: text('sla_status').notNull().default('ok'), // ok, warning, overdue
    slaDueAt: timestamp('sla_due_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    contactsAdvisorIdx: index('idx_contacts_advisor').on(table.assignedAdvisorId),
    contactsStageIdx: index('idx_contacts_stage').on(table.lifecycleStage),
    contactsPipelineStageIdx: index('idx_contacts_pipeline_stage').on(table.pipelineStageId),
    contactsTouchIdx: index('idx_contacts_touch').on(table.contactLastTouchAt),
    contactsSlaStatusIdx: index('idx_contacts_sla_status').on(table.slaStatus, table.slaDueAt),
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
    pipelineHistoryIdx: index('idx_pipeline_history_contact').on(table.contactId, table.changedAt)
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
    meetingId: uuid('meeting_id').references(() => meetings.id, { onDelete: 'cascade' }),
    uploadedByUserId: uuid('uploaded_by_user_id').notNull().references(() => users.id),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    attachmentsContactIdx: index('idx_attachments_contact').on(table.contactId),
    attachmentsNoteIdx: index('idx_attachments_note').on(table.noteId),
    attachmentsMeetingIdx: index('idx_attachments_meeting').on(table.meetingId)
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
    contactTagUnique: uniqueIndex('contact_tags_unique').on(table.contactId, table.tagId)
  })
);

// ==========================================================
// Reuniones y Notas con IA
// ==========================================================

/**
 * meetings
 * Reuniones vinculadas a un contacto y organizadas por un usuario.
 */
export const meetings = pgTable(
  'meetings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contactId: uuid('contact_id').notNull().references(() => contacts.id),
    organizerUserId: uuid('organizer_user_id').notNull().references(() => users.id),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    source: text('source').notNull().references(() => lookupMeetingSource.id),
    externalMeetingId: text('external_meeting_id'),
    recordingUrl: text('recording_url'),
    status: text('status').notNull(), // scheduled, completed, cancelled
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    meetingsContactStartedIdx: index('idx_meetings_contact_started').on(table.contactId, table.startedAt)
  })
);

/**
 * meeting_participants
 * Participantes (user/contact/external) en una reunión.
 */
export const meetingParticipants = pgTable('meeting_participants', {
  id: uuid('id').defaultRandom().primaryKey(),
  meetingId: uuid('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  participantType: text('participant_type').notNull(), // user, contact, external
  userId: uuid('user_id').references(() => users.id),
  contactId: uuid('contact_id').references(() => contacts.id),
  email: text('email'),
  displayName: text('display_name')
});

/**
 * transcription_segments
 * Fragmentos de transcripción con marcas de tiempo y orador.
 */
export const transcriptionSegments = pgTable('transcription_segments', {
  id: uuid('id').defaultRandom().primaryKey(),
  meetingId: uuid('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  startMs: integer('start_ms').notNull(),
  endMs: integer('end_ms').notNull(),
  speakerLabel: text('speaker_label'),
  text: text('text').notNull()
});

/**
 * meeting_ai
 * Resultados de IA por reunión (resumen, compromisos, keywords, sentimiento).
 */
export const meetingAi = pgTable(
  'meeting_ai',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    meetingId: uuid('meeting_id').notNull().unique().references(() => meetings.id, { onDelete: 'cascade' }),
    model: text('model').notNull(),
    promptVersion: text('prompt_version'),
    summary: text('summary'),
    actionItems: jsonb('action_items').notNull().default(sql`'[]'::jsonb`),
    commitments: jsonb('commitments').notNull().default(sql`'[]'::jsonb`),
    keywords: text('keywords').array().notNull().default(sql`'{}'::text[]`),
    sentiment: numeric('sentiment', { precision: 4, scale: 3 }),
    language: text('language'),
    durationMs: integer('duration_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    // GIN keywords via migración SQL
    meetingAiKeywordsIdx: index('idx_meeting_ai_keywords_dummy').on(table.meetingId)
  })
);

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
 * Notas unificadas (IA/manual/import) asociadas a contacto y opcionalmente reunión.
 */
export const notes = pgTable(
  'notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contactId: uuid('contact_id').notNull().references(() => contacts.id),
    meetingId: uuid('meeting_id').references(() => meetings.id, { onDelete: 'set null' }),
    authorUserId: uuid('author_user_id').references(() => users.id),
    source: text('source').notNull(), // ai, manual, import
    noteType: text('note_type').notNull(), // summary, action_items, transcription, general, audio
    content: text('content').notNull(),
    audioFileId: uuid('audio_file_id').references(() => audioFiles.id),
    transcriptionStatus: text('transcription_status'), // pending, processing, completed, failed
    keywords: text('keywords').array().notNull().default(sql`'{}'::text[]`),
    sentiment: numeric('sentiment', { precision: 4, scale: 3 }),
    language: text('language'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    notesContactCreatedIdx: index('idx_notes_contact_created').on(table.contactId, table.createdAt),
    notesTranscriptionStatusIdx: index('idx_notes_transcription_status').on(table.transcriptionStatus),
    // GIN keywords y FTS via migración SQL
    notesKeywordsIdx: index('idx_notes_keywords_dummy').on(table.contactId)
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

/**
 * meeting_tags
 * Relación N:M entre reuniones y etiquetas.
 */
export const meetingTags = pgTable(
  'meeting_tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    meetingId: uuid('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    meetingTagUnique: uniqueIndex('meeting_tags_unique').on(table.meetingId, table.tagId)
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
    meetingId: uuid('meeting_id').references(() => meetings.id),
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
    tasksRecurrenceIdx: index('idx_tasks_recurrence').on(table.recurrenceId)
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

/**
 * staging_raw_records
 * Registros crudos para parseo/ETL, con flag de procesado.
 */
export const stagingRawRecords = pgTable('staging_raw_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id').notNull().references(() => integrationRuns.id, { onDelete: 'cascade' }),
  source: text('source').notNull(), // movimientos, saldos, posiciones, extractos
  raw: jsonb('raw').notNull(),
  processed: boolean('processed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

/**
 * parse_errors
 * Errores detectados durante el parseo por run.
 */
export const parseErrors = pgTable('parse_errors', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id').notNull().references(() => integrationRuns.id, { onDelete: 'cascade' }),
  recordRef: text('record_ref'),
  error: text('error').notNull(),
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
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true })
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
    targetWeightCheck: check('chk_ptl_weight', sql`${table.targetWeight} >= 0 and ${table.targetWeight} <= 1`)
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
    numMeetings: integer('num_meetings').notNull().default(0),
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
// EPIC A: Datos & Atribución (AUM/Comisiones)
// ==========================================================

/**
 * stg_cluster_cuentas
 * Staging: raw data del reporte "Cluster Cuentas" (excel).
 * Contiene todos los campos tal como vienen del archivo fuente.
 */
export const stgClusterCuentas = pgTable('stg_cluster_cuentas', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id').references(() => integrationRuns.id, { onDelete: 'cascade' }),
  // Campos del excel
  idcuenta: text('idcuenta'),
  comitente: integer('comitente'), // casted de decimal a int
  cuotapartista: integer('cuotapartista'), // casted de decimal a int
  cuenta: text('cuenta'),
  fechaAlta: date('fecha_alta'),
  esJuridica: boolean('es_juridica'),
  asesor: text('asesor'), // raw, puede tener sufijos "2 - 1"
  equipo: text('equipo'),
  unidad: text('unidad'),
  arancel: text('arancel'),
  esquemaComisiones: text('esquema_comisiones'),
  referidor: text('referidor'),
  negocio: text('negocio'),
  primerFondeo: date('primer_fondeo'),
  activo: boolean('activo'),
  activoUlt12Meses: boolean('activo_ult_12_meses'),
  aumEnDolares: numeric('aum_en_dolares', { precision: 18, scale: 6 }),
  bolsaArg: numeric('bolsa_arg', { precision: 18, scale: 6 }),
  fondosArg: numeric('fondos_arg', { precision: 18, scale: 6 }),
  bolsaBci: numeric('bolsa_bci', { precision: 18, scale: 6 }),
  pesos: numeric('pesos', { precision: 18, scale: 6 }),
  mep: numeric('mep', { precision: 18, scale: 6 }),
  cable: numeric('cable', { precision: 18, scale: 6 }),
  cv7000: numeric('cv7000', { precision: 18, scale: 6 }),
  cv10000: numeric('cv10000', { precision: 18, scale: 6 }),
  // Metadatos
  processed: boolean('processed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

/**
 * stg_comisiones
 * Staging: raw data del reporte "Comisiones" (excel).
 */
export const stgComisiones = pgTable(
  'stg_comisiones',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    runId: uuid('run_id').references(() => integrationRuns.id, { onDelete: 'cascade' }),
    // Campos del excel
    fechaConcertacion: date('fecha_concertacion'),
    comitente: integer('comitente'),
    cuotapartista: integer('cuotapartista'),
    cuenta: text('cuenta'),
    tipo: text('tipo'),
    descripcion: text('descripcion'),
    ticker: text('ticker'),
    cantidad: numeric('cantidad', { precision: 28, scale: 8 }),
    precio: numeric('precio', { precision: 18, scale: 6 }),
    precioRef: numeric('precio_ref', { precision: 18, scale: 6 }),
    ivaComision: numeric('iva_comision', { precision: 18, scale: 6 }),
    comisionPesificada: numeric('comision_pesificada', { precision: 18, scale: 6 }),
    cotizacionDolar: numeric('cotizacion_dolar', { precision: 18, scale: 6 }),
    comisionDolarizada: numeric('comision_dolarizada', { precision: 18, scale: 6 }),
    asesor: text('asesor'), // raw
    cuilAsesor: text('cuil_asesor'),
    equipo: text('equipo'),
    unidadDeNegocio: text('unidad_de_negocio'),
    productor: text('productor'),
    idPersonaAsesor: integer('id_persona_asesor'), // fuente de verdad para id asesor
    referidor: text('referidor'),
    arancel: text('arancel'),
    esquemaComisiones: text('esquema_comisiones'),
    fechaAlta: date('fecha_alta'),
    porcentaje: numeric('porcentaje', { precision: 7, scale: 4 }), // para splits
    cuitFacturacion: text('cuit_facturacion'),
    esJuridica: boolean('es_juridica'),
    pais: text('pais'),
    // Metadatos
    processed: boolean('processed').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    stgComisionesFechaIdx: index('idx_stg_comisiones_fecha').on(table.fechaConcertacion),
    stgComisionesComitIdx: index('idx_stg_comisiones_comit').on(table.comitente)
  })
);

/**
 * dim_client
 * Dimensión de clientes normalizada desde staging.
 * Keys primarias: comitente + cuotapartista.
 */
export const dimClient = pgTable(
  'dim_client',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    comitente: integer('comitente').notNull(),
    cuotapartista: integer('cuotapartista').notNull(),
    cuentaNorm: text('cuenta_norm').notNull(), // normalizada: UPPER, sin tildes, trim
    idcuenta: text('idcuenta'),
    esJuridica: boolean('es_juridica'),
    fechaAlta: date('fecha_alta'),
    activo: boolean('activo'),
    primerFondeo: date('primer_fondeo'),
    equipo: text('equipo'),
    unidad: text('unidad'),
    // Auditoría
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    dimClientComitCuotaUnique: uniqueIndex('dim_client_comit_cuota_unique').on(
      table.comitente,
      table.cuotapartista
    ),
    dimClientCuentaNormIdx: index('idx_dim_client_cuenta_norm').on(table.cuentaNorm),
    dimClientEquipoIdx: index('idx_dim_client_equipo').on(table.equipo)
  })
);

/**
 * dim_advisor
 * Dimensión de asesores normalizada.
 * Fuente primaria: idPersonaAsesor desde comisiones.
 */
export const dimAdvisor = pgTable(
  'dim_advisor',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    idPersonaAsesor: integer('id_persona_asesor').unique(), // source of truth
    asesorNorm: text('asesor_norm').notNull(), // nombre normalizado
    cuilAsesor: text('cuil_asesor'),
    equipo: text('equipo'),
    unidad: text('unidad'),
    arancel: text('arancel'),
    esquemaComisiones: text('esquema_comisiones'),
    referidor: text('referidor'),
    // Auditoría
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    dimAdvisorNormIdx: index('idx_dim_advisor_norm').on(table.asesorNorm),
    dimAdvisorEquipoIdx: index('idx_dim_advisor_equipo').on(table.equipo)
  })
);

/**
 * map_asesor_variantes
 * Tabla de mapeo para vincular variantes de nombres de asesores a dim_advisor.
 * Ejemplo: "Juan Perez 2 - 1" -> "JUAN PEREZ"
 */
export const mapAsesorVariantes = pgTable(
  'map_asesor_variantes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    asesorRaw: text('asesor_raw').notNull(), // nombre tal como viene en excel
    asesorNorm: text('asesor_norm').notNull(), // nombre normalizado
    idAdvisor: uuid('id_advisor').references(() => dimAdvisor.id), // nullable hasta resolver
    confidence: numeric('confidence', { precision: 4, scale: 3 }), // score de matching
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    mapAsesorRawUnique: uniqueIndex('map_asesor_raw_unique').on(table.asesorRaw),
    mapAsesorNormIdx: index('idx_map_asesor_norm').on(table.asesorNorm)
  })
);

/**
 * map_cuenta_variantes
 * Tabla de mapeo para normalización de cuentas.
 * Registra heurísticas de normalización aplicadas.
 */
export const mapCuentaVariantes = pgTable(
  'map_cuenta_variantes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    cuentaRaw: text('cuenta_raw').notNull(),
    cuentaNorm: text('cuenta_norm').notNull(),
    heuristica: text('heuristica'), // descripción de regla aplicada
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    mapCuentaRawUnique: uniqueIndex('map_cuenta_raw_unique').on(table.cuentaRaw)
  })
);

/**
 * fact_aum_snapshot
 * Tabla de hechos para AUM (Assets Under Management) por fecha.
 * Snapshot diario por cliente con breakdowns.
 */
export const factAumSnapshot = pgTable(
  'fact_aum_snapshot',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    snapshotDate: date('snapshot_date').notNull(),
    idClient: uuid('id_client').notNull().references(() => dimClient.id),
    idAdvisorOwner: uuid('id_advisor_owner').references(() => dimAdvisor.id), // dueño del cliente
    aumUsd: numeric('aum_usd', { precision: 18, scale: 6 }).notNull(),
    // Breakdowns
    bolsaArg: numeric('bolsa_arg', { precision: 18, scale: 6 }).default(sql`0`),
    fondosArg: numeric('fondos_arg', { precision: 18, scale: 6 }).default(sql`0`),
    bolsaBci: numeric('bolsa_bci', { precision: 18, scale: 6 }).default(sql`0`),
    pesos: numeric('pesos', { precision: 18, scale: 6 }).default(sql`0`),
    mep: numeric('mep', { precision: 18, scale: 6 }).default(sql`0`),
    cable: numeric('cable', { precision: 18, scale: 6 }).default(sql`0`),
    cv7000: numeric('cv7000', { precision: 18, scale: 6 }).default(sql`0`),
    cv10000: numeric('cv10000', { precision: 18, scale: 6 }).default(sql`0`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    factAumSnapshotUnique: uniqueIndex('fact_aum_snapshot_unique').on(
      table.snapshotDate,
      table.idClient
    ),
    factAumSnapshotDateIdx: index('idx_fact_aum_snapshot_date').on(table.snapshotDate),
    factAumSnapshotAdvisorIdx: index('idx_fact_aum_snapshot_advisor').on(table.idAdvisorOwner),
    // Constraint: suma de breakdowns debe aproximarse a aumUsd
    aumBreakdownCheck: check(
      'chk_aum_breakdown',
      sql`ABS(${table.aumUsd} - (COALESCE(${table.bolsaArg},0) + COALESCE(${table.fondosArg},0) + COALESCE(${table.bolsaBci},0) + COALESCE(${table.pesos},0) + COALESCE(${table.mep},0) + COALESCE(${table.cable},0) + COALESCE(${table.cv7000},0) + COALESCE(${table.cv10000},0))) <= 0.02`
    )
  })
);

/**
 * fact_commission
 * Tabla de hechos para comisiones.
 * Registra cada operación con su comisión dolarizada y allocada por porcentaje.
 */
export const factCommission = pgTable(
  'fact_commission',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    opId: text('op_id').notNull(), // identificador único de operación (generado)
    fecha: date('fecha').notNull(),
    idClient: uuid('id_client').notNull().references(() => dimClient.id),
    idAdvisorBenef: uuid('id_advisor_benef').references(() => dimAdvisor.id), // quien cobra
    ticker: text('ticker'),
    tipo: text('tipo'),
    cantidad: numeric('cantidad', { precision: 28, scale: 8 }),
    precio: numeric('precio', { precision: 18, scale: 6 }),
    comisionUsd: numeric('comision_usd', { precision: 18, scale: 6 }).notNull(),
    comisionUsdAlloc: numeric('comision_usd_alloc', { precision: 18, scale: 6 }).notNull(), // con split aplicado
    ivaArs: numeric('iva_ars', { precision: 18, scale: 6 }),
    porcentajeAlloc: numeric('porcentaje_alloc', { precision: 7, scale: 4 }), // porcentaje aplicado
    equipo: text('equipo'),
    unidad: text('unidad'),
    // Flags
    ownerVsBenefMismatch: boolean('owner_vs_benef_mismatch').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    factCommissionOpIdUnique: uniqueIndex('fact_commission_op_id_unique').on(table.opId),
    factCommissionFechaIdx: index('idx_fact_commission_fecha').on(table.fecha),
    factCommissionClientIdx: index('idx_fact_commission_client').on(table.idClient),
    factCommissionAdvisorIdx: index('idx_fact_commission_advisor').on(table.idAdvisorBenef),
    factCommissionTipoIdx: index('idx_fact_commission_tipo').on(table.tipo)
  })
);

/**
 * matching_audit
 * Auditoría del proceso de matching cliente-comisión-asesor.
 * Registra cada decisión de match con estado, regla aplicada y contexto.
 */
export const matchingAudit = pgTable(
  'matching_audit',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    runId: uuid('run_id').references(() => integrationRuns.id),
    sourceTable: text('source_table').notNull(), // stg_cluster_cuentas | stg_comisiones
    sourceRecordId: uuid('source_record_id').notNull(),
    matchStatus: text('match_status').notNull(), // matched | multi_match | no_match | mismatch_owner_benef | pending
    matchRule: text('match_rule'), // P1_comitente | P2_cuotapartista | P3_cuenta_norm | P4_fuzzy
    targetClientId: uuid('target_client_id').references(() => dimClient.id),
    targetAdvisorId: uuid('target_advisor_id').references(() => dimAdvisor.id),
    confidence: numeric('confidence', { precision: 4, scale: 3 }),
    context: jsonb('context').notNull().default(sql`'{}'::jsonb`),
    resolvedByUserId: uuid('resolved_by_user_id').references(() => users.id),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    matchingAuditSourceIdx: index('idx_matching_audit_source').on(table.sourceTable, table.sourceRecordId),
    matchingAuditStatusIdx: index('idx_matching_audit_status').on(table.matchStatus)
  })
);

