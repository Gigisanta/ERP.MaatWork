/**
 * Automatizaciones: webhooks, triggers y configuraciones
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
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * automation_configs
 * Configuraciones de automatizaciones del sistema (webhooks, triggers, etc.).
 */
export const automationConfigs = pgTable(
  'automation_configs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(), // Identificador único (ej: "mail_bienvenida")
    displayName: text('display_name').notNull(), // Nombre para mostrar (ej: "Mail de bienvenida")
    triggerType: text('trigger_type').notNull(), // Tipo de trigger (ej: "pipeline_stage_change")
    triggerConfig: jsonb('trigger_config')
      .notNull()
      .default(sql`'{}'::jsonb`), // Configuración del trigger (ej: { stageName: "Cliente" })
    enabled: boolean('enabled').notNull().default(true), // Si está habilitada
    config: jsonb('config')
      .notNull()
      .default(sql`'{}'::jsonb`), // Configuración adicional (payload personalizado, etc.)
    webhookUrl: text('webhook_url'), // URL opcional para webhook automations
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    automationConfigsNameUnique: uniqueIndex('automation_configs_name_unique').on(table.name),
    automationConfigsTriggerIdx: index('idx_automation_configs_trigger').on(
      table.triggerType,
      table.enabled
    ),
  })
);
