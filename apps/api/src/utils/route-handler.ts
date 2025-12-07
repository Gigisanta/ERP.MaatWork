/**
 * Route Handler Wrapper Utilities
 *
 * AI_DECISION: Centralizar manejo de errores y respuestas en route handlers
 * Justificacion: Elimina duplicacion de try/catch y formato de respuestas en cada ruta
 * Impacto: Todas las rutas usan el mismo patron de manejo de errores y formato de respuesta
 * Referencias: apps/api/src/utils/error-response.ts, apps/api/src/routes/
 *
 * ## Uso
 *
 * ```typescript
 * import { createRouteHandler, createAsyncHandler } from '../utils/route-handler';
 *
 * // Opcion 1: Handler que retorna datos (formato { success: true, data: ... })
 * router.get('/items', requireAuth, createRouteHandler(async (req) => {
 *   const items = await getItems();
 *   return items; // Se envuelve automaticamente en { success: true, data: items }
 * }));
 *
 * // Opcion 2: Handler que maneja res directamente (para casos especiales)
 * router.get('/items/:id', requireAuth, createAsyncHandler(async (req, res) => {
 *   const item = await getItem(req.params.id);
 *   if (!item) {
 *     return res.status(404).json({ error: 'Not found' });
 *   }
 *   return res.json(item);
 * }));
 * ```
 */

import { Request, Response, NextFunction } from 'express';
import { createErrorResponse, getStatusCodeFromError } from './error-response';

/**
 * Tipo para handlers que retornan datos directamente
 * El resultado se envuelve automaticamente en { success: true, data: result }
 */
export type RouteHandlerFn<T = unknown> = (
  req: Request,
  res: Response
) => Promise<T>;

/**
 * Tipo para handlers que manejan res directamente
 */
export type AsyncHandlerFn = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

/**
 * Respuesta estandar de exito
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  requestId?: string;
}

/**
 * Crea un route handler que:
 * - Envuelve el handler en try/catch automatico
 * - Retorna formato consistente { success: true, data: ... }
 * - Usa createErrorResponse para errores
 * - Incluye logging automatico de errores
 *
 * @param handler - Funcion async que retorna los datos a enviar
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * // El handler solo necesita retornar los datos
 * router.get('/contacts', requireAuth, createRouteHandler(async (req) => {
 *   const contacts = await db.select().from(contacts);
 *   return contacts;
 * }));
 *
 * // La respuesta sera: { success: true, data: [...contacts], requestId: '...' }
 * ```
 *
 * @example
 * ```typescript
 * // Con validacion previa (usando middleware validate)
 * router.post('/contacts',
 *   requireAuth,
 *   validate({ body: createContactSchema }),
 *   createRouteHandler(async (req) => {
 *     const contact = await createContact(req.body);
 *     return contact;
 *   })
 * );
 * ```
 */
export function createRouteHandler<T>(handler: RouteHandlerFn<T>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await handler(req, res);

      // Si el handler ya envio una respuesta (verificar si headers fueron enviados)
      if (res.headersSent) {
        return;
      }

      // Enviar respuesta exitosa estandarizada
      const response: SuccessResponse<T> = {
        success: true,
        data: result,
        requestId: req.requestId,
      };

      res.json(response);
    } catch (error) {
      // Log del error con contexto
      req.log?.error?.(
        {
          err: error,
          requestId: req.requestId,
          method: req.method,
          url: req.url,
          userId: req.user?.id,
        },
        'Route handler error'
      );

      // Determinar codigo de estado y generar respuesta de error
      const statusCode = getStatusCodeFromError(error);
      const errorResponse = createErrorResponse({
        error,
        requestId: req.requestId,
        userMessage: getDefaultUserMessage(statusCode),
      });

      res.status(statusCode).json(errorResponse);
    }
  };
}

/**
 * Wrapper simple para handlers async que manejan res directamente
 * Solo agrega try/catch y logging, sin modificar el formato de respuesta
 *
 * **Cuándo usar createAsyncHandler:**
 * 
 * Usa `createAsyncHandler` SOLO cuando necesites control directo sobre `res`:
 * 
 * 1. **Cookies (httpOnly, secure, etc.)**
 *    ```typescript
 *    // Login/refresh tokens necesitan establecer cookies
 *    createAsyncHandler(async (req, res) => {
 *      res.cookie('token', token, { httpOnly: true, secure: true });
 *      return res.json({ success: true, user });
 *    })
 *    ```
 * 
 * 2. **Headers personalizados**
 *    ```typescript
 *    // Export endpoints necesitan Content-Type específico
 *    createAsyncHandler(async (req, res) => {
 *      res.setHeader('Content-Type', 'text/csv');
 *      res.send(csvData);
 *    })
 *    ```
 * 
 * 3. **Streaming responses**
 *    ```typescript
 *    // File downloads o streaming
 *    createAsyncHandler(async (req, res) => {
 *      res.setHeader('Content-Type', 'application/octet-stream');
 *      stream.pipe(res);
 *    })
 *    ```
 * 
 * 4. **Respuestas con formato legacy/no estándar**
 *    ```typescript
 *    // Health checks con formato específico
 *    createAsyncHandler(async (req, res) => {
 *      return res.json({ status: 'healthy', timestamp: ... });
 *    })
 *    ```
 * 
 * **Cuándo NO usar createAsyncHandler:**
 * 
 * Si solo retornas datos JSON estándar, usa `createRouteHandler`:
 * 
 * ```typescript
 * // ❌ INCORRECTO - No necesitas control directo de res
 * createAsyncHandler(async (req, res) => {
 *   const data = await getData();
 *   return res.json({ success: true, data });
 * })
 * 
 * // ✅ CORRECTO - createRouteHandler envuelve automáticamente
 * createRouteHandler(async (req) => {
 *   return await getData(); // Se envuelve en { success: true, data: ... }
 * })
 * ```
 *
 * @param handler - Funcion async que maneja req, res directamente
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * // Caso legítimo: establecer cookies
 * router.post('/auth/login',
 *   createAsyncHandler(async (req, res) => {
 *     const token = await signToken(user);
 *     res.cookie('token', token, { httpOnly: true });
 *     return res.json({ success: true, user });
 *   })
 * );
 * ```
 * 
 * @example
 * ```typescript
 * // Caso legítimo: export con headers personalizados
 * router.get('/export',
 *   requireAuth,
 *   createAsyncHandler(async (req, res) => {
 *     const data = await generateExport();
 *     res.setHeader('Content-Type', 'text/csv');
 *     res.setHeader('Content-Disposition', 'attachment; filename="export.csv"');
 *     res.send(data);
 *   })
 * );
 * ```
 */
export function createAsyncHandler(handler: AsyncHandlerFn) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await handler(req, res, next);
    } catch (error) {
      // Log del error con contexto
      req.log?.error?.(
        {
          err: error,
          requestId: req.requestId,
          method: req.method,
          url: req.url,
          userId: req.user?.id,
        },
        'Async handler error'
      );

      // Si ya se enviaron headers, no podemos enviar otra respuesta
      if (res.headersSent) {
        return next(error);
      }

      // Determinar codigo de estado y generar respuesta de error
      const statusCode = getStatusCodeFromError(error);
      const errorResponse = createErrorResponse({
        error,
        requestId: req.requestId,
        userMessage: getDefaultUserMessage(statusCode),
      });

      res.status(statusCode).json(errorResponse);
    }
  };
}

/**
 * Obtiene mensaje de usuario por defecto segun codigo HTTP
 */
function getDefaultUserMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Invalid request data';
    case 401:
      return 'Authentication required';
    case 403:
      return 'Access denied';
    case 404:
      return 'Resource not found';
    case 409:
      return 'Resource conflict';
    case 429:
      return 'Too many requests';
    default:
      return 'An error occurred while processing your request';
  }
}

/**
 * Type guard para verificar si un error tiene un codigo de estado especifico
 */
export function isHttpError(error: unknown, statusCode: number): boolean {
  return getStatusCodeFromError(error) === statusCode;
}

/**
 * Clase de error con codigo HTTP explicito
 * Usar cuando necesitas control preciso sobre el codigo de estado
 *
 * @example
 * ```typescript
 * throw new HttpError(404, 'Contact not found');
 * throw new HttpError(403, 'You do not have permission to access this resource');
 * ```
 */
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

// Extender getStatusCodeFromError para soportar HttpError
const originalGetStatusCode = getStatusCodeFromError;
export function getStatusCode(error: unknown): number {
  if (error instanceof HttpError) {
    return error.statusCode;
  }
  return originalGetStatusCode(error);
}
