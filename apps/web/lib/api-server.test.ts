/**
 * Tests para api-server (Server Components API)
 *
 * AI_DECISION: Tests unitarios para funciones de Server Components
 * Justificación: Validación crítica de llamadas API en Server Components
 * Impacto: Prevenir errores en fetching de datos del servidor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiCall, getContactById } from './api-server';

// Mock Next.js cookies y headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}));

// Mock config
vi.mock('./config', () => ({
  config: {
    apiUrl: 'http://localhost:3001',
  },
}));

import { cookies, headers } from 'next/headers';

// Mock global fetch
global.fetch = vi.fn() as typeof fetch;

describe('api-server', () => {
  const mockCookieStore = {
    get: vi.fn().mockReturnValue({ value: 'test-token' }),
    getAll: vi.fn().mockReturnValue([{ name: 'token', value: 'test-token' }]),
  };
  const mockHeaderStore = {
    get: vi.fn().mockReturnValue('test-request-id'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (cookies as any).mockResolvedValue(mockCookieStore);
    (headers as any).mockResolvedValue(mockHeaderStore);
  });

  describe('apiCall', () => {
    it('debería hacer GET request con cookies', async () => {
      const mockResponse = {
        ok: true,
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ success: true, data: { id: '1' } }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await apiCall('/v1/test');

      expect(cookies).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/v1/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Cookie: 'token=test-token',
          }),
          cache: 'no-store',
        })
      );
      expect(result).toEqual({ success: true, data: { id: '1' } });
    });

    it('debería hacer POST request con body', async () => {
      const mockResponse = {
        ok: true,
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await apiCall('/v1/test', {
        method: 'POST',
        body: { name: 'Test' },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/v1/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Test' }),
        })
      );
    });

    it('debería funcionar sin cookie si no está disponible', async () => {
      const emptyCookieStore = {
        get: vi.fn().mockReturnValue(undefined),
        getAll: vi.fn().mockReturnValue([]),
      };
      (cookies as any).mockResolvedValue(emptyCookieStore);

      const mockResponse = {
        ok: true,
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await apiCall('/v1/test');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/v1/test',
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Cookie: expect.anything(),
          }),
        })
      );
    });

    it('debería manejar timeout', async () => {
      // Mock AbortController correctamente
      const mockAbort = vi.fn();
      const mockSignal = { aborted: false } as AbortSignal;

      const AbortControllerMock = class {
        abort = mockAbort;
        signal = mockSignal;
      };

      global.AbortController = AbortControllerMock as any;

      // Mock setTimeout para que ejecute inmediatamente
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn().mockImplementation((fn: () => void) => {
        fn();
        return 123 as any;
      }) as any;

      (global.fetch as any).mockImplementation(() => {
        return Promise.reject(new Error('AbortError'));
      });

      await expect(apiCall('/v1/test', { timeoutMs: 1000 })).rejects.toThrow();

      global.setTimeout = originalSetTimeout;
    });

    it('debería lanzar error cuando response no es ok', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ message: 'Not found' }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(apiCall('/v1/test')).rejects.toThrow('Not found');
    });

    it('debería manejar error de JSON parsing', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers(),
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        text: vi.fn().mockResolvedValue('Bad Request'),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(apiCall('/v1/test')).rejects.toThrow('API Error: 400 Bad Request');
    });

    it('debería usar timeout personalizado', async () => {
      const mockResponse = {
        ok: true,
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      // Mock AbortController
      const AbortControllerMock = class {
        abort = vi.fn();
        signal = { aborted: false } as AbortSignal;
      };
      global.AbortController = AbortControllerMock as any;

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      await apiCall('/v1/test', { timeoutMs: 5000 });

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);

      setTimeoutSpy.mockRestore();
    });
  });

  describe('getContactById', () => {
    it('debería llamar apiCall con el endpoint correcto', async () => {
      // Mock AbortController
      const AbortControllerMock = class {
        abort = vi.fn();
        signal = { aborted: false } as AbortSignal;
      };
      global.AbortController = AbortControllerMock as any;

      const mockResponse = {
        ok: true,
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({
          id: 'contact-123',
          firstName: 'John',
        }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await getContactById('contact-123');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/v1/contacts/contact-123',
        expect.any(Object)
      );
      expect(result).toEqual({ id: 'contact-123', firstName: 'John' });
    });
  });
});
