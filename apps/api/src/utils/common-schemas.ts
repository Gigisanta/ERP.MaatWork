/**
 * Common Zod schemas shared across all routes
 * 
 * Centralized schemas for consistency across the entire API
 */

import { z } from 'zod';

// ==========================================================
// Basic Types
// ==========================================================

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const emailSchema = z.string().email('Invalid email format');

export const urlSchema = z.string().url('Invalid URL format');

export const isoDateSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
  'Invalid ISO date format'
);

export const dateSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Invalid date format (expected YYYY-MM-DD)'
);

export const timeSchema = z.string().regex(
  /^\d{2}:\d{2}$/,
  'Invalid time format (expected HH:MM)'
);

// ==========================================================
// Pagination & Sorting
// ==========================================================

export const paginationQuerySchema = z.object({
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .pipe(z.number().int().min(1).max(500))
    .optional()
    .default('50'),
  offset: z.string()
    .regex(/^\d+$/, 'Offset must be a number')
    .transform(Number)
    .pipe(z.number().int().min(0))
    .optional()
    .default('0'),
  page: z.string()
    .regex(/^\d+$/, 'Page must be a number')
    .transform(Number)
    .pipe(z.number().int().min(1))
    .optional()
}).refine(
  (data) => !(data.page && data.offset),
  { message: 'Cannot use both page and offset' }
);

export const sortQuerySchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

// ==========================================================
// Common Query Parameters
// ==========================================================

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(255).optional(),
  search: z.string().min(1).max(255).optional()
}).refine(
  (data) => !(data.q && data.search),
  { message: 'Cannot use both q and search parameters' }
);

export const dateRangeQuerySchema = z.object({
  fromDate: dateSchema.optional(),
  toDate: dateSchema.optional(),
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional()
});

// ==========================================================
// Common Path Parameters
// ==========================================================

export const idParamSchema = z.object({
  id: uuidSchema
});

export const fileIdParamSchema = z.object({
  fileId: uuidSchema
});

export const contactIdParamSchema = z.object({
  contactId: uuidSchema
});

export const userIdParamSchema = z.object({
  userId: uuidSchema
});

// ==========================================================
// Common Enums
// ==========================================================

export const userRoleSchema = z.enum(['admin', 'manager', 'advisor']);

export const brokerSchema = z.enum(['balanz', 'other']).default('balanz');

export const statusSchema = z.enum(['active', 'inactive', 'pending', 'completed', 'cancelled']);

// ==========================================================
// File Upload
// ==========================================================

export const fileUploadSchema = z.object({
  originalFilename: z.string().min(1).max(255),
  mimeType: z.string().regex(
    /^(application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/vnd\.ms-excel|text\/csv)/,
    'Invalid file type'
  ),
  sizeBytes: z.number().int().min(1).max(25 * 1024 * 1024) // 25MB
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
 * Creates pagination schema with custom limits
 */
export function paginationSchemaWithLimit(maxLimit: number = 500) {
  return z.intersection(
    paginationQuerySchema,
    z.object({
      limit: z.string()
        .regex(/^\d+$/, 'Limit must be a number')
        .transform(Number)
        .pipe(z.number().int().min(1).max(maxLimit))
        .optional()
        .default('50')
    })
  );
}

