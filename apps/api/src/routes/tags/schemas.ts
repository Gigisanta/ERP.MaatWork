/**
 * Tags Validation Schemas
 *
 * Zod schemas for tags, contact-tags, tag rules, and segments
 */

import { z } from 'zod';
import { uuidSchema, paginationQuerySchema } from '../../utils/common-schemas';
import { VALIDATION_LIMITS, PAGINATION_LIMITS } from '../../config/api-limits';

// Query parameter schemas
export const listTagsQuerySchema = z.object({
  scope: z.enum(['contact', 'meeting', 'note']).optional(),
  q: z.string().min(1).max(255).optional(),
  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .pipe(z.number().int().min(1).max(PAGINATION_LIMITS.QUICK_SEARCH_LIMIT))
    .optional()
    .default(String(PAGINATION_LIMITS.QUICK_SEARCH_LIMIT)),
});

export const listRulesQuerySchema = z.object({
  tagId: z.string().uuid().optional(),
});

export const listSegmentsQuerySchema = z.object({
  includeShared: z.enum(['true', 'false']).optional().default('true'),
});

export const segmentContactsQuerySchema = paginationQuerySchema;

export const batchContactTagsQuerySchema = z.object({
  contactIds: z.string().min(1),
});

export const contactTagParamsSchema = z.object({
  contactId: uuidSchema,
  tagId: uuidSchema,
});

// Body schemas
export const createTagSchema = z.object({
  scope: z.enum(['contact', 'meeting', 'note']),
  name: z.string().min(VALIDATION_LIMITS.MIN_NAME_LENGTH).max(VALIDATION_LIMITS.MAX_NAME_LENGTH),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#6B7280'),
  icon: z.string().max(50).optional().nullable(),
  description: z.string().max(VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH).optional().nullable(),
  businessLine: z.enum(['inversiones', 'zurich', 'patrimonial']).optional().nullable(),
});

export const updateTagSchema = createTagSchema.partial().omit({ scope: true });

export const assignTagsSchema = z.object({
  contactIds: z.array(z.string().uuid()).min(1),
});

export const updateContactTagsSchema = z.object({
  add: z.array(z.union([z.string().uuid(), z.string()])).default([]),
  remove: z.array(z.string().uuid()).default([]),
});

export const updateContactTagSchema = z.object({
  monthlyPremium: z.union([z.number().int().positive(), z.null()]).optional(),
  policyNumber: z.union([z.string().max(VALIDATION_LIMITS.MAX_NAME_LENGTH), z.null()]).optional(),
});

export const createTagRuleSchema = z.object({
  tagId: z.string().uuid(),
  name: z.string().min(VALIDATION_LIMITS.MIN_NAME_LENGTH).max(VALIDATION_LIMITS.MAX_NAME_LENGTH),
  conditions: z.record(z.unknown()),
  isActive: z.boolean().default(true),
});

export const createSegmentSchema = z.object({
  name: z.string().min(VALIDATION_LIMITS.MIN_NAME_LENGTH).max(VALIDATION_LIMITS.MAX_NAME_LENGTH),
  description: z.string().max(VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH).optional().nullable(),
  filters: z.record(z.unknown()),
  isDynamic: z.boolean().default(true),
  refreshSchedule: z.string().optional().nullable(),
});

// Type exports
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type UpdateContactTagsInput = z.infer<typeof updateContactTagsSchema>;
export type UpdateContactTagInput = z.infer<typeof updateContactTagSchema>;
export type CreateTagRuleInput = z.infer<typeof createTagRuleSchema>;
export type CreateSegmentInput = z.infer<typeof createSegmentSchema>;



























