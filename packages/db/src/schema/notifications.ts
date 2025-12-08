/**
 * Notificaciones, plantillas, preferencias de canal y log de mensajes
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { contacts } from './contacts';
import { lookupNotificationType } from './lookups';

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

// Forward reference for tasks - will be defined later
// Using uuid without reference for now to avoid circular dependency
const tasksRef = uuid('task_id');

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
    taskId: uuid('task_id'), // Reference without FK to avoid circular dependency
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
      .where(sql`${table.snoozedUntil} is not null`),
    // AI_DECISION: Partial index for unread notifications (removed NOW() - not IMMUTABLE)
    // Justificación: Dashboard queries frequently filter unread notifications
    // Impacto: Faster unread notification queries, smaller index size
    // Note: Time filtering done at query level, not index level (NOW() is not IMMUTABLE)
    notificationsUnreadRecentIdx: index('idx_notifications_unread_recent')
      .on(table.userId, table.createdAt)
      .where(sql`${table.readAt} IS NULL`)
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
export const messageLog = pgTable(
  'message_log',
  {
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
  },
  (table) => ({
    // AI_DECISION: Add indexes for log table queries
    // Justificación: Log tables grow large and are frequently queried by date, channel, and status
    // Impacto: Faster queries for message logs filtering by channel, status, and date ranges
    messageLogCreatedAtIdx: index('idx_message_log_created_at').on(table.createdAt),
    messageLogChannelIdx: index('idx_message_log_channel').on(table.channel),
    messageLogStatusIdx: index('idx_message_log_status').on(table.status),
    messageLogChannelStatusCreatedIdx: index('idx_message_log_channel_status_created').on(
      table.channel,
      table.status,
      table.createdAt
    )
  })
);

