/**
 * Validation utilities and middleware for scalable Zod validation
 * 
 * This file contains Express middleware for request validation.
 * 
 * ## When to use this file:
 * - Use `validate()` middleware in route handlers to validate params, query, and body
 * - Use `validateField()` for inline validation of single values
 * - Use `safeParseRequest()` for non-throwing validation
 * 
 * ## Related files:
 * - `common-schemas.ts` - Basic reusable Zod schemas (uuid, email, pagination, etc.)
 *   Use for: Building route-specific schemas, common field validations
 * 
 * - `validation-common.ts` - Additional schema helpers and validators
 *   Use for: Complex validations, optional fields, custom constraints
 * 
 * @example
 * ```typescript
 * // In a route file
 * import { validate } from '../utils/validation';
 * import { uuidSchema, paginationQuerySchema } from '../utils/common-schemas';
 * import { optionalEmailSchema } from '../utils/validation-common';
 * 
 * const mySchema = z.object({
 *   id: uuidSchema,
 *   email: optionalEmailSchema
 * });
 * 
 * router.get('/:id', validate({ params: idParamSchema, query: paginationQuerySchema }), handler);
 * ```
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

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

