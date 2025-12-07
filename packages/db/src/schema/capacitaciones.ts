/**
 * Capacitaciones: biblioteca de contenido formativo
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  index
} from 'drizzle-orm/pg-core';
import { users } from './users';

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
    // AI_DECISION: Advanced indexes created via migration SQL (0022_optimize_capacitaciones_indexes.sql)
    // Justificación: Drizzle doesn't fully support GIN trigram and composite DESC indexes
    // Impacto: Better query performance for text search and tema+created_at filtering
    // Additional indexes:
    // - idx_capacitaciones_titulo_trgm: GIN trigram index for ILIKE searches
    // - idx_capacitaciones_tema_created_at: Composite (tema, created_at DESC) for filtered ordering
    // - idx_capacitaciones_created_at_desc: Index for general created_at DESC ordering
  })
);
































