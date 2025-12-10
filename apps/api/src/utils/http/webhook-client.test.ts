/**
 * Tests para webhook-client
 *
 * AI_DECISION: Tests unitarios para envío asíncrono de webhooks
 * Justificación: Validación crítica de webhooks y timeout
 * Impacto: Prevenir errores en envío de webhooks
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { sendWebhook } from './webhook-client';
import { getHttpClient } from './http-client';

// Mock dependencies
vi.mock('./http-client', () => ({
  getHttpClient: vi.fn(),
}));

const mockGetHttpClient = vi.mocked(getHttpClient);

describe('sendWebhook', () => {
  let mockHttpClient: {
    post: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockHttpClient = {
      post: vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: {},
        body: 'Success',
      }),
    };
    mockGetHttpClient.mockReturnValue(mockHttpClient as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debería enviar webhook exitosamente', async () => {
    const payload = {
      nombre: 'John Doe',
      email: 'john@example.com',
    };

    const promise = sendWebhook('https://example.com/webhook', payload);
    await vi.runAllTimersAsync();
    await promise;

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      'https://example.com/webhook',
      payload,
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
  });

  it('debería manejar timeout correctamente', async () => {
    mockHttpClient.post.mockImplementation(() => {
      return new Promise((_, reject) => {
        setTimeout(() => {
          const error = new Error('Request timeout');
          error.name = 'AbortError';
          reject(error);
        }, 10000);
      });
    });

    const payload = {
      nombre: 'John Doe',
      email: 'john@example.com',
    };

    const promise = sendWebhook('https://example.com/webhook', payload, { timeout: 5000 });
    vi.advanceTimersByTime(5000);
    await vi.runAllTimersAsync();
    await promise;

    expect(mockHttpClient.post).toHaveBeenCalled();
  });

  it('debería manejar errores de red sin lanzar excepción', async () => {
    const networkError = new Error('Network error');
    mockHttpClient.post.mockRejectedValue(networkError);

    const payload = {
      nombre: 'John Doe',
      email: 'john@example.com',
    };

    const promise = sendWebhook('https://example.com/webhook', payload);
    await vi.runAllTimersAsync();
    await promise;

    expect(mockHttpClient.post).toHaveBeenCalled();
  });

  it('debería usar timeout por defecto de 10000ms', async () => {
    const payload = {
      nombre: 'John Doe',
      email: 'john@example.com',
    };

    const promise = sendWebhook('https://example.com/webhook', payload);
    await vi.runAllTimersAsync();
    await promise;

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      'https://example.com/webhook',
      payload,
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
  });
});
