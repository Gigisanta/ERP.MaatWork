/**
 * Contacts Validation Schemas
 *
 * Zod schemas for validating contacts CRUD operations
 */
import { z } from 'zod';
import {
  paginationQuerySchema,
  nameSchema,
  phoneSchema,
  addressSchema,
  notesSchema,
  countryCodeSchema,
  amountSchema
} from '../../utils/validation/common-schemas';
import { optionalEmailSchema } from '../../utils/validation/validation-common';

// ==========================================================
// Query Parameter Schemas
// ==========================================================

// AI_DECISION: Usar .and() en lugar de .extend() porque paginationQuerySchema es ZodEffects
// Justificación: .extend() solo funciona en ZodObject, pero paginationQuerySchema tiene .refine()
// Impacto: Schema combinado correctamente manteniendo validación de paginación
export const listContactsQuerySchema = paginationQuerySchema.and(
  z.object({
    pipelineStageId: z.string().uuid().optional(),
    assignedAdvisorId: z.string().uuid().optional(),
  })
);

export const contactDetailQuerySchema = z.object({
  includeTimeline: z.enum(['true', 'false']).optional().default('true'),
});

export const batchContactsQuerySchema = z.object({
  contactIds: z.string().min(1),
  includeTags: z.enum(['true', 'false']).optional().default('true'),
});

// ==========================================================
// Body Schemas
// ==========================================================

const optionalLongText = z.string().max(2000).trim().optional().nullable();

export const createContactSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: optionalEmailSchema,
  phone: phoneSchema,
  phoneSecondary: phoneSchema,
  whatsapp: phoneSchema,
  address: addressSchema,
  city: z.string().optional().nullable(),
  country: countryCodeSchema,
  dateOfBirth: z.string().optional().nullable(), // ISO date
  dni: z.string().max(50).optional().nullable(),
  pipelineStageId: z.string().uuid().optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  riskProfile: z.enum(['low', 'mid', 'high']).optional().nullable(),
  assignedAdvisorId: z.string().uuid().optional().nullable(),
  assignedTeamId: z.string().uuid().optional().nullable(),
  nextStep: z.string().max(500).optional().nullable(),
  notes: notesSchema,
  queSeDedica: optionalLongText,
  familia: optionalLongText,
  expectativas: optionalLongText,
  objetivos: optionalLongText,
  requisitosPlanificacion: optionalLongText,
  prioridades: z.array(z.string().max(500)).optional().default([]),
  preocupaciones: z.array(z.string().max(500)).optional().default([]),
  ingresos: amountSchema,
  gastos: amountSchema,
  excedente: z
    .union([
      z.number(),
      z
        .string()
        .regex(/^-?\d+(\.\d{1,2})?$/)
        .transform((val) => parseFloat(val)),
    ])
    .optional()
    .nullable(),
  customFields: z.record(z.unknown()).optional(),
});

export const updateContactSchema = createContactSchema.partial();

export const patchContactSchema = z.object({
  fields: z.array(
    z.object({
      field: z.string(),
      value: z.unknown(),
    })
  ),
});

// Type exports for use in route handlers
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type PatchContactInput = z.infer<typeof patchContactSchema>;
