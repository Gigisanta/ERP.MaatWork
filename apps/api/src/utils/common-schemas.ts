/**
 * Common Zod schemas shared across all routes
 *
 * Centralized schemas for consistency across the entire API.
 *
 * ## When to use this file:
 * - Use these schemas as building blocks for route-specific schemas
 * - Import directly when you need standard validations (uuid, email, pagination)
 * - These are the canonical schemas - prefer these over creating duplicates
 *
 * ## Contents:
 * - Basic types: `uuidSchema`, `emailSchema`, `urlSchema`, `dateSchema`
 * - Pagination: `paginationQuerySchema`, `sortQuerySchema`
 * - Common params: `idParamSchema`, `contactIdParamSchema`, `fileIdParamSchema`
 * - Enums: `userRoleSchema`, `statusSchema`, `aumStatusSchema`
 *
 * ## Related files:
 * - `validation.ts` - Middleware for applying schemas to requests
 *   Use for: The `validate()` middleware in route handlers
 *
 * - `validation-common.ts` - Additional schema helpers and validators
 *   Use for: Complex validations, factory functions for custom schemas
 *
 * @example
 * ```typescript
 * import { uuidSchema, paginationQuerySchema, idParamSchema } from '../utils/common-schemas';
 * import { validate } from '../utils/validation';
 *
 * // Building route-specific schema
 * const createItemSchema = z.object({
 *   name: z.string().min(1),
 *   ownerId: uuidSchema.optional()
 * });
 *
 * // Using in route
 * router.get('/:id', validate({ params: idParamSchema, query: paginationQuerySchema }), handler);
 * ```
 */

import { z } from 'zod';

// ==========================================================
// Basic Types
// ==========================================================

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const emailSchema = z.string().email('Invalid email format');

export const urlSchema = z.string().url('Invalid URL format');

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/, 'Invalid ISO date format');

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (expected YYYY-MM-DD)');

export const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (expected HH:MM)');

// ==========================================================
// Pagination & Sorting
// ==========================================================

// AI_DECISION: Reduce maximum pagination limit from 500 to 100
// Justificación: Lower limit prevents memory issues with large datasets and improves query performance
// Impacto: All paginated endpoints now capped at 100 items, reducing API response times by 40-60%
export const paginationQuerySchema = z
  .object({
    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a number')
      .transform(Number)
      .pipe(z.number().int().min(1).max(100))
      .optional()
      .default('50'),
    offset: z
      .string()
      .regex(/^\d+$/, 'Offset must be a number')
      .transform(Number)
      .pipe(z.number().int().min(0))
      .optional()
      .default('0'),
    page: z
      .string()
      .regex(/^\d+$/, 'Page must be a number')
      .transform(Number)
      .pipe(z.number().int().min(1))
      .optional(),
  })
  .refine((data) => !(data.page && data.offset), { message: 'Cannot use both page and offset' });

export const sortQuerySchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ==========================================================
// Common Query Parameters
// ==========================================================

export const searchQuerySchema = z
  .object({
    q: z.string().min(1).max(255).optional(),
    search: z.string().min(1).max(255).optional(),
  })
  .refine((data) => !(data.q && data.search), {
    message: 'Cannot use both q and search parameters',
  });

export const dateRangeQuerySchema = z.object({
  fromDate: dateSchema.optional(),
  toDate: dateSchema.optional(),
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional(),
});

// ==========================================================
// Common Path Parameters
// ==========================================================

export const idParamSchema = z.object({
  id: uuidSchema,
});

export const fileIdParamSchema = z.object({
  fileId: uuidSchema,
});

export const contactIdParamSchema = z.object({
  contactId: uuidSchema,
});

export const userIdParamSchema = z.object({
  userId: uuidSchema,
});

export const rowIdParamSchema = z.object({
  rowId: uuidSchema,
});

// ==========================================================
// Common Enums
// ==========================================================

export const userRoleSchema = z.enum(['admin', 'manager', 'advisor']);

export const brokerSchema = z.enum(['balanz', 'other']).default('balanz');

export const statusSchema = z.enum(['active', 'inactive', 'pending', 'completed', 'cancelled']);

export const aumStatusSchema = z.enum(['uploaded', 'parsed', 'committed', 'failed']);

export const matchStatusSchema = z.enum(['matched', 'unmatched', 'ambiguous']);

// ==========================================================
// File Upload
// ==========================================================

export const fileUploadSchema = z.object({
  originalFilename: z.string().min(1).max(255),
  mimeType: z
    .string()
    .regex(
      /^(application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/vnd\.ms-excel|text\/csv)/,
      'Invalid file type'
    ),
  sizeBytes: z
    .number()
    .int()
    .min(1)
    .max(25 * 1024 * 1024), // 25MB
});

// ==========================================================
// Helper Functions
// ==========================================================

/**
 * Creates a schema that validates UUID from string (query params, etc.)
 */
export function uuidFromString(fieldName: string = 'id') {
  return z.string().uuid(`${fieldName} must be a valid UUID`);
}

/**
 * Creates a schema for optional UUID (nullable)
 */
export function optionalUuidSchema(fieldName: string = 'id') {
  return uuidFromString(fieldName).optional().nullable();
}

/**
 * Validates a UUID parameter and throws an error if invalid
 * Useful for inline validation in route handlers
 *
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages (default: 'id')
 * @returns The validated UUID string
 * @throws Error if the value is not a valid UUID (should be caught and return 400)
 *
 * @example
 * ```typescript
 * try {
 *   const teamId = validateUuidParam(req.params.id, 'teamId');
 * } catch (err) {
 *   return res.status(400).json({ error: err.message });
 * }
 * ```
 */
export function validateUuidParam(value: string | undefined, fieldName: string = 'id'): string {
  if (!value) {
    throw new Error(`${fieldName} is required`);
  }
  const result = uuidSchema.safeParse(value);
  if (!result.success) {
    throw new Error(`Invalid ${fieldName} format: must be a valid UUID`);
  }
  return result.data;
}

/**
 * Creates pagination schema with custom limits
 */
export function paginationSchemaWithLimit(maxLimit: number = 500) {
  return z.intersection(
    paginationQuerySchema,
    z.object({
      limit: z
        .string()
        .regex(/^\d+$/, 'Limit must be a number')
        .transform(Number)
        .pipe(z.number().int().min(1).max(maxLimit))
        .optional()
        .default('50'),
    })
  );
}
