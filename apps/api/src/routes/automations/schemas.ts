/**
 * Automations Validation Schemas
 *
 * Zod schemas for validating automation config CRUD operations
 */
import { z } from 'zod';
import { idParamSchema } from '../../utils/common-schemas';

// ==========================================================
// Body Schemas
// ==========================================================

const triggerConfigSchema = z.record(z.unknown());
const automationConfigDataSchema = z.record(z.unknown());

export const createAutomationConfigSchema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(200),
  triggerType: z.string().min(1).max(100),
  triggerConfig: triggerConfigSchema,
  webhookUrl: z.string().url().optional().nullable(),
  enabled: z.boolean().default(true),
  config: automationConfigDataSchema.optional().default({}),
});

export const updateAutomationConfigSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  triggerType: z.string().min(1).max(100).optional(),
  triggerConfig: triggerConfigSchema.optional(),
  webhookUrl: z.string().url().optional().nullable(),
  enabled: z.boolean().optional(),
  config: automationConfigDataSchema.optional(),
});

// ==========================================================
// Param Schemas
// ==========================================================

export { idParamSchema };

export const automationNameParamSchema = z.object({
  name: z.string().min(1),
});

// ==========================================================
// Type Exports
// ==========================================================

export type CreateAutomationConfigInput = z.infer<typeof createAutomationConfigSchema>;
export type UpdateAutomationConfigInput = z.infer<typeof updateAutomationConfigSchema>;
