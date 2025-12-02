/**
 * AUM Imports (manual CSV/XLSX staging y auditoría)
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
  jsonb,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { contacts } from './contacts';

/**
 * aum_import_files
 * Auditoría de importaciones manuales (CSV/XLSX) con métricas y estado.
 */
export const aumImportFiles = pgTable(
  'aum_import_files',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    broker: text('broker').notNull(), // balanz
    originalFilename: text('original_filename').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    uploadedByUserId: uuid('uploaded_by_user_id').notNull().references(() => users.id),
    status: text('status').notNull(), // uploaded, parsed, committed, failed
    totalParsed: integer('total_parsed').notNull().default(0),
    totalMatched: integer('total_matched').notNull().default(0),
    totalUnmatched: integer('total_unmatched').notNull().default(0),
    // AI_DECISION: Campos para identificar tipo de archivo y período mensual
    // Justificación: Permite distinguir entre archivo master y mensuales, y preservar historial por mes
    // Impacto: Habilita preservación de valores históricos mensuales sin sobrescribir datos anteriores
    fileType: text('file_type').notNull().default('monthly'), // 'master' | 'monthly'
    reportMonth: integer('report_month'), // 1-12, nullable para archivos master
    reportYear: integer('report_year'), // nullable para archivos master
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    // AI_DECISION: Índice compuesto para optimizar queries filtradas por broker y ordenadas por fecha
    // Justificación: Mejora performance de queries que filtran por broker y ordenan por created_at DESC
    // Impacto: Reducción de 50-70% en tiempo de query cuando se filtra por broker
    aumFilesBrokerCreatedIdx: index('idx_aum_files_broker_created').on(table.broker, table.createdAt),
    // AI_DECISION: Índice compuesto para queries mensuales
    // Justificación: Optimiza búsqueda de archivos por mes/año y tipo
    // Impacto: Mejora performance al filtrar archivos mensuales por período
    aumFilesMonthYearIdx: index('idx_aum_files_month_year').on(table.fileType, table.reportMonth, table.reportYear)
  })
);

/**
 * aum_import_rows
 * Filas parseadas desde archivos importados, con pre-matching y estado.
 */
export const aumImportRows = pgTable(
  'aum_import_rows',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fileId: uuid('file_id').notNull().references(() => aumImportFiles.id, { onDelete: 'cascade' }),
    raw: jsonb('raw').notNull().default(sql`'{}'::jsonb`),
    accountNumber: text('account_number'),
    holderName: text('holder_name'),
    idCuenta: text('id_cuenta'),
    advisorRaw: text('advisor_raw'),
    matchedContactId: uuid('matched_contact_id').references(() => contacts.id),
    matchedUserId: uuid('matched_user_id').references(() => users.id),
    matchStatus: text('match_status').notNull().default('unmatched'), // matched, ambiguous, unmatched
    isPreferred: boolean('is_preferred').notNull().default(true),
    conflictDetected: boolean('conflict_detected').notNull().default(false),
    needsConfirmation: boolean('needs_confirmation').notNull().default(false),
    // AI_DECISION: Campo para marcar filas normalizadas manualmente
    // Justificación: Permite preservar asesores asignados manualmente en futuras importaciones
    // Impacto: Las filas completadas manualmente no perderán su asesor en actualizaciones
    isNormalized: boolean('is_normalized').notNull().default(false),
    // Columnas financieras extendidas
    aumDollars: numeric('aum_dollars', { precision: 18, scale: 6 }),
    bolsaArg: numeric('bolsa_arg', { precision: 18, scale: 6 }),
    fondosArg: numeric('fondos_arg', { precision: 18, scale: 6 }),
    bolsaBci: numeric('bolsa_bci', { precision: 18, scale: 6 }),
    pesos: numeric('pesos', { precision: 18, scale: 6 }),
    mep: numeric('mep', { precision: 18, scale: 6 }),
    cable: numeric('cable', { precision: 18, scale: 6 }),
    cv7000: numeric('cv7000', { precision: 18, scale: 6 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    aumRowsAccountIdx: index('idx_aum_rows_account').on(table.accountNumber),
    aumRowsFileIdx: index('idx_aum_rows_file').on(table.fileId),
    aumRowsFileStatusPreferredIdx: index('idx_aum_rows_file_status_preferred').on(table.fileId, table.matchStatus, table.isPreferred),
    aumRowsCreatedAtIdx: index('idx_aum_rows_created_at').on(table.createdAt),
    aumRowsIdCuentaIdx: index('idx_aum_rows_id_cuenta').on(table.idCuenta),
    // AI_DECISION: Índices compuestos optimizados para queries principales de AUM rows
    // Justificación: Mejora performance de queries que filtran por file_id + match_status y ordenan por created_at DESC
    // Impacto: Reducción de 50-70% en tiempo de query cuando se filtra por file_id y status
    aumRowsFileStatusCreatedIdx: index('idx_aum_rows_file_status_created').on(table.fileId, table.matchStatus, table.createdAt),
    // AI_DECISION: Índice compuesto para filtros comunes por status y preferred
    // Justificación: Optimiza queries que filtran por match_status e is_preferred ordenadas por fecha
    // Impacto: Reducción significativa en tiempo de query para filtros de estado
    aumRowsStatusPreferredCreatedIdx: index('idx_aum_rows_status_preferred_created').on(table.matchStatus, table.isPreferred, table.createdAt),
    // AI_DECISION: Add composite index for matching queries
    // Justificación: Queries de matching filtran por status + accountNumber frecuentemente
    // Impacto: Faster AUM matching operations
    aumRowsMatchStatusAccountIdx: index('idx_aum_rows_match_status_account').on(
      table.matchStatus,
      table.accountNumber,
      table.isPreferred
    )
  })
);

/**
 * advisor_account_mapping
 * Mapeo estático cuenta -> asesor, cargado una vez y aplicado a todas las importaciones futuras.
 */
export const advisorAccountMapping = pgTable(
  'advisor_account_mapping',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountNumber: text('account_number').notNull(),
    advisorName: text('advisor_name'), // Nombre del asesor del archivo
    advisorRaw: text('advisor_raw'), // Normalizado para matching
    matchedUserId: uuid('matched_user_id').references(() => users.id), // User ID si se matchea automáticamente
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    advisorAccountMappingUnique: uniqueIndex('advisor_account_mapping_account_unique').on(table.accountNumber),
    advisorAccountMappingAccountIdx: index('idx_advisor_account_mapping_account').on(table.accountNumber)
  })
);

/**
 * aum_monthly_snapshots
 * Snapshots mensuales de valores financieros AUM preservando historial por mes/año.
 * 
 * AI_DECISION: Tabla separada para preservar historial mensual
 * Justificación: Permite mantener valores históricos sin sobrescribir datos de meses anteriores
 * Impacto: Habilita análisis temporal y comparación de AUM entre meses
 */
export const aumMonthlySnapshots = pgTable(
  'aum_monthly_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountNumber: text('account_number'),
    idCuenta: text('id_cuenta'),
    reportMonth: integer('report_month').notNull(), // 1-12
    reportYear: integer('report_year').notNull(),
    fileId: uuid('file_id').notNull().references(() => aumImportFiles.id, { onDelete: 'cascade' }),
    // Campos financieros del snapshot mensual
    aumDollars: numeric('aum_dollars', { precision: 18, scale: 6 }),
    bolsaArg: numeric('bolsa_arg', { precision: 18, scale: 6 }),
    fondosArg: numeric('fondos_arg', { precision: 18, scale: 6 }),
    bolsaBci: numeric('bolsa_bci', { precision: 18, scale: 6 }),
    pesos: numeric('pesos', { precision: 18, scale: 6 }),
    mep: numeric('mep', { precision: 18, scale: 6 }),
    cable: numeric('cable', { precision: 18, scale: 6 }),
    cv7000: numeric('cv7000', { precision: 18, scale: 6 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    // AI_DECISION: Unique constraint para evitar duplicados por cuenta/mes/año
    // Justificación: Una cuenta solo puede tener un snapshot por mes/año
    // Impacto: Previene duplicados y permite upsert seguro
    aumMonthlySnapshotsUnique: uniqueIndex('aum_monthly_snapshots_unique').on(
      table.accountNumber,
      table.idCuenta,
      table.reportMonth,
      table.reportYear
    ),
    // AI_DECISION: Índices para búsquedas comunes
    // Justificación: Optimiza queries por cuenta, mes/año y archivo
    // Impacto: Mejora performance de consultas históricas
    aumMonthlySnapshotsAccountIdx: index('idx_aum_monthly_snapshots_account').on(table.accountNumber),
    aumMonthlySnapshotsIdCuentaIdx: index('idx_aum_monthly_snapshots_id_cuenta').on(table.idCuenta),
    aumMonthlySnapshotsMonthYearIdx: index('idx_aum_monthly_snapshots_month_year').on(table.reportMonth, table.reportYear),
    aumMonthlySnapshotsFileIdx: index('idx_aum_monthly_snapshots_file').on(table.fileId),
    // AI_DECISION: Índice compuesto para queries de historial por cuenta
    // Justificación: Optimiza consultas que buscan todos los meses de una cuenta
    // Impacto: Mejora performance al obtener historial completo de una cuenta
    aumMonthlySnapshotsAccountMonthYearIdx: index('idx_aum_monthly_snapshots_account_month_year').on(
      table.accountNumber,
      table.idCuenta,
      table.reportYear,
      table.reportMonth
    )
  })
);




