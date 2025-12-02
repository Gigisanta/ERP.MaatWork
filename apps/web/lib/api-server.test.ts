/**
 * Tests para api-server (Server Components API)
 * 
 * AI_DECISION: Tests unitarios para funciones de Server Components
 * Justificación: Validación crítica de llamadas API en Server Components
 * Impacto: Prevenir errores en fetching de datos del servidor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiCall, getContactById } from './api-server';
import { config } from './config';

// Mock Next.js cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn()
}));

// Mock config
vi.mock('./config', () => ({
  config: {
    apiUrl: 'http://localhost:3001'
  }
}));

import { cookies } from 'next/headers';

// Mock global fetch
global.fetch = vi.fn() as typeof fetch;

describe('api-server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('apiCall', () => {
    it('debería hacer GET request con cookies', async () => {
      const mockCookieStore = {
        get: vi.fn().mockReturnValue({ value: 'test-token' })
      };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookieStore);

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true, data: { id: '1' } })
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse as Response);

      const result = await apiCall('/v1/test');

      expect(cookies).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/v1/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Cookie': 'token=test-token'
          }),
          cache: 'no-store'
        })
      );
      expect(result).toEqual({ success: true, data: { id: '1' } });
    });

    it('debería hacer POST request con body', async () => {
      const mockCookieStore = {
        get: vi.fn().mockReturnValue({ value: 'test-token' })
      };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookieStore);

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true })
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse as Response);

      await apiCall('/v1/test', {
        method: 'POST',
        body: { name: 'Test' }
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/v1/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Test' })
        })
      );
    });

    it('debería funcionar sin cookie si no está disponible', async () => {
      const mockCookieStore = {
        get: vi.fn().mockReturnValue(undefined)
      };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookieStore);

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true })
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse as Response);

      await apiCall('/v1/test');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/v1/test',
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Cookie: expect.anything()
          })
        })
      );
    });

    it('debería manejar timeout', async () => {
      const mockCookieStore = {
        get: vi.fn().mockReturnValue({ value: 'test-token' })
      };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookieStore);

      // Mock AbortController correctamente
      const mockAbort = vi.fn();
      const mockSignal = { aborted: false } as AbortSignal;
      
      const AbortControllerMock = class {
        abort = mockAbort;
        signal = mockSignal;
      };
      
      global.AbortController = AbortControllerMock as unknown as typeof AbortController;

      // Mock setTimeout para que ejecute inmediatamente
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn().mockImplementation((fn: () => void) => {
        fn();
        return 123 as unknown as NodeJS.Timeout;
      }) as typeof setTimeout;

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
        return Promise.reject(new Error('AbortError'));
      });

      await expect(apiCall('/v1/test', { timeoutMs: 1000 })).rejects.toThrow();
      
      global.setTimeout = originalSetTimeout;
    });

    it('debería lanzar error cuando response no es ok', async () => {
      const mockCookieStore = {
        get: vi.fn().mockReturnValue({ value: 'test-token' })
      };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookieStore);

      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: vi.fn().mockResolvedValue({ error: 'Not found' })
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse as Response);

      await expect(apiCall('/v1/test')).rejects.toThrow();
    });

    it('debería manejar error de JSON parsing', async () => {
      const mockCookieStore = {
        get: vi.fn().mockReturnValue({ value: 'test-token' })
      };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookieStore);

      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse as Response);

      await expect(apiCall('/v1/test')).rejects.toThrow();
    });

    it('debería usar timeout personalizado', async () => {
      const mockCookieStore = {
        get: vi.fn().mockReturnValue({ value: 'test-token' })
      };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookieStore);

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true })
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse as Response);

      // Mock AbortController
      const AbortControllerMock = class {
        abort = vi.fn();
        signal = { aborted: false } as AbortSignal;
      };
      global.AbortController = AbortControllerMock as unknown as typeof AbortController;

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      await apiCall('/v1/test', { timeoutMs: 5000 });

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
      
      setTimeoutSpy.mockRestore();
    });
  });

  describe('getContactById', () => {
    it('debería llamar apiCall con el endpoint correcto', async () => {
      const mockCookieStore = {
        get: vi.fn().mockReturnValue({ value: 'test-token' })
      };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookieStore);

      // Mock AbortController
      const AbortControllerMock = class {
        abort = vi.fn();
        signal = { aborted: false } as AbortSignal;
      };
      global.AbortController = AbortControllerMock as unknown as typeof AbortController;

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { id: 'contact-123', firstName: 'John' }
        })
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse as Response);

      const result = await getContactById('contact-123');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/v1/contacts/contact-123',
        expect.any(Object)
      );
      expect(result.data).toEqual({ id: 'contact-123', firstName: 'John' });
    });
  });

});

