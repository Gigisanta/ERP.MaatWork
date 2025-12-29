/**
 * Additional validation helpers and schema factories
 *
 * Extends common-schemas.ts with helper functions for creating custom schemas.
 *
 * ## When to use this file:
 * - Use when you need optional versions of basic schemas (`optionalEmailSchema`)
 * - Use factory functions for parameterized schemas (`stringLengthSchema`, `enumSchema`)
 * - Use for domain-specific validators (`phoneSchema`, `dniSchema`, `percentageSchema`)
 *
 * ## Contents:
 * - Optional schemas: `optionalEmailSchema`, `optionalUuidSchema`
 * - Factory functions: `positiveNumberSchema()`, `stringLengthSchema()`, `enumSchema()`
 * - Domain validators: `phoneSchema`, `dniSchema`, `percentageSchema`, `countryCodeSchema`
 * - Array validators: `nonEmptyArraySchema()`
 *
 * ## Related files:
 * - `common-schemas.ts` - Basic reusable schemas (prefer these for standard validations)
 * - `validation.ts` - Middleware for applying schemas to requests
 *
 * @example
 * ```typescript
 * import { optionalEmailSchema, stringLengthSchema, percentageSchema } from '../utils/validation-common';
 *
 * const updateProfileSchema = z.object({
 *   email: optionalEmailSchema,
 *   bio: stringLengthSchema(0, 500, 'bio'),
 *   completionRate: percentageSchema
 * });
 * ```
 */

import { z } from 'zod';
import {
  uuidSchema,
  emailSchema,
  optionalEmailSchema,
  optionalUuidSchema,
  dateSchema,
  phoneSchema as basePhoneSchema,
  dniSchema as baseDniSchema,
  percentageSchema as basePercentageSchema,
  countryCodeSchema as baseCountryCodeSchema,
} from './common-schemas';

/**
 * Schema para validar email opcional (puede ser null o undefined)
 * @deprecated Use optionalEmailSchema from common-schemas.ts
 */
export { optionalEmailSchema };

/**
 * Schema para validar UUID opcional (puede ser null o undefined)
 * @deprecated Use optionalUuidSchema from common-schemas.ts
 */
export { optionalUuidSchema };

/**
 * Schema para validar rango de fechas
 */
const dateRangeSchema = z
  .object({
    from: dateSchema.optional(),
    to: dateSchema.optional(),
  })
  .refine(
    (data) => {
      if (!data.from || !data.to) return true;
      return data.from <= data.to;
    },
    { message: 'from date must be before or equal to to date' }
  );

/**
 * Schema para validar número positivo
 */
function positiveNumberSchema(fieldName: string = 'number') {
  return z.number().positive(`${fieldName} must be positive`);
}

/**
 * Schema para validar número no negativo
 */
function nonNegativeNumberSchema(fieldName: string = 'number') {
  return z.number().nonnegative(`${fieldName} must be non-negative`);
}

/**
 * Schema para validar string con longitud mínima y máxima
 */
function stringLengthSchema(min: number, max: number, fieldName: string = 'string') {
  return z
    .string()
    .min(min, `${fieldName} must be at least ${min} characters`)
    .max(max, `${fieldName} must be at most ${max} characters`);
}

/**
 * Schema para validar string no vacío
 */
function nonEmptyStringSchema(fieldName: string = 'string') {
  return z.string().min(1, `${fieldName} cannot be empty`).trim();
}

/**
 * Helper para validar que un valor esté en un array de valores permitidos
 */
function enumSchema<T extends [string, ...string[]]>(values: T, fieldName: string = 'value') {
  return z.enum(values, {
    errorMap: () => ({ message: `${fieldName} must be one of: ${values.join(', ')}` }),
  });
}

/**
 * Helper para validar formato de teléfono (básico) - Versión estricta (no opcional)
 */
const phoneSchema = z
  .string()
  .regex(/^[\d\s\-+()]+$/, 'Invalid phone format')
  .max(50);

/**
 * Helper para validar formato de DNI (básico) - Versión estricta (no opcional)
 */
const dniSchema = z
  .string()
  .regex(/^[\d.]+$/, 'Invalid DNI format')
  .max(50);

/**
 * Helper para validar porcentaje (0-100) - Versión estricta (no opcional)
 */
const percentageSchema = z.number().min(0).max(100);

/**
 * Helper para validar código de país ISO 3166-1 alpha-2 - Versión estricta (no opcional)
 */
const countryCodeSchema = z
  .string()
  .length(2)
  .regex(/^[A-Z]{2}$/, 'Invalid country code (must be ISO 3166-1 alpha-2)');

/**
 * Helper para validar que un array no esté vacío
 */
function nonEmptyArraySchema<T extends z.ZodTypeAny>(itemSchema: T, fieldName: string = 'array') {
  return z.array(itemSchema).min(1, `${fieldName} cannot be empty`);
}

/**
 * Helper para validar que un valor sea uno de varios tipos
 */
function oneOfSchema<T extends z.ZodTypeAny>(schemas: T[], fieldName: string = 'value') {
  return z.union(schemas as [T, T, ...T[]]);
}
