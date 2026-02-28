/**
 * AUM Validation Schemas
 *
 * AI_DECISION: Consolidar schemas de validación AUM para eliminar duplicación
 * Justificación: Los schemas `aumRowSchema`, `aumFileSchema`, `aumTotalsSchema`, etc. existían
 *                duplicados entre `apps/api/src/utils/aum/aum-validation.ts` (332 líneas) y
 *                `apps/web/lib/api/aum-validation.ts` (181 líneas).
 *                Este paquete centralizado permite mantener un solo lugar de verdad para validaciones.
 * Impacto: Reducción de ~150 líneas de código duplicado, mantenimiento simplificado
 *
 */

import { z } from 'zod';

/**
 * Match Status Schema (enum compartido)
 */
export const aumMatchStatusSchema = z.enum(['matched', 'ambiguous', 'unmatched']);

/**
 * Report Month Schema (validación de 1-12)
 */
export const reportMonthSchema = z
  .number()
  .int()
  .min(1)
  .max(12)
  .describe('Report month must be between 1 and 12');

/**
 * Report Year Schema (validación de año 2000-2100)
 */
export const reportYearSchema = z
  .number()
  .int()
  .min(2000)
  .max(2100)
  .describe('Report year must be between 2000 and 2100');

/**
 * AUM File Type Schema (tipo de archivo AUM)
 */
export const aumFileTypeSchema = z.enum(['master', 'monthly']);

/**
 * AUM Row Schema (versión base para API)
 *
 * Esta versión contiene los campos esenciales para validación de filas AUM.
 * El archivo API puede extender este schema para agregar campos adicionales.
 * La versión Web en `apps/web/lib/api/aum-validation.ts` extiende este con campos adicionales.
 */
export const aumRowSchema = z.object({
  id: z.string().uuid(),
  fileId: z.string().uuid(),
  accountNumber: z.string().nullable(),
  holderName: z.string().nullable(),
  idCuenta: z.string().nullable().optional(),
  advisorRaw: z.string().nullable(),
  matchedContactId: z.string().uuid().nullable(),
  matchedUserId: z.string().uuid().nullable(),
  matchStatus: aumMatchStatusSchema,
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

/**
 * AUM File Schema (versión para archivos subidos)
 *
 * Schema para representar archivos AUM importados (CSV, Excel).
 */
export const aumFileSchema = z.object({
  id: z.string().uuid(),
  broker: z.string(),
  originalFilename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  uploadedByUserId: z.string().uuid(),
  status: z.enum(['uploaded', 'parsed', 'committed', 'failed']),
  totalParsed: z.number(),
  totalMatched: z.number(),
  totalUnmatched: z.number(),
  fileType: aumFileTypeSchema.optional(),
  reportMonth: reportMonthSchema.nullable().optional(),
  reportYear: reportYearSchema.nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * AUM Totals Schema (agregación de valores por columna)
 *
 * Schema para validar respuestas de totales por columna.
 */
export const aumTotalsSchema = z.object({
  parsed: z.number(),
  matched: z.number(),
  ambiguous: z.number(),
  conflicts: z.number(),
  unmatched: z.number(),
  inserts: z.number().optional(),
  updates: z.number().optional(),
});

/**
 * Contact Info Schema (Web-only - info básica de contacto)
 *
 * Schema para información de contacto usado en responses API.
 * No se usa en API - solo en frontend.
 */
export const aumContactInfoSchema = z
  .object({
    id: z.string().uuid(),
    fullName: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  })
  .nullable();

/**
 * User Info Schema (Web-only - info básica de usuario)
 *
 * Schema para información de usuario usado en responses API.
 * No se usa en API - solo en frontend.
 */
export const aumUserInfoSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
  })
  .nullable();
