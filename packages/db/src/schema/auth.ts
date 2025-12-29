/**
 * Google OAuth2 Authentication Schema
 *
 * AI_DECISION: Separar tokens personales de tokens de equipo
 * Justificación: Calendarios de equipo usan tokens del manager, personales usan tokens del usuario
 * Impacto: Permite gestión independiente de calendarios personales y de equipo
 */

import { pgTable, uuid, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * google_oauth_tokens
 * Tokens OAuth2 de Google para usuarios autenticados con Google.
 * Tokens encriptados con AES-256-GCM.
 */
export const googleOAuthTokens = pgTable(
  'google_oauth_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    googleId: text('google_id').notNull(), // Google user ID (sub claim)
    email: text('email').notNull(), // Email de Google (para matching)
    accessTokenEncrypted: text('access_token_encrypted').notNull(), // Token encriptado
    refreshTokenEncrypted: text('refresh_token_encrypted').notNull(), // Refresh token encriptado
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), // Expiración del access token
    scope: text('scope').notNull(), // Scopes otorgados (ej: "calendar.readonly calendar.events")
    calendarId: text('calendar_id'), // ID del calendario principal personal (opcional, puede ser "primary")
    calendarSyncEnabled: boolean('calendar_sync_enabled').notNull().default(false),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }), // Última sincronización exitosa
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_google_oauth_tokens_user_id').on(table.userId),
    googleIdIdx: index('idx_google_oauth_tokens_google_id').on(table.googleId),
    emailIdx: index('idx_google_oauth_tokens_email').on(table.email),
  })
);












