/**
 * Zod Validation Schemas for Benchmarks
 */

import { z } from 'zod';
import { uuidSchema } from '../../utils/common-schemas';

// ==========================================================
// Benchmark Component Schemas
// ==========================================================

export const benchmarkComponentSchema = z.object({
  instrumentId: uuidSchema,
  weight: z.number().min(0).max(1),
});

export const createBenchmarkSchema = z
  .object({
    code: z.string().min(1).max(50),
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional().nullable(),
    components: z.array(benchmarkComponentSchema).optional(),
  })
  .refine(
    (data) => {
      if (data.components && data.components.length > 0) {
        const totalWeight = data.components.reduce((sum, comp) => sum + comp.weight, 0);
        return Math.abs(totalWeight - 1.0) < 0.0001;
      }
      return true;
    },
    {
      message: 'La suma de pesos debe ser 100%',
      path: ['components'],
    }
  );

export const updateBenchmarkSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
});

export const addComponentSchema = z.object({
  instrumentId: uuidSchema,
  weight: z.number().min(0).max(1),
});

export const updateComponentSchema = z.object({
  weight: z.number().min(0).max(1),
});





















