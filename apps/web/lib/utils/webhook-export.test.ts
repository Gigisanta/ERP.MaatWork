/**
 * Tests para webhook-export utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendContactsToWebhook } from './webhook-export';
import type { Contact } from '@maatwork/types';
import { ApiError } from '../api-client';
import * as contactsApi from '../api/contacts';

vi.mock('../api/contacts', () => ({
  sendContactsToWebhook: vi.fn(),
}));

describe('webhook-export', () => {
  const mockContact: Contact = {
    id: 'contact-1',
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    email: 'john@example.com',
    phone: '123456789',
    createdAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendContactsToWebhook', () => {
    it('debería retornar error si no hay contactos', async () => {
      const result = await sendContactsToWebhook([], 'https://webhook.example.com');

      expect(result.success).toBe(false);
      expect(result.message).toContain('No hay contactos');
    });

    it('debería retornar error si el array está vacío', async () => {
      const result = await sendContactsToWebhook([], 'https://webhook.example.com');

      expect(result.success).toBe(false);
    });

    it('debería validar formato de URL', async () => {
      const result = await sendContactsToWebhook([mockContact], 'invalid-url');

      expect(result.success).toBe(false);
      expect(result.message).toContain('URL del webhook inválida');
    });

    it('debería validar tamaño de payload', async () => {
      // Crear muchos contactos para exceder el límite
      const manyContacts = Array(3000).fill(mockContact);

      const result = await sendContactsToWebhook(manyContacts, 'https://webhook.example.com');

      expect(result.success).toBe(false);
      expect(result.message).toContain('demasiado grande');
    });

    it('debería enviar contactos exitosamente', async () => {
      const mockResponse = {
        success: true,
        data: {
          success: true,
          message: 'Webhook enviado correctamente',
        },
      };

      vi.mocked(contactsApi.sendContactsToWebhook).mockResolvedValue(mockResponse);

      const result = await sendContactsToWebhook([mockContact], 'https://webhook.example.com');

      expect(result.success).toBe(true);
      expect(contactsApi.sendContactsToWebhook).toHaveBeenCalledWith(
        [mockContact],
        'https://webhook.example.com',
        undefined
      );
    });

    it('debería enviar metadata si se proporciona', async () => {
      const mockResponse = {
        success: true,
        data: {
          success: true,
          message: 'Webhook enviado correctamente',
        },
      };

      vi.mocked(contactsApi.sendContactsToWebhook).mockResolvedValue(mockResponse);

      const metadata = { filterApplied: 'test' };
      await sendContactsToWebhook([mockContact], 'https://webhook.example.com', metadata);

      expect(contactsApi.sendContactsToWebhook).toHaveBeenCalledWith(
        [mockContact],
        'https://webhook.example.com',
        metadata
      );
    });

    it('debería manejar error 504 (timeout)', async () => {
      const timeoutError = new ApiError('Gateway Timeout', 504);
      vi.mocked(contactsApi.sendContactsToWebhook).mockRejectedValue(timeoutError);

      const result = await sendContactsToWebhook([mockContact], 'https://webhook.example.com');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Timeout');
    });

    it('debería manejar error 502 (bad gateway)', async () => {
      const badGatewayError = new ApiError('Bad Gateway', 502);
      vi.mocked(contactsApi.sendContactsToWebhook).mockRejectedValue(badGatewayError);

      const result = await sendContactsToWebhook([mockContact], 'https://webhook.example.com');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error de conexión');
    });

    it('debería manejar error 429 (rate limit)', async () => {
      const rateLimitError = new ApiError('Too Many Requests', 429);
      vi.mocked(contactsApi.sendContactsToWebhook).mockRejectedValue(rateLimitError);

      const result = await sendContactsToWebhook([mockContact], 'https://webhook.example.com');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Demasiadas solicitudes');
    });

    it('debería manejar otros errores de ApiError', async () => {
      const apiError = new ApiError('Internal Server Error', 500);
      vi.mocked(contactsApi.sendContactsToWebhook).mockRejectedValue(apiError);

      const result = await sendContactsToWebhook([mockContact], 'https://webhook.example.com');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Internal Server Error');
    });

    it('debería manejar errores de red', async () => {
      const networkError = new Error('Network error');
      vi.mocked(contactsApi.sendContactsToWebhook).mockRejectedValue(networkError);

      const result = await sendContactsToWebhook([mockContact], 'https://webhook.example.com');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error de red');
    });

    it('debería manejar errores desconocidos', async () => {
      vi.mocked(contactsApi.sendContactsToWebhook).mockRejectedValue('Unknown error');

      const result = await sendContactsToWebhook([mockContact], 'https://webhook.example.com');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error desconocido');
    });

    it('debería manejar respuesta sin success', async () => {
      const mockResponse = {
        success: false,
        error: 'Error message',
      };

      vi.mocked(contactsApi.sendContactsToWebhook).mockResolvedValue(mockResponse);

      const result = await sendContactsToWebhook([mockContact], 'https://webhook.example.com');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Error message');
    });
  });
});
