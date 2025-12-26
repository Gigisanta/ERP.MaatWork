import { z } from 'zod';
import { uuidSchema } from '../../utils/validation/common-schemas';

export const createTemplateSchema = z.object({
  code: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  subjectTemplate: z.string().optional().nullable(),
  bodyTemplate: z.string().min(1),
  pushTemplate: z.string().optional().nullable(),
  variables: z.array(z.string()),
  defaultChannel: z.enum(['in_app', 'email', 'push', 'whatsapp']).default('in_app'),
});

export const createNotificationSchema = z.object({
  userId: uuidSchema,
  type: z.string(),
  templateId: uuidSchema.optional().nullable(),
  severity: z.enum(['info', 'warning', 'critical']),
  contactId: uuidSchema.optional().nullable(),
  taskId: uuidSchema.optional().nullable(),
  payload: z.record(z.unknown()),
  renderedSubject: z.string().optional().nullable(),
  renderedBody: z.string().min(1),
});

export const updatePreferencesSchema = z.object({
  channel: z.enum(['email', 'whatsapp', 'push']),
  enabled: z.boolean(),
  address: z.record(z.unknown()).optional(),
});

export const snoozeNotificationSchema = z.object({
  until: z.string(), // ISO datetime
});

