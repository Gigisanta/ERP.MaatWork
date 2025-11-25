/**
 * Utilidades para enviar contactos a webhook de N8N
 * 
 * AI_DECISION: Proxy a través del backend para evitar problemas de CORS
 * Justificación: El backend hace la petición server-to-server, eliminando restricciones CORS
 * Impacto: Eliminación de errores CORS, mejor seguridad, manejo centralizado de errores
 */

import type { Contact } from '@/types/contact';
import { sendContactsToWebhook as sendContactsToWebhookApi, type WebhookMetadata as ApiWebhookMetadata, type WebhookResult as ApiWebhookResult } from '@/lib/api/contacts';
import { ApiError } from '@/lib/api-client';

// Re-export types from API client for backward compatibility
export type WebhookMetadata = ApiWebhookMetadata;
export type WebhookResult = ApiWebhookResult;

export interface WebhookPayload {
  contacts: Contact[];
  metadata: WebhookMetadata;
}

/**
 * Envía contactos a un webhook de N8N (proxy a través del backend)
 * 
 * @param contacts - Array de contactos a enviar
 * @param webhookUrl - URL del webhook de N8N
 * @param metadata - Metadata opcional sobre los filtros aplicados
 * @returns Resultado de la operación
 */
export async function sendContactsToWebhook(
  contacts: Contact[],
  webhookUrl: string,
  metadata?: Partial<WebhookMetadata>
): Promise<WebhookResult> {
  // Validar que haya contactos
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return {
      success: false,
      message: 'No hay contactos para enviar'
    };
  }

  // Validar tamaño de payload antes de enviar (estimación ~2KB por contacto)
  const estimatedSize = contacts.length * 2048; // ~2KB por contacto
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (estimatedSize > maxSize) {
    return {
      success: false,
      message: `El payload es demasiado grande (${Math.round(estimatedSize / 1024)}KB). El backend dividirá automáticamente en batches.`
    };
  }

  // Validar formato de URL
  try {
    new URL(webhookUrl);
  } catch {
    return {
      success: false,
      message: 'URL del webhook inválida'
    };
  }

  try {
    const response = await sendContactsToWebhookApi(contacts, webhookUrl, metadata);

    if (!response.success || !response.data) {
      return {
        success: false,
        message: response.error || 'Error desconocido al enviar webhook'
      };
    }

    return response.data;
  } catch (error) {
    if (error instanceof ApiError) {
      // Manejar errores específicos de la API
      if (error.status === 504) {
        return {
          success: false,
          message: 'Timeout: El webhook no respondió en el tiempo esperado'
        };
      }
      if (error.status === 502) {
        return {
          success: false,
          message: `Error de conexión: ${error.message}. Verifica que el webhook esté corriendo y que la URL sea correcta.`
        };
      }
      if (error.status === 429) {
        return {
          success: false,
          message: 'Demasiadas solicitudes. Por favor espera un momento antes de intentar nuevamente.'
        };
      }
      return {
        success: false,
        message: error.message || 'Error al enviar webhook'
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        message: `Error de red: ${error.message}`
      };
    }

    return {
      success: false,
      message: 'Error desconocido al enviar webhook'
    };
  }
}

