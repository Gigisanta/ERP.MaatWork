/**
 * Notas, archivos de audio, adjuntos, tareas y recurrencias
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
  jsonb,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { contacts } from './contacts';
import { lookupTaskStatus, lookupPriority } from './lookups';

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
    notesContactCreatedIdx: index('idx_notes_contact_created').on(table.contactId, table.createdAt),
    // AI_DECISION: Add index optimized for DESC ordering (PostgreSQL can use index backwards)
    // Justificación: Query de timeline ordena por createdAt DESC, este índice optimiza esa ordenación
    // Impacto: Faster timeline loading when sorting by createdAt DESC
    notesContactCreatedDescIdx: index('idx_notes_contact_created_desc').on(table.contactId, table.createdAt),
    // AI_DECISION: Add composite index for timeline queries with deletedAt filter
    // Justificación: Timeline queries filter by contactId + deletedAt and order by createdAt DESC
    // Impacto: Faster timeline loading when filtering by deletedAt and sorting by createdAt DESC
    notesContactDeletedCreatedIdx: index('idx_notes_contact_deleted_created').on(
      table.contactId,
      table.deletedAt,
      table.createdAt
    )
  })
);

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

/**
 * note_tags
 * Relación N:M entre notas y etiquetas.
 */
export const noteTags = pgTable(
  'note_tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    noteId: uuid('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    noteTagUnique: uniqueIndex('note_tags_unique').on(table.noteId, table.tagId)
  })
);

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
    ),
    // AI_DECISION: Add partial index for open tasks by user
    // Justificación: Dashboard de tareas filtra frecuentemente por usuario + estado abierto
    // Impacto: Faster task dashboard loading for open tasks
    tasksOpenByUserIdx: index('idx_tasks_open_by_user').on(
      table.assignedToUserId,
      table.dueDate
    ).where(sql`${table.status} IN ('open', 'in_progress') AND ${table.deletedAt} IS NULL`),
    // AI_DECISION: Add composite index for timeline queries
    // Justificación: Timeline queries filter by contactId + deletedAt and order by createdAt DESC
    // Impacto: Faster timeline loading when sorting by createdAt DESC
    tasksContactDeletedCreatedIdx: index('idx_tasks_contact_deleted_created').on(
      table.contactId,
      table.deletedAt,
      table.createdAt
    ),
    // AI_DECISION: Partial index for open tasks (removed CURRENT_DATE - not IMMUTABLE)
    // Justificación: Dashboard queries frequently filter open/in_progress tasks
    // Impacto: Faster task queries, smaller index size
    // Note: Date filtering done at query level, not index level (CURRENT_DATE is not IMMUTABLE)
    tasksOverdueIdx: index('idx_tasks_overdue')
      .on(table.assignedToUserId, table.dueDate)
      .where(sql`${table.status} IN ('open', 'in_progress') AND ${table.deletedAt} IS NULL`),
    // AI_DECISION: Índice compuesto para métricas de dashboard
    // Justificación: Dashboard queries agrupan tareas por usuario, estado y fecha de creación
    // Impacto: Faster dashboard metrics loading
    tasksAssignedStatusCreatedIdx: index('idx_tasks_assigned_status_created')
      .on(table.assignedToUserId, table.status, table.createdAt)
      .where(sql`${table.deletedAt} IS NULL`)
  })
);






































