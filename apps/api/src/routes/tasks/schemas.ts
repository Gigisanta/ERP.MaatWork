/**
 * Schemas de validación para Tasks
 *
 * AI_DECISION: Extraer schemas Zod a archivo separado
 * Justificación: Mejora la organización y permite reutilización de schemas
 * Impacto: Código más modular y mantenible
 */

import { z } from 'zod';
import { uuidSchema, paginationQuerySchema, dateSchema } from '../../utils/common-schemas';

// Query parameter schemas
// AI_DECISION: Usar .and() en lugar de .extend() porque paginationQuerySchema es ZodEffects
// Justificación: .extend() solo funciona en ZodObject, pero paginationQuerySchema tiene .refine()
// Impacto: Schema combinado correctamente manteniendo validación de paginación
export const listTasksQuerySchema = paginationQuerySchema.and(
  z.object({
    status: z.string().optional(),
    assignedToUserId: z.string().uuid().optional(),
    contactId: z.string().uuid().optional(),
    dueDateFrom: dateSchema.optional(),
    dueDateTo: dateSchema.optional(),
    priority: z.string().optional(),
    includeCompleted: z.enum(['true', 'false']).optional().default('false'),
  })
);

export const exportTasksQuerySchema = z.object({
  status: z.string().optional(),
  assignedToUserId: z.string().uuid().optional(),
  dueDateFrom: dateSchema.optional(),
  dueDateTo: dateSchema.optional(),
});

// Body schemas
export const createTaskSchema = z.object({
  contactId: z.string().uuid(),
  meetingId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(500),
  description: z.string().optional().nullable(),
  status: z.string(), // Referencia a lookupTaskStatus
  dueDate: z.string().optional().nullable(), // ISO date
  dueTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .nullable(), // HH:MM
  priority: z.string(), // Referencia a lookupPriority
  assignedToUserId: z.string().uuid(),
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
  taskIds: z.array(z.string().uuid()).min(1),
  action: z.enum(['complete', 'delete', 'reassign', 'change_status']),
  params: z.record(z.any()).optional(),
});

export const taskIdParamsSchema = z.object({ id: uuidSchema });

export const batchTasksQuerySchema = z.object({
  contactIds: z.string().min(1),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  status: z.string().optional(),
  includeCompleted: z.enum(['true', 'false']).optional().default('false'),
});
