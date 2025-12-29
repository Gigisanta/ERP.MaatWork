import { z } from 'zod';
import { uuidSchema } from '../../utils/validation/common-schemas';

export const createLevelSchema = z.object({
  category: z.string().min(1).max(100),
  level: z.string().min(1).max(100),
  levelNumber: z.number().int().positive(),
  index: z.union([z.string(), z.number()]).transform((val) => {
    if (typeof val === 'string') {
      return val;
    }
    return val.toString();
  }),
  percentage: z.union([z.string(), z.number()]).transform((val) => {
    if (typeof val === 'string') {
      return val;
    }
    return val.toString();
  }),
  annualGoalUsd: z.number().int().positive(),
  isActive: z.boolean().optional().default(true),
});

export const updateLevelSchema = z.object({
  category: z.string().min(1).max(100).optional(),
  level: z.string().min(1).max(100).optional(),
  levelNumber: z.number().int().positive().optional(),
  index: z
    .union([z.string(), z.number()])
    .transform((val) => {
      if (typeof val === 'string') {
        return val;
      }
      return val.toString();
    })
    .optional(),
  percentage: z
    .union([z.string(), z.number()])
    .transform((val) => {
      if (typeof val === 'string') {
        return val;
      }
      return val.toString();
    })
    .optional(),
  annualGoalUsd: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

