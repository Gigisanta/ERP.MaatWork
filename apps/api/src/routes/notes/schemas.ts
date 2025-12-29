/**
 * Notes Validation Schemas
 *
 * Zod schemas for validating notes CRUD operations
 */
import { z } from 'zod';
import {
  paginationQuerySchema,
  uuidSchema,
  idParamSchema,
} from '../../utils/validation/common-schemas';

// ==========================================================
// Body Schemas
// ==========================================================

export const createNoteSchema = z.object({
  contactId: uuidSchema,
  content: z.string().min(1),
  noteType: z.enum(['general', 'summary', 'action_items']).default('general'),
  source: z.enum(['manual', 'ai', 'import']).default('manual'),
});

export const updateNoteSchema = z.object({
  content: z.string().min(1).optional(),
  noteType: z.enum(['general', 'summary', 'action_items']).optional(),
});

// ==========================================================
// Query Schemas
// ==========================================================

export const listNotesQuerySchema = paginationQuerySchema.and(z.object({ contactId: uuidSchema }));

export const batchNotesQuerySchema = z.object({
  contactIds: z.string().min(1),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
});

// ==========================================================
// Param Schemas
// ==========================================================

export { idParamSchema };

// ==========================================================
// Type Exports
// ==========================================================

type CreateNoteInput = z.infer<typeof createNoteSchema>;
type UpdateNoteInput = z.infer<typeof updateNoteSchema>;




