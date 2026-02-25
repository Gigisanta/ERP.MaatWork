import { z } from 'zod';

/**
 * Schema for creating new feedback
 */
export const createFeedbackSchema = z.object({
  type: z.enum(['feedback', 'feature_request', 'bug']).default('feedback'),
  content: z.string().min(10, 'El contenido debe tener al menos 10 caracteres').max(2000),
});

/**
 * Schema for updating feedback status (admin only)
 */
export const updateFeedbackStatusSchema = z.object({
  status: z.enum(['new', 'in_progress', 'completed', 'closed']),
  adminNotes: z.string().max(1000).optional().nullable(),
});

/**
 * Schema for listing feedback with filters
 */
export const listFeedbackQuerySchema = z.object({
  status: z.enum(['new', 'in_progress', 'completed', 'closed']).optional(),
  type: z.enum(['feedback', 'feature_request', 'bug']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
