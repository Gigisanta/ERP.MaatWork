/**
 * Contact Aliases Schema
 *
 * Stores alternative names for contacts to improve matching accuracy across
 * AUM imports, Calendar events, and other sources.
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  real,
  timestamp,
  index,
  uniqueIndex,
  boolean,
} from 'drizzle-orm/pg-core';
import { contacts } from './contacts';

/**
 * contact_aliases
 * Mapeo de nombres alternativos a contactos.
 * Se usa para aprender variaciones de nombres de archivos AUM o Calendario.
 */
export const contactAliases = pgTable(
  'contact_aliases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    alias: text('alias').notNull(), // El nombre alternativo (e.g. "J. Perez")
    aliasNormalized: text('alias_normalized').notNull(), // Normalizado para búsquedas
    source: text('source').notNull(), // 'aum_import', 'calendar', 'manual'
    confidence: real('confidence').notNull().default(1.0),
    isVerified: boolean('is_verified').notNull().default(false), // Si fue confirmado manualmente
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    contactAliasesNormalizedIdx: index('idx_contact_aliases_normalized').on(table.aliasNormalized),
    contactAliasesContactIdx: index('idx_contact_aliases_contact').on(table.contactId),
    contactAliasesUnique: uniqueIndex('contact_aliases_unique').on(
      table.contactId,
      table.aliasNormalized
    ),
  })
);
