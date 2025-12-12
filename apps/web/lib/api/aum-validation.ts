/**
 * AUM API Response Validation
 *
 * AI_DECISION: Validar respuestas de API en runtime con Zod
 * Justificación: Runtime validation previene errores por cambios en API
 * Impacto: Mayor robustez, mejor debugging, mensajes de error claros
 */

import { z } from 'zod';

// Match status
export const aumMatchStatusSchema = z.enum(['matched', 'ambiguous', 'unmatched']);

// Totals
export const aumTotalsSchema = z.object({
  parsed: z.number(),
  matched: z.number(),
  ambiguous: z.number(),
  conflicts: z.number(),
  unmatched: z.number(),
  inserts: z.number().optional(),
  updates: z.number().optional(),
  monthlySnapshots: z
    .object({
      inserted: z.number(),
      updated: z.number(),
      errors: z.number(),
    })
    .nullable()
    .optional(),
});

// File
export const aumFileSchema = z.object({
  id: z.string().uuid(),
  broker: z.string(),
  originalFilename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  uploadedByUserId: z.string().uuid(),
  status: z.string(),
  totalParsed: z.number().optional(),
  totalMatched: z.number().optional(),
  totalUnmatched: z.number().optional(),
  totals: aumTotalsSchema.optional(),
  createdAt: z.string(),
});

// Contact info
export const aumContactInfoSchema = z
  .object({
    id: z.string().uuid(),
    fullName: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  })
  .nullable();

// User info
export const aumUserInfoSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
  })
  .nullable();

// AUM Row
export const aumRowSchema = z.object({
  id: z.string().uuid(),
  fileId: z.string().uuid(),
  accountNumber: z.string().nullable(),
  holderName: z.string().nullable(),
  idCuenta: z.string().nullable().optional(),
  advisorRaw: z.string().nullable(),
  advisorNormalized: z.string().nullable(),
  matchedContactId: z.string().uuid().nullable(),
  matchedUserId: z.string().uuid().nullable(),
  suggestedUserId: z.string().uuid().nullable().optional(),
  matchStatus: aumMatchStatusSchema,
  isPreferred: z.boolean(),
  conflictDetected: z.boolean(),
  needsConfirmation: z.boolean().optional(),
  rowCreatedAt: z.string(),
  rowUpdatedAt: z.string().optional(),
  isUpdated: z.boolean().optional(),
  updatedByFile: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      createdAt: z.string(),
    })
    .optional(),
  // Financial columns
  aumDollars: z.number().nullable(),
  bolsaArg: z.number().nullable(),
  fondosArg: z.number().nullable(),
  bolsaBci: z.number().nullable(),
  pesos: z.number().nullable(),
  mep: z.number().nullable(),
  cable: z.number().nullable(),
  cv7000: z.number().nullable(),
  // Relations
  file: aumFileSchema.optional(),
  contact: aumContactInfoSchema.optional(),
  user: aumUserInfoSchema.optional(),
  raw: z.record(z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

// Upload response
export const aumUploadResponseSchema = z.object({
  fileId: z.string().uuid(),
  filename: z.string(),
  totals: aumTotalsSchema,
  fileType: z.enum(['master', 'monthly']).optional(),
  reportMonth: z.number().optional(),
  reportYear: z.number().optional(),
  confirmationsRequired: z.number().optional(),
  confirmations: z
    .array(
      z.object({
        rowId: z.string().uuid(),
        idCuenta: z.string().nullable(),
        newAccountNumber: z.string().nullable(),
        reason: z.string(),
      })
    )
    .optional(),
  warnings: z.array(z.string()).optional(),
});

// Rows response
export const aumRowsResponseSchema = z.object({
  ok: z.boolean(),
  rows: z.array(aumRowSchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }),
});

// History response
export const aumHistoryResponseSchema = z.object({
  files: z.array(aumFileSchema),
  pagination: z.object({
    limit: z.number(),
    offset: z.number(),
    total: z.number(),
  }),
});

// Match row response
export const aumMatchRowResponseSchema = z
  .object({
    success: z.boolean(),
    row: aumRowSchema.optional(),
    message: z.string().optional(),
  })
  .refine(
    (data) => {
      // If success is true, row must be present
      if (data.success === true) {
        return data.row !== undefined;
      }
      return true;
    },
    {
      message: 'Row is required when success is true',
      path: ['row'],
    }
  );

// Export inferred types
export type AumUploadResponse = z.infer<typeof aumUploadResponseSchema>;
export type AumRowsResponse = z.infer<typeof aumRowsResponseSchema>;
export type AumHistoryResponse = z.infer<typeof aumHistoryResponseSchema>;
export type AumMatchRowResponse = z.infer<typeof aumMatchRowResponseSchema>;
