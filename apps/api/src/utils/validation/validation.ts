/**
 * Validation Utilities and Middleware
 *
 * AI_DECISION: Centralizar validacion de requests con Zod middleware
 * Justificacion: Evita duplicacion de logica de validacion, formato consistente de errores
 * Impacto: Todas las rutas usan el mismo patron de validacion
 * Referencias: apps/api/s../utils/validation/common-schemas.ts, apps/api/src/utils/validation-common.ts
 *
 * ## Uso Principal
 *
 * Siempre usar el middleware `validate()` en la definicion del endpoint:
 *
 * ```typescript
 * import { validate } from '../utils/validation';
 *
 * router.post('/contacts',
 *   requireAuth,
 *   validate({ body: createContactSchema }),
 *   createRouteHandler(async (req) => {
 *     // req.body ya esta validado y tipado
 *     return await createContact(req.body);
 *   })
 * );
 * ```
 *
 * ## Archivos Relacionados
 *
 * - `common-schemas.ts` - Schemas basicos reutilizables
 *   - `uuidSchema` - Validacion de UUID
 *   - `emailSchema` - Validacion de email
 *   - `paginationQuerySchema` - Paginacion estandar
 *   - `idParamSchema` - Params con ID
 *
 * - `validation-common.ts` - Helpers adicionales
 *   - `optionalEmailSchema` - Email opcional
 *   - `dateSchema` - Validacion de fechas
 *   - Helpers para campos opcionales
 *
 * - `route-handler.ts` - Wrapper para handlers
 *   - Usar junto con `validate()` para manejo completo
 *
 * ## Patron Recomendado
 *
 * ```typescript
 * // 1. Definir schemas al inicio del archivo
 * const createSchema = z.object({
 *   name: z.string().min(1),
 *   email: z.string().email(),
 * });
 *
 * // 2. Usar validate() en la ruta
 * router.post('/',
 *   requireAuth,
 *   validate({ body: createSchema }),
 *   createRouteHandler(async (req) => {
 *     // req.body ya esta validado
 *   })
 * );
 * ```
 *
 * ## Anti-Patterns
 *
 * ```typescript
 * // NO hacer validacion manual en el handler
 * router.post('/', async (req, res) => {
 *   const data = createSchema.parse(req.body); // MAL
 * });
 *
 * // NO manejar ZodError manualmente
 * try {
 *   createSchema.parse(req.body);
 * } catch (error) {
 *   if (error instanceof ZodError) { ... } // MAL - el middleware lo hace
 * }
 * ```
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// ==========================================================
// Types
// ==========================================================

/**
 * Schemas de validacion para params, query y body
 */
export interface ValidationSchemas {
  /** Schema para validar req.params (ej: { id: uuidSchema }) */
  params?: z.ZodSchema;
  /** Schema para validar req.query (ej: paginationQuerySchema) */
  query?: z.ZodSchema;
  /** Schema para validar req.body (ej: createContactSchema) */
  body?: z.ZodSchema;
}

/**
 * Resultado de validacion exitosa
 */
export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

/**
 * Resultado de validacion fallida
 */
export interface ValidationFailure {
  success: false;
  error: z.ZodError;
}

/**
 * Resultado de validacion (union)
 */
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Detalle de error de validacion
 */
export interface ValidationErrorDetail {
  path: string;
  message: string;
  code: string;
}

// ==========================================================
// Middleware
// ==========================================================

/**
 * Crea middleware Express que valida params, query y body usando Zod
 *
 * El middleware:
 * - Valida los datos usando los schemas proporcionados
 * - Reemplaza req.params/query/body con los valores validados (tipados)
 * - En caso de error, retorna 400 con formato estandar
 * - Loguea errores de validacion para debugging
 *
 * @param schemas - Objeto con schemas opcionales para params, query, body
 * @returns Middleware Express
 *
 * @example Validar solo body
 * ```typescript
 * const createContactSchema = z.object({
 *   name: z.string().min(1, 'Name is required'),
 *   email: z.string().email('Invalid email'),
 * });
 *
 * router.post('/contacts',
 *   requireAuth,
 *   validate({ body: createContactSchema }),
 *   createRouteHandler(async (req) => {
 *     // req.body es de tipo { name: string; email: string }
 *     return await createContact(req.body);
 *   })
 * );
 * ```
 *
 * @example Validar params y query
 * ```typescript
 * import { uuidSchema, paginationQuerySchema } from './common-schemas';
 *
 * const idParamSchema = z.object({ id: uuidSchema });
 *
 * router.get('/contacts/:id/tasks',
 *   requireAuth,
 *   validate({
 *     params: idParamSchema,
 *     query: paginationQuerySchema,
 *   }),
 *   createRouteHandler(async (req) => {
 *     const { id } = req.params; // tipado como { id: string }
 *     const { page, limit } = req.query; // tipado
 *     return await getContactTasks(id, { page, limit });
 *   })
 * );
 * ```
 *
 * @example Validar todo junto
 * ```typescript
 * router.patch('/contacts/:id',
 *   requireAuth,
 *   validate({
 *     params: z.object({ id: uuidSchema }),
 *     query: z.object({ notify: z.coerce.boolean().optional() }),
 *     body: updateContactSchema,
 *   }),
 *   createRouteHandler(async (req) => {
 *     const { id } = req.params;
 *     const { notify } = req.query;
 *     return await updateContact(id, req.body, { notify });
 *   })
 * );
 * ```
 *
 * AI_DECISION: Middleware de validación centralizado con tipado automático
 * Justificación: Elimina duplicación de try/catch y manejo de ZodError en cada route
 * Impacto: Todas las rutas usan el mismo patrón de validación, req.params/query/body quedan tipados automáticamente
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validar params
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }

      // Validar query
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }

      // Validar body
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details: ValidationErrorDetail[] = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        // Log para debugging
        req.log?.warn?.(
          {
            validationError: details,
            params: req.params,
            query: req.query,
            body: req.body ? Object.keys(req.body) : null,
          },
          'Validation failed'
        );

        return res.status(400).json({
          error: 'Validation error',
          details,
          requestId: req.requestId,
        });
      }

      // Error inesperado
      req.log?.error?.({ err: error }, 'Unexpected validation error');
      return res.status(500).json({
        error: 'Internal server error',
        requestId: req.requestId,
      });
    }
  };
}

// ==========================================================
// Helper Functions
// ==========================================================

/**
 * Valida un campo individual (para validacion inline)
 *
 * Usar cuando necesitas validar un valor fuera del flujo normal del middleware.
 * Lanza Error con mensaje descriptivo si la validacion falla.
 *
 * @param fieldName - Nombre del campo (para mensaje de error)
 * @param value - Valor a validar
 * @param schema - Schema Zod para validar
 * @returns Valor validado y tipado
 * @throws Error con mensaje del campo si la validacion falla
 *
 * @example
 * ```typescript
 * import { uuidSchema } from './common-schemas';
 *
 * // En algun lugar fuera del middleware
 * const fileId = validateField('fileId', someValue, uuidSchema);
 * // fileId es string (tipado) o lanza Error('fileId: Invalid uuid')
 * ```
 *
 * @example Con schema custom
 * ```typescript
 * const amount = validateField(
 *   'amount',
 *   req.body.amount,
 *   z.number().positive().max(1000000)
 * );
 * ```
 */
export function validateField<T>(fieldName: string, value: unknown, schema: z.ZodSchema<T>): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`${fieldName}: ${error.errors[0].message}`);
    }
    throw error;
  }
}

/**
 * Wrapper de safeParse que retorna formato consistente
 *
 * Usar cuando no quieres que la validacion lance excepciones.
 * Util para validar datos opcionales o multiples valores.
 *
 * @param schema - Schema Zod
 * @param data - Datos a validar
 * @returns Objeto con success y data/error
 *
 * @example
 * ```typescript
 * const result = safeParseRequest(createContactSchema, req.body);
 *
 * if (result.success) {
 *   // result.data es tipado
 *   await createContact(result.data);
 * } else {
 *   // result.error es ZodError
 *   console.log(result.error.errors);
 * }
 * ```
 *
 * @example Validar multiples valores
 * ```typescript
 * const emailResult = safeParseRequest(emailSchema, email1);
 * const email2Result = safeParseRequest(emailSchema, email2);
 *
 * const errors = [emailResult, email2Result]
 *   .filter((r) => !r.success)
 *   .map((r) => r.error);
 * ```
 */
export function safeParseRequest<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  return result;
}

/**
 * Valida y transforma datos de query string
 *
 * Los query params siempre vienen como strings. Este helper
 * valida y transforma usando z.coerce para tipos numericos/boolean.
 *
 * @param schema - Schema con z.coerce para transformacion
 * @param query - Query params del request
 * @returns Datos validados y transformados
 *
 * @example
 * ```typescript
 * const querySchema = z.object({
 *   page: z.coerce.number().int().positive().default(1),
 *   limit: z.coerce.number().int().positive().max(100).default(20),
 *   active: z.coerce.boolean().optional(),
 * });
 *
 * const { page, limit, active } = validateQuery(querySchema, req.query);
 * // page: number, limit: number, active: boolean | undefined
 * ```
 */
export function validateQuery<T>(schema: z.ZodSchema<T>, query: Record<string, unknown>): T {
  return schema.parse(query);
}

// ==========================================================
// Common Schemas (re-exports for convenience)
// ==========================================================

/**
 * Schema para ID en params (UUID)
 *
 * @example
 * ```typescript
 * router.get('/:id', validate({ params: idParamSchema }), handler);
 * ```
 */
export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

/**
 * Schema basico de paginacion
 *
 * @example
 * ```typescript
 * router.get('/', validate({ query: basicPaginationSchema }), handler);
 * ```
 */
export const basicPaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
