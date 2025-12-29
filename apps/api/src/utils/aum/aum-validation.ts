/**
 * Centralized Zod validation schemas for AUM module
 *
 * AI_DECISION: Consolidar todos los schemas Zod de AUM en un solo archivo
 * Justificación: Evita duplicación, facilita mantenimiento y asegura consistencia
 * Impacto: Mejor organización y reutilización de validaciones
 */

import { z } from 'zod';
import {
  uuidSchema,
  fileIdParamSchema,
  paginationQuerySchema,
  brokerSchema,
  matchStatusSchema,
} from '../validation/common-schemas';

// ==========================================================
// Path Parameter Schemas
// ==========================================================

export const aumFileIdParamsSchema = fileIdParamSchema;

export const aumAccountNumberParamsSchema = z.object({
  accountNumber: z.string().min(1).max(100),
});

// ==========================================================
// Common Schemas for AUM Monthly Reports
// ==========================================================

/**
 * Schema para validar mes del reporte (1-12)
 */
const reportMonthSchema = z.number().int().min(1).max(12);

/**
 * Schema para validar año del reporte (año válido)
 */
const reportYearSchema = z.number().int().min(2000).max(2100);

/**
 * Schema para validar tipo de archivo AUM
 */
const aumFileTypeSchema = z.enum(['master', 'monthly']);

// ==========================================================
// Query Parameter Schemas
// ==========================================================

export const aumExportQuerySchema = z.object({}).optional();

export const aumCommitQuerySchema = z.object({
  broker: brokerSchema.optional(),
});

export const aumPreviewQuerySchema = z.object({
  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .pipe(z.number().int().min(1).max(500))
    .optional()
    .default('50'),
});

export const aumHistoryQuerySchema = z.intersection(
  paginationQuerySchema,
  z.object({
    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a number')
      .transform(Number)
      .pipe(z.number().int().min(1).max(200))
      .optional()
      .default('50'),
  })
);

export const aumUploadQuerySchema = z.object({
  broker: brokerSchema.optional(),
  // AI_DECISION: Parámetros opcionales para identificar mes/año del reporte
  // Justificación: Permite especificar manualmente el período si no se puede detectar del nombre
  // Impacto: Mayor flexibilidad para importar archivos con nombres no estándar
  reportMonth: z
    .string()
    .regex(/^\d+$/, 'Report month must be a number')
    .transform(Number)
    .pipe(reportMonthSchema)
    .optional(),
  reportYear: z
    .string()
    .regex(/^\d+$/, 'Report year must be a number')
    .transform(Number)
    .pipe(reportYearSchema)
    .optional(),
  fileType: aumFileTypeSchema.optional(),
});

export const aumPurgeQuerySchema = z.object({
  force: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
});

export const aumPurgeAllQuerySchema = z.object({
  broker: brokerSchema.optional(),
});

export const aumRowsAllQuerySchema = z.intersection(
  paginationQuerySchema,
  z.object({
    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a number')
      .transform(Number)
      .pipe(z.number().int().min(1).max(200))
      .optional()
      .default('50'),
    broker: brokerSchema.optional(),
    status: matchStatusSchema.optional(),
    fileId: uuidSchema.optional(),
    preferredOnly: z
      .string()
      .transform((v) => v === 'true')
      .optional()
      .default('true'),
    search: z.string().min(1).max(255).optional(),
    onlyUpdated: z
      .string()
      .transform((v) => v === 'true')
      .optional()
      .default('false'),
    // AI_DECISION: Filtros opcionales por mes/año para queries históricas
    // Justificación: Permite filtrar filas por período mensual específico
    // Impacto: Habilita análisis temporal de datos AUM
    reportMonth: z
      .string()
      .regex(/^\d+$/, 'Report month must be a number')
      .transform(Number)
      .pipe(reportMonthSchema)
      .optional(),
    reportYear: z
      .string()
      .regex(/^\d+$/, 'Report year must be a number')
      .transform(Number)
      .pipe(reportYearSchema)
      .optional(),
  })
);

/**
 * Schema para query de historial mensual
 */
export const aumMonthlyHistoryQuerySchema = z.object({
  accountNumber: z.string().min(1).max(100).optional(),
  idCuenta: z.string().min(1).max(100).optional(),
  reportMonth: z
    .string()
    .regex(/^\d+$/, 'Report month must be a number')
    .transform(Number)
    .pipe(reportMonthSchema)
    .optional(),
  reportYear: z
    .string()
    .regex(/^\d+$/, 'Report year must be a number')
    .transform(Number)
    .pipe(reportYearSchema)
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .pipe(z.number().int().min(1).max(500))
    .optional()
    .default('100'),
});

/**
 * Schema para query de resumen por asesor
 *
 * AI_DECISION: Validación para endpoint de agregación por asesor
 * Justificación: Permite filtrar resumen por período mensual y broker
 * Impacto: Habilita análisis segmentado de AUM por asesor
 */
export const aumAdvisorSummaryQuerySchema = z.object({
  reportMonth: z
    .string()
    .regex(/^\d+$/, 'Report month must be a number')
    .transform(Number)
    .pipe(reportMonthSchema)
    .optional(),
  reportYear: z
    .string()
    .regex(/^\d+$/, 'Report year must be a number')
    .transform(Number)
    .pipe(reportYearSchema)
    .optional(),
  broker: brokerSchema.optional(),
});

/**
 * Schema para query de períodos disponibles
 */
export const aumAvailablePeriodsQuerySchema = z.object({
  broker: brokerSchema.optional(),
});

// ==========================================================
// Body Schemas
// ==========================================================

export const aumMatchRowBodySchema = z.object({
  rowId: uuidSchema,
  matchedContactId: uuidSchema.optional().nullable(),
  matchedUserId: uuidSchema.optional().nullable(),
});

/**
 * Schema para actualizar asesor de una fila AUM
 *
 * AI_DECISION: Validación estricta de datos de entrada
 * Justificación: Previene datos inválidos y mejora la integridad de la base de datos
 * Impacto: Mejor validación y mensajes de error más claros
 */
export const aumUpdateAdvisorBodySchema = z.object({
  advisorRaw: z
    .string()
    .min(1, 'El nombre del asesor es requerido')
    .max(200, 'El nombre del asesor no puede exceder 200 caracteres')
    .trim(),
  matchedUserId: uuidSchema,
});

export const aumRowIdParamsSchema = z.object({
  rowId: uuidSchema,
});

export const aumConfirmChangesBodySchema = z.object({
  changes: z.array(
    z.object({
      rowId: uuidSchema,
      oldValue: z.string().nullable(),
      newValue: z.string().nullable(),
      field: z.string(),
    })
  ),
});

// ==========================================================
// Response Schemas (for validation)
// ==========================================================

const aumRowSchema = z.object({
  id: uuidSchema,
  fileId: uuidSchema,
  accountNumber: z.string().nullable(),
  holderName: z.string().nullable(),
  idCuenta: z.string().nullable(),
  advisorRaw: z.string().nullable(),
  matchedContactId: uuidSchema.nullable(),
  matchedUserId: uuidSchema.nullable(),
  matchStatus: matchStatusSchema,
  isPreferred: z.boolean(),
  conflictDetected: z.boolean(),
  aumDollars: z.number().nullable(),
  bolsaArg: z.number().nullable(),
  fondosArg: z.number().nullable(),
  bolsaBci: z.number().nullable(),
  pesos: z.number().nullable(),
  mep: z.number().nullable(),
  cable: z.number().nullable(),
  cv7000: z.number().nullable(),
  raw: z.record(z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const aumFileSchema = z.object({
  id: uuidSchema,
  broker: brokerSchema,
  originalFilename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  uploadedByUserId: uuidSchema,
  status: z.enum(['uploaded', 'parsed', 'committed', 'failed']),
  totalParsed: z.number(),
  totalMatched: z.number(),
  totalUnmatched: z.number(),
  fileType: aumFileTypeSchema,
  reportMonth: z.number().int().min(1).max(12).nullable(),
  reportYear: z.number().int().min(2000).max(2100).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Schema para snapshot mensual
 */
const aumMonthlySnapshotSchema = z.object({
  id: uuidSchema,
  accountNumber: z.string().nullable(),
  idCuenta: z.string().nullable(),
  reportMonth: reportMonthSchema,
  reportYear: reportYearSchema,
  fileId: uuidSchema,
  aumDollars: z.number().nullable(),
  bolsaArg: z.number().nullable(),
  fondosArg: z.number().nullable(),
  bolsaBci: z.number().nullable(),
  pesos: z.number().nullable(),
  mep: z.number().nullable(),
  cable: z.number().nullable(),
  cv7000: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ==========================================================
// Type Exports (inferred from schemas)
// ==========================================================

export type AumRowsAllQuery = z.infer<typeof aumRowsAllQuerySchema>;
type AumMatchRowBody = z.infer<typeof aumMatchRowBodySchema>;
type AumRowValidated = z.infer<typeof aumRowSchema>;
type AumFileValidated = z.infer<typeof aumFileSchema>;
export type AumMonthlyHistoryQuery = z.infer<typeof aumMonthlyHistoryQuerySchema>;
type AumMonthlySnapshotValidated = z.infer<typeof aumMonthlySnapshotSchema>;
export type AumHistoryQuery = z.infer<typeof aumHistoryQuerySchema>;
export type AumAdvisorSummaryQuery = z.infer<typeof aumAdvisorSummaryQuerySchema>;
export type AumAvailablePeriodsQuery = z.infer<typeof aumAvailablePeriodsQuerySchema>;
