/**
 * Schemas de validación para Tasks
 *
 * AI_DECISION: Extraer schemas Zod a archivo separado
 * Justificación: Mejora la organización y permite reutilización de schemas
 * Impacto: Código más modular y mantenible
 */

import { z } from 'zod';
import {
  uuidSchema,
  paginationQuerySchema,
  dateSchema,
  timeSchema,
  titleSchema,
  descriptionSchema,
  idParamSchema,
} from '../../utils/validation/common-schemas';

// Query parameter schemas
// AI_DECISION: Usar .and() en lugar de .extend() porque paginationQuerySchema es ZodEffects
// Justificación: .extend() solo funciona en ZodObject, pero paginationQuerySchema tiene .refine()
// Impacto: Schema combinado correctamente manteniendo validación de paginación
export const listTasksQuerySchema = paginationQuerySchema.and(
  z.object({
    status: z.string().optional(),
    assignedToUserId: uuidSchema.optional(),
    contactId: uuidSchema.optional(),
    dueDateFrom: dateSchema.optional(),
    dueDateTo: dateSchema.optional(),
    priority: z.string().optional(),
    includeCompleted: z.enum(['true', 'false']).optional().default('false'),
  })
);

export const exportTasksQuerySchema = z.object({
  status: z.string().optional(),
  assignedToUserId: uuidSchema.optional(),
  dueDateFrom: dateSchema.optional(),
  dueDateTo: dateSchema.optional(),
});

// Body schemas
export const createTaskSchema = z.object({
  contactId: uuidSchema,
  meetingId: uuidSchema.optional().nullable(),
  title: titleSchema,
  description: descriptionSchema,
  status: z.string(), // Referencia a lookupTaskStatus
  dueDate: z.string().optional().nullable(), // ISO date
  dueTime: timeSchema.optional().nullable(), // HH:MM
  priority: z.string(), // Referencia a lookupPriority
  assignedToUserId: uuidSchema,
  recurrence: z
    .object({
      rrule: z.string(),
      timezone: z.string().default('America/Argentina/Buenos_Aires'),
      startDate: z.string(),
      endDate: z.string().optional().nullable(),
    })
    .optional(),
});

export const updateTaskSchema = createTaskSchema.omit({ contactId: true }).partial();

export const bulkActionSchema = z.object({
  taskIds: z.array(uuidSchema).min(1),
  action: z.enum(['complete', 'delete', 'reassign', 'change_status']),
  params: z.record(z.any()).optional(),
});

export const taskIdParamsSchema = idParamSchema;

export const batchTasksQuerySchema = z.object({
  contactIds: z.string().min(1),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  status: z.string().optional(),
  includeCompleted: z.enum(['true', 'false']).optional().default('false'),
});




