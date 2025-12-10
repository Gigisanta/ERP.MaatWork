/**
 * Helper para enviar webhooks de forma asíncrona
 *
 * AI_DECISION: Fire-and-forget webhook sending
 * Justificación: Los webhooks no deben bloquear operaciones principales
 * Impacto: Mejor rendimiento, operaciones principales no se ven afectadas por fallos de webhook
 */

import { getHttpClient } from './http-client';
import type { Logger } from 'pino';

export interface WebhookPayload {
  nombre: string;
  email: string | null;
}

export interface WebhookOptions {
  timeout?: number;
  logger?: Logger;
}

/**
 * Envía un webhook de forma asíncrona (fire-and-forget)
 *
 * @param webhookUrl - URL del webhook
 * @param payload - Payload a enviar
 * @param options - Opciones de configuración
 */
export async function sendWebhook(
  webhookUrl: string,
  payload: WebhookPayload,
  options: WebhookOptions = {}
): Promise<void> {
  const { timeout = 10000, logger } = options;

  // Loggear inicio del proceso
  logger?.info(
    {
      webhookUrl,
      payload,
      timeout,
    },
    'Starting webhook send (async)'
  );

  // Ejecutar de forma asíncrona sin bloquear
  setImmediate(async () => {
    const startTime = Date.now();

    try {
      logger?.debug(
        {
          webhookUrl,
          payload,
        },
        'Preparing to send webhook request'
      );

      const httpClient = getHttpClient(logger);

      // Crear AbortController para timeout
      const controller = new AbortController();
      let timeoutTriggered = false;

      const timeoutId = setTimeout(() => {
        timeoutTriggered = true;
        logger?.warn(
          {
            webhookUrl,
            timeout,
            elapsed: Date.now() - startTime,
          },
          'Webhook timeout triggered, aborting request'
        );
        controller.abort();
      }, timeout);

      try {
        logger?.debug(
          {
            webhookUrl,
            payload,
          },
          'Sending webhook POST request'
        );

        const response = await httpClient.post(webhookUrl, payload, {
          signal: controller.signal as AbortSignal,
        });

        clearTimeout(timeoutId);
        const elapsed = Date.now() - startTime;

        logger?.info(
          {
            webhookUrl,
            payload,
            statusCode: response.status,
            statusText: response.statusText,
            responseBody: response.body,
            elapsed,
          },
          'Webhook sent successfully'
        );
      } catch (error) {
        clearTimeout(timeoutId);

        // Determinar tipo de error
        const errorType = timeoutTriggered
          ? 'timeout'
          : error instanceof Error && error.name === 'AbortError'
            ? 'aborted'
            : 'network_error';

        logger?.error(
          {
            webhookUrl,
            payload,
            errorType,
            error:
              error instanceof Error
                ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                  }
                : String(error),
            elapsed: Date.now() - startTime,
          },
          'Failed to send webhook request'
        );

        throw error;
      }
    } catch (error) {
      // Loggear error pero no lanzarlo (fire-and-forget)
      const elapsed = Date.now() - startTime;

      logger?.warn(
        {
          webhookUrl,
          payload,
          error:
            error instanceof Error
              ? {
                  name: error.name,
                  message: error.message,
                  stack: error.stack,
                }
              : String(error),
          elapsed,
        },
        'Webhook send failed (non-blocking, fire-and-forget)'
      );
    }
  });
}
