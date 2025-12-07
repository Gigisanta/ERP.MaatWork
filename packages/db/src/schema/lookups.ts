/**
 * Catálogos (lookup) - reemplazo de enums volátiles
 * 
 * REGLA CURSOR: Usar catálogos (lookup_*) en lugar de enums para flexibilidad y i18n
 * No agregar enums hardcoded - siempre usar tablas lookup
 */

import { pgTable, text } from 'drizzle-orm/pg-core';

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
































