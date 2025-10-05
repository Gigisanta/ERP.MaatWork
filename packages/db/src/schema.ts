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
    isActive: boolean('is_active').notNull().default(true),
    teamId: uuid('team_id').references(() => teams.id),
    // FK self-referencial agregado vía migración SQL para evitar ciclo de tipos en TS
    managerId: uuid('manager_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => {
    return {
      emailUnique: uniqueIndex('users_email_unique').on(table.email),
      roleIdx: index('idx_users_role').on(table.role),
      managerIdx: index('idx_users_manager').on(table.managerId),
      teamIdx: index('idx_users_team').on(table.teamId)
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

// ==========================================================
// Contactos y pipeline
// ==========================================================

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
    lifecycleStage: text('lifecycle_stage').notNull(), // lead, prospect, client, inactive
    source: text('source'),
    riskProfile: text('risk_profile'), // low, mid, high
    assignedAdvisorId: uuid('assigned_advisor_id').references(() => users.id),
    assignedTeamId: uuid('assigned_team_id').references(() => teams.id),
    notes: text('notes'),
    contactLastTouchAt: timestamp('contact_last_touch_at', { withTimezone: true }),
    pipelineStageUpdatedAt: timestamp('pipeline_stage_updated_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    contactsAdvisorIdx: index('idx_contacts_advisor').on(table.assignedAdvisorId),
    contactsStageIdx: index('idx_contacts_stage').on(table.lifecycleStage),
    contactsTouchIdx: index('idx_contacts_touch').on(table.contactLastTouchAt),
    // TRGM GIN index creado vía migración SQL
    contactsNameIdx: index('idx_contacts_full_name').on(table.fullName),
    contactsEmailUnique: uniqueIndex('contacts_email_unique').on(table.email)
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
// Etiquetas
// ==========================================================

/**
 * tags
 * Etiquetas dinámicas por alcance (contact/meeting/note).
 */
export const tags = pgTable(
  'tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scope: text('scope').notNull(), // contact, meeting, note
    name: text('name').notNull(),
    isSystem: boolean('is_system').notNull().default(false),
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    scopeNameUnique: uniqueIndex('tags_scope_name_unique').on(table.scope, table.name)
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
    noteType: text('note_type').notNull(), // summary, action_items, transcription, general
    content: text('content').notNull(),
    keywords: text('keywords').array().notNull().default(sql`'{}'::text[]`),
    sentiment: numeric('sentiment', { precision: 4, scale: 3 }),
    language: text('language'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    notesContactCreatedIdx: index('idx_notes_contact_created').on(table.contactId, table.createdAt),
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
    priority: text('priority').notNull().references(() => lookupPriority.id),
    assignedToUserId: uuid('assigned_to_user_id').notNull().references(() => users.id),
    createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id),
    createdFrom: text('created_from').notNull(), // ai, manual, automation
    originRef: jsonb('origin_ref'),
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
    )
  })
);

// ==========================================================
// Notificaciones y canales
// ==========================================================

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
    severity: text('severity').notNull(), // info, warning, critical
    contactId: uuid('contact_id').references(() => contacts.id),
    payload: jsonb('payload').notNull().default(sql`'{}'::jsonb`),
    deliveredChannels: text('delivered_channels').array().notNull().default(sql`'{}'::text[]`),
    readAt: timestamp('read_at', { withTimezone: true }),
    processed: boolean('processed').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    notificationsUnreadIdx: index('idx_notifications_unread')
      .on(table.userId, table.createdAt)
      .where(sql`${table.readAt} is null`),
    notificationsUnprocessedIdx: index('idx_notifications_unprocessed')
      .on(table.processed)
      .where(sql`${table.processed} = false`)
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

