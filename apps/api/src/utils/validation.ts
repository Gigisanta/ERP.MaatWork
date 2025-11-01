/**
 * Validation utilities and common schemas for scalable Zod validation
 * 
 * Provides reusable validation helpers for:
 * - Common types (UUID, pagination, etc.)
 * - Request validation middleware
 * - Consistent error handling
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// ==========================================================
// Common Schemas - Reusable across routes
// ==========================================================

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Pagination query parameters
 */
export const paginationSchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(500)).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0)).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1)).optional()
});

/**
 * Common file ID parameter (UUID)
 */
export const fileIdParamSchema = z.object({
  fileId: uuidSchema
});

/**
 * Common row ID parameter (UUID)
 */
export const rowIdParamSchema = z.object({
  rowId: uuidSchema
});

/**
 * Broker name validation
 */
export const brokerSchema = z.enum(['balanz', 'other']).default('balanz');

/**
 * Status values for AUM imports
 */
export const aumStatusSchema = z.enum(['uploaded', 'parsed', 'committed', 'failed']);

/**
 * Match status values
 */
export const matchStatusSchema = z.enum(['matched', 'unmatched', 'ambiguous']);

// ==========================================================
// Validation Middleware Factory
// ==========================================================

export interface ValidationSchemas {
  params?: z.ZodSchema;
  query?: z.ZodSchema;
  body?: z.ZodSchema;
}

/**
 * Creates Express middleware that validates request params, query, and body using Zod schemas
 * 
 * @param schemas - Object with optional params, query, and body schemas
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * const validateRequest = validate({
 *   params: z.object({ id: uuidSchema }),
 *   query: paginationSchema,
 *   body: createContactSchema
 * });
 * 
 * router.post('/contacts/:id', requireAuth, validateRequest, async (req, res) => {
 *   // req.params, req.query, req.body are all validated and typed
 * });
 * ```
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate params
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }

      // Validate query
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }

      // Validate body
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        req.log?.warn?.({ 
          validationError: details,
          params: req.params,
          query: req.query,
          body: req.body ? Object.keys(req.body) : null
        }, 'Validation failed');

        return res.status(400).json({
          error: 'Validation error',
          details,
          requestId: (req as any).requestId
        });
      }

      // Unexpected error
      req.log?.error?.({ err: error }, 'Unexpected validation error');
      return res.status(500).json({
        error: 'Internal server error',
        requestId: (req as any).requestId
      });
    }
  };
}

/**
 * Helper to validate a single field (for inline validation)
 * 
 * @example
 * ```typescript
 * const fileId = validateField('fileId', req.params.fileId, uuidSchema);
 * ```
 */
export function validateField<T>(
  fieldName: string,
  value: unknown,
  schema: z.ZodSchema<T>
): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`${fieldName}: ${error.errors[0].message}`);
    }
    throw error;
  }
}

/**
 * Safe parse wrapper that returns consistent error format
 */
export function safeParseRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  return result;
}

