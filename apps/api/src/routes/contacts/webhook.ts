/**
 * Contacts Webhook Routes
 *
 * Handles webhook export operations
 */

import { Router, type Request, type Response } from 'express';
import { requireAuth } from '@/auth/middlewares';
import { validate } from '@/utils/validation';
import { createUserRateLimiter } from '@/utils/performance/rate-limiter';
import { getHttpClient } from '@/utils/http/http-client';
import { env } from '@/config/env';
import { RETRY_LIMITS, PAYLOAD_LIMITS, ERROR_LIMITS } from '@/config/api-limits';
import { z } from 'zod';
import { createAsyncHandler } from '@/utils/route-handler';
import { uuidSchema } from '@/utils/validation/common-schemas';

const router = Router();

// Rate limiter para webhooks (por usuario)
const webhookRateLimiter = createUserRateLimiter({
  capacity: env.N8N_WEBHOOK_RATE_LIMIT,
  refillPerSec: env.N8N_WEBHOOK_RATE_LIMIT / 60, // Refill rate: capacidad por minuto
});

// ==========================================================
// Zod Validation Schemas
// ==========================================================

// Webhook export schema - más permisivo para aceptar contactos existentes
// AI_DECISION: Schema permisivo para webhook export
// Justificación: Los contactos existentes pueden tener datos inválidos (emails mal formateados, etc.)
// No debemos rechazar el envío completo por validaciones estrictas, el webhook puede manejar los datos
// Impacto: Permite exportar todos los contactos sin fallar por validaciones estrictas
// Usa .passthrough() para aceptar cualquier campo adicional que pueda venir del frontend
const webhookContactSchema = z
  .object({
    id: uuidSchema,
    firstName: z.string(),
    lastName: z.string(),
    fullName: z.string().optional(), // Puede no estar presente en algunos casos
    email: z.union([z.string(), z.null()]).optional(), // Permite cualquier string o null, sin validar formato
    phone: z.union([z.string(), z.null()]).optional(),
    country: z.union([z.string(), z.null()]).optional(),
    dni: z.union([z.string(), z.null()]).optional(),
    pipelineStageId: z.union([uuidSchema, z.null()]).optional(),
    source: z.union([z.string(), z.null()]).optional(),
    riskProfile: z.union([z.enum(['low', 'mid', 'high']), z.null()]).optional(),
    assignedAdvisorId: z.union([uuidSchema, z.null()]).optional(),
    assignedTeamId: z.union([uuidSchema, z.null()]).optional(),
    nextStep: z.union([z.string(), z.null()]).optional(),
    notes: z.union([z.string(), z.null()]).optional(),
    queSeDedica: z.union([z.string(), z.null()]).optional(),
    familia: z.union([z.string(), z.null()]).optional(),
    expectativas: z.union([z.string(), z.null()]).optional(),
    objetivos: z.union([z.string(), z.null()]).optional(),
    requisitosPlanificacion: z.union([z.string(), z.null()]).optional(),
    prioridades: z.union([z.array(z.string()), z.null()]).optional(),
    preocupaciones: z.union([z.array(z.string()), z.null()]).optional(),
    ingresos: z.union([z.number(), z.string(), z.null()]).optional(),
    gastos: z.union([z.number(), z.string(), z.null()]).optional(),
    excedente: z.union([z.number(), z.string(), z.null()]).optional(),
    customFields: z.union([z.record(z.unknown()), z.null()]).optional(),
    contactLastTouchAt: z.union([z.string(), z.null()]).optional(),
    pipelineStageUpdatedAt: z.union([z.string(), z.null()]).optional(),
    createdAt: z.union([z.string(), z.date()]).optional(),
    updatedAt: z.union([z.string(), z.date()]).optional(),
    version: z.union([z.number(), z.null()]).optional(),
    deletedAt: z.union([z.string(), z.date(), z.null()]).optional(),
    tags: z.array(z.unknown()).optional(), // Tags pueden venir del frontend
  })
  .passthrough(); // Permite campos adicionales que puedan venir del frontend (phoneSecondary, whatsapp, address, city, dateOfBirth, etc.)

const webhookExportSchema = z.object({
  webhookUrl: z
    .string()
    .url()
    .refine((url) => {
      try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
      } catch {
        return false;
      }
    }, 'URL must use http:// or https://'),
  contacts: z.array(webhookContactSchema).min(1, 'At least one contact is required'),
  metadata: z
    .object({
      filters: z
        .object({
          stage: z.string().nullable().optional(),
          tags: z.array(z.string()).optional(),
          search: z.string().nullable().optional(),
          advisorId: z.string().nullable().optional(),
        })
        .optional(),
    })
    .optional(),
});

// ==========================================================
// Helper Functions
// ==========================================================

/**
 * Dividir array en lotes (batches)
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Retry con exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = RETRY_LIMITS.MAX_RETRIES,
  baseDelay: number = RETRY_LIMITS.INITIAL_RETRY_DELAY,
  logger?: { warn: (obj: unknown, msg: string) => void }
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      logger?.warn({ attempt: attempt + 1, maxRetries, delay, error }, 'Retrying webhook request');
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// ==========================================================
// Routes
// ==========================================================

/**
 * POST /contacts/webhook - Enviar contactos a webhook (proxy optimizado)
 */
router.post(
  '/webhook',
  requireAuth,
  webhookRateLimiter.middleware(),
  validate({ body: webhookExportSchema }),
  createAsyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Verificar si N8N está habilitado
    if (!env.N8N_ENABLED) {
      return res.status(503).json({
        success: false,
        error: 'N8N webhook service is disabled',
        requestId: req.requestId,
      });
    }

    const { webhookUrl, contacts, metadata } = req.body;

    // Validar tamaño de payload
    const payloadSize = JSON.stringify(contacts).length;
    const maxPayloadSize = PAYLOAD_LIMITS.MAX_BODY_SIZE;

    if (payloadSize > maxPayloadSize) {
      req.log.warn(
        {
          payloadSize,
          maxPayloadSize,
          contactsCount: contacts.length,
        },
        'Payload too large, will use batching'
      );
    }

    // Dividir en batches si es necesario
    const batchSize = env.N8N_WEBHOOK_BATCH_SIZE;
    const batches = contacts.length > batchSize ? chunkArray(contacts, batchSize) : [contacts];

    req.log.info(
      {
        userId,
        userRole,
        action: 'webhook_export',
        webhookUrl,
        contactsCount: contacts.length,
        batchesCount: batches.length,
        batchSize,
      },
      'Iniciando envío de contactos a webhook'
    );

    // Obtener cliente HTTP optimizado
    const httpClient = getHttpClient(req.log);

    // Enviar batches en paralelo (limitado por rate limit)
    const batchResults = await Promise.allSettled(
      batches.map(async (batch, batchIndex) => {
        const batchStartTime = Date.now();

        // Preparar payload para batch
        const payload = {
          contacts: batch,
          metadata: {
            total: contacts.length,
            batchIndex: batchIndex + 1,
            totalBatches: batches.length,
            exportedAt: new Date().toISOString(),
            filters: metadata?.filters ?? {
              stage: null,
              tags: [],
              search: null,
              advisorId: null,
            },
          },
        };

        // Validar tamaño de payload del batch
        const batchPayloadSize = JSON.stringify(payload).length;
        if (batchPayloadSize > maxPayloadSize) {
          throw new Error(`Batch payload too large: ${batchPayloadSize} bytes`);
        }

        // Crear AbortController para timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, env.N8N_WEBHOOK_TIMEOUT);

        try {
          // Enviar con retry y exponential backoff
          const response = await retryWithBackoff(
            async () => {
              const result = await httpClient.post(webhookUrl, payload, {
                signal: controller.signal,
              });
              return result;
            },
            RETRY_LIMITS.MAX_RETRIES,
            RETRY_LIMITS.INITIAL_RETRY_DELAY,
            req.log
          );

          clearTimeout(timeoutId);
          const batchDuration = Date.now() - batchStartTime;

          if (response.status >= 200 && response.status < 300) {
            req.log.debug(
              {
                webhookUrl,
                batchIndex: batchIndex + 1,
                batchSize: batch.length,
                status: response.status,
                duration: batchDuration,
              },
              'Webhook batch sent successfully'
            );

            return {
              success: true,
              batchIndex: batchIndex + 1,
              batchSize: batch.length,
              status: response.status,
            };
          }

          // Manejar errores HTTP
          let parsedError: { code?: number; message?: string; hint?: string } | null = null;
          try {
            parsedError = JSON.parse(response.body);
          } catch {
            // Si no es JSON, usar el texto tal cual
          }

          let errorMessage = `Error al enviar batch: ${response.status} ${response.statusText}`;

          if (response.status === 404) {
            if (parsedError?.message?.includes('not registered')) {
              errorMessage = `El webhook de N8N no está activo. ${parsedError.hint || 'Asegúrate de que el workflow esté activo y el webhook esté configurado correctamente.'}`;
            } else if (parsedError?.message?.includes('not registered for POST')) {
              errorMessage = `El webhook de N8N está configurado para GET, pero necesitas POST. Verifica la configuración del webhook en N8N.`;
            } else {
              errorMessage = `El webhook de N8N no fue encontrado (404). Verifica que la URL sea correcta y que el workflow esté activo.`;
            }
          } else if (parsedError?.message) {
            errorMessage = `${parsedError.message}${parsedError.hint ? ` ${parsedError.hint}` : ''}`;
          }

          throw new Error(errorMessage);
        } catch (error: unknown) {
          clearTimeout(timeoutId);
          const batchDuration = Date.now() - batchStartTime;
          const errorObj = error instanceof Error ? error : new Error(String(error));

          if (errorObj.message === 'Request aborted' || errorObj.name === 'AbortError') {
            req.log.error(
              {
                webhookUrl,
                batchIndex: batchIndex + 1,
                duration: batchDuration,
                timeout: env.N8N_WEBHOOK_TIMEOUT,
              },
              'Webhook batch timeout'
            );
            throw new Error(`Timeout: El webhook no respondió en ${env.N8N_WEBHOOK_TIMEOUT}ms`);
          }

          // Detectar errores de conexión
          const isConnectionError =
            errorObj.message?.includes('ECONNREFUSED') ||
            errorObj.message?.includes('ETIMEDOUT') ||
            errorObj.message?.includes('Request timeout') ||
            errorObj.message?.includes('connect');

          if (isConnectionError) {
            req.log.error(
              {
                webhookUrl,
                batchIndex: batchIndex + 1,
                error: errorObj.message,
                duration: batchDuration,
              },
              'Webhook batch connection error'
            );
            throw new Error(
              `Error de conexión: ${errorObj.message}. Verifica que el webhook esté corriendo y que la URL sea correcta.`
            );
          }

          req.log.error(
            {
              webhookUrl,
              batchIndex: batchIndex + 1,
              error: errorObj.message,
              duration: batchDuration,
            },
            'Webhook batch request error'
          );

          throw errorObj;
        }
      })
    );

    const duration = Date.now() - startTime;

    // Analizar resultados
    const successful = batchResults.filter((r) => r.status === 'fulfilled').length;
    const failed = batchResults.filter((r) => r.status === 'rejected').length;
    const errors = batchResults
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => r.reason?.message || 'Unknown error');

    if (failed > 0) {
      req.log.error(
        {
          webhookUrl,
          contactsCount: contacts.length,
          batchesCount: batches.length,
          successful,
          failed,
          errors,
          duration,
        },
        'Webhook export partially failed'
      );

      return res.status(207).json({
        success: false,
        error: `Se enviaron ${successful} de ${batches.length} batches exitosamente`,
        details: {
          successful,
          failed,
          total: batches.length,
          errors: errors.slice(0, ERROR_LIMITS.MAX_ERRORS_IN_RESPONSE),
        },
        requestId: req.requestId,
      });
    }

    req.log.info(
      {
        webhookUrl,
        contactsCount: contacts.length,
        batchesCount: batches.length,
        duration,
      },
      'Webhook export successful'
    );

    return res.json({
      success: true,
      data: {
        success: true,
        message: `Se enviaron ${contacts.length} contactos exitosamente al webhook${batches.length > 1 ? ` en ${batches.length} batches` : ''}`,
        batchesCount: batches.length,
        contactsCount: contacts.length,
      },
      requestId: req.requestId,
    });
  })
);

export default router;
