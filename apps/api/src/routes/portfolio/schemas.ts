/**
 * Schemas de validación Zod para Portfolio
 */

import { z } from 'zod';
import { uuidSchema } from '../../utils/validation/common-schemas';

// ==========================================================
// Zod Validation Schemas
// ==========================================================

const riskLevelSchema = z.enum(['conservative', 'moderate', 'aggressive']);

const portfolioAssignmentStatusSchema = z.enum(['active', 'paused', 'ended']);

export const createPortfolioSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido').max(255, 'Nombre demasiado largo'),
  description: z.string().max(1000, 'Descripción demasiado larga').optional().nullable(),
  riskLevel: riskLevelSchema,
});

export const updatePortfolioSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  riskLevel: riskLevelSchema.optional(),
});

export const addPortfolioLineSchema = z
  .object({
    targetType: z.enum(['instrument', 'assetClass']),
    instrumentId: uuidSchema.optional(),
    assetClass: z.string().optional(),
    targetWeight: z
      .number()
      .min(0, 'El peso debe ser mayor o igual a 0')
      .max(1, 'El peso debe ser menor o igual a 1'),
  })
  .refine(
    (data) => {
      if (data.targetType === 'instrument' && !data.instrumentId) {
        return false;
      }
      if (data.targetType === 'assetClass' && !data.assetClass) {
        return false;
      }
      return true;
    },
    {
      message:
        'instrumentId es requerido para tipo instrument, assetClass es requerido para tipo assetClass',
    }
  );

export const templateIdParamSchema = z.object({
  id: uuidSchema,
});

export const lineIdParamSchema = z.object({
  id: uuidSchema,
  lineId: uuidSchema,
});

export const createAssignmentSchema = z.object({
  contactId: uuidSchema,
  templateId: uuidSchema,
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/, 'Invalid ISO date format'),
  notes: z.string().optional().nullable(),
});

export const updateAssignmentStatusSchema = z.object({
  status: portfolioAssignmentStatusSchema,
});

export const assignmentIdParamSchema = z.object({
  id: uuidSchema,
});








