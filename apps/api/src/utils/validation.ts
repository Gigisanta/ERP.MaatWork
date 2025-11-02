/**
 * Validation utilities and middleware for scalable Zod validation
 * 
 * NOTE: Common schemas have been consolidated in common-schemas.ts
 * Import base schemas from there instead of this file.
 * 
 * This file now only contains:
 * - Validation middleware factory (validate)
 * - Helper functions (validateField, safeParseRequest)
 * - Re-exports for backward compatibility (deprecated)
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// ==========================================================
// Re-exports from common-schemas (for backward compatibility)
// ==========================================================

/**
 * @deprecated Import directly from '../utils/common-schemas' instead
 * These re-exports are kept for backward compatibility only
 */
export { 
  uuidSchema,
  paginationQuerySchema as paginationSchema,
  fileIdParamSchema,
  brokerSchema
} from './common-schemas';

/**
 * @deprecated Import directly from '../utils/common-schemas' instead
 */
export const rowIdParamSchema = z.object({
  rowId: z.string().uuid('Invalid UUID format')
});

/**
 * @deprecated Import directly from '../utils/common-schemas' instead
 */
export const aumStatusSchema = z.enum(['uploaded', 'parsed', 'committed', 'failed']);

/**
 * @deprecated Import directly from '../utils/common-schemas' instead
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

