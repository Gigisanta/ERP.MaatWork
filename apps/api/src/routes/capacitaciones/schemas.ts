/**
 * Capacitaciones Validation Schemas
 *
 * Zod schemas for validating capacitaciones CRUD operations
 */
import { z } from 'zod';
import { paginationQuerySchema, urlSchema, idParamSchema } from '../../utils/common-schemas';

// ==========================================================
// Body Schemas
// ==========================================================

export const createCapacitacionSchema = z.object({
  titulo: z.string().min(1).max(500),
  tema: z.string().min(1).max(100),
  link: urlSchema,
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (expected YYYY-MM-DD)')
    .optional()
    .nullable(),
});

export const updateCapacitacionSchema = z.object({
  titulo: z.string().min(1).max(500).optional(),
  tema: z.string().min(1).max(100).optional(),
  link: urlSchema.optional(),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (expected YYYY-MM-DD)')
    .optional()
    .nullable(),
});

// ==========================================================
// Query Schemas
// ==========================================================

export const listCapacitacionesQuerySchema = paginationQuerySchema.and(
  z.object({
    tema: z.string().optional(),
    search: z.string().optional(),
  })
);

// ==========================================================
// Param Schemas
// ==========================================================

export { idParamSchema };

// ==========================================================
// Type Exports
// ==========================================================

export type CreateCapacitacionInput = z.infer<typeof createCapacitacionSchema>;
export type UpdateCapacitacionInput = z.infer<typeof updateCapacitacionSchema>;
