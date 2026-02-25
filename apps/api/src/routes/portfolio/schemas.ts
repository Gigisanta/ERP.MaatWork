/**
 * Schemas de validación Zod para Portfolio
 */

import { z } from 'zod';
import { uuidSchema } from '../../utils/validation/common-schemas';

// ==========================================================
// Zod Validation Schemas
// ==========================================================

const portfolioAssignmentStatusSchema = z.enum(['active', 'paused', 'ended']);

/**
 * Schema para query params de listado de portfolios
 * Soporta paginación, búsqueda y filtros
 */
export const listPortfoliosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().max(255).optional(),
  sortBy: z.enum(['name', 'createdAt', 'clientCount', 'lineCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const createPortfolioSchema = z.object({
  code: z.string().max(50, 'Código demasiado largo').optional().nullable(),
  name: z.string().min(1, 'Nombre es requerido').max(255, 'Nombre demasiado largo'),
  description: z.string().max(1000, 'Descripción demasiado larga').optional().nullable(),
});

export const updatePortfolioSchema = z.object({
  code: z.string().max(50, 'Código demasiado largo').optional().nullable(),
  name: z.string().min(1, 'Nombre es requerido').max(255, 'Nombre demasiado largo').optional(),
  description: z.string().max(1000, 'Descripción demasiado larga').optional().nullable(),
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

export const portfolioIdParamSchema = z.object({
  id: uuidSchema,
});

export const lineIdParamSchema = z.object({
  id: uuidSchema,
  lineId: uuidSchema,
});

export const createAssignmentSchema = z.object({
  contactId: uuidSchema,
  portfolioId: uuidSchema,
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
