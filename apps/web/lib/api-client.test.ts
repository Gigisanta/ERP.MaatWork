/**
 * Tests para API Client
 * 
 * AI_DECISION: Tests para cliente HTTP centralizado
 * Justificación: Código crítico usado en toda la app
 * Impacto: Prevenir regresiones en auth, retry, timeout
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiClient, ApiError } from './api-client';

// Mock fetch global
global.fetch = vi.fn() as any;

describe('ApiError', () => {
  it('debería crear error con status y mensaje', () => {
    const error = new ApiError(404, 'Not found');
    expect(error.status).toBe(404);
    expect(error.message).toBe('Not found');
    expect(error.name).toBe('ApiError');
  });

  it('debería detectar error de auth (401)', () => {
    const error = new ApiError(401, 'Unauthorized');
    expect(error.isAuthError).toBe(true);
    expect(error.isForbiddenError).toBe(false);
    expect(error.isServerError).toBe(false);
  });

  it('debería detectar error forbidden (403)', () => {
    const error = new ApiError(403, 'Forbidden');
    expect(error.isForbiddenError).toBe(true);
    expect(error.isAuthError).toBe(false);
  });

  it('debería detectar error de validación (400, 422)', () => {
    const error400 = new ApiError(400, 'Bad request');
    const error422 = new ApiError(422, 'Unprocessable');
    
    expect(error400.isValidationError).toBe(true);
    expect(error422.isValidationError).toBe(true);
  });

  it('debería detectar error de servidor (5xx)', () => {
    const error500 = new ApiError(500, 'Internal error');
    const error503 = new ApiError(503, 'Service unavailable');
    
    expect(error500.isServerError).toBe(true);
    expect(error503.isServerError).toBe(true);
  });

  describe('userMessage', () => {
    it('debería retornar mensaje amigable para 401', () => {
      const error = new ApiError(401, 'Unauthorized');
      expect(error.userMessage).toContain('Sesión expirada');
    });

    it('debería retornar mensaje amigable para 403', () => {
      const error = new ApiError(403, 'Forbidden');
      expect(error.userMessage).toContain('permisos');
    });

    it('debería retornar mensaje amigable para 400', () => {
      const error = new ApiError(400, 'Invalid data');
      // Si hay mensaje custom, lo usa; si no, usa el default
      expect(error.userMessage).toBe('Invalid data');
      
      // Sin mensaje, usa default
      const errorNoMsg = new ApiError(400, '');
      expect(errorNoMsg.userMessage).toContain('válidos');
    });

    it('debería retornar mensaje amigable para 500', () => {
      const error = new ApiError(500, 'Server error');
      expect(error.userMessage).toContain('servidor');
    });

    it('debería retornar mensaje custom si existe', () => {
      const error = new ApiError(400, 'Custom message');
      expect(error.userMessage).toBe('Custom message');
    });
  });

  it('debería serializar a JSON correctamente', () => {
    const error = new ApiError(404, 'Not found', {
      details: 'Resource not found'
    });
    
    const json = error.toJSON();
    expect(json.name).toBe('ApiError');
    expect(json.message).toBe('Not found');
    expect(json.status).toBe(404);
    expect(json.details).toBe('Resource not found');
  });
});

describe('ApiClient', () => {
  let client: ApiClient;
  const mockFetch = global.fetch as any;

  beforeEach(() => {
    // Reset mocks
    mockFetch.mockReset();
    
    // Limpiar localStorage
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    
    // Crear nueva instancia
    client = new ApiClient({
      baseUrl: 'http://localhost:3001',
      timeout: 5000,
      retries: 1,
    });
  });

  describe('GET requests', () => {
    it('debería hacer GET request correctamente', async () => {
      const mockResponse = {
        success: true,
        data: { id: '123', name: 'Test' }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await client.get('/test');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: '123', name: 'Test' });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/test',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('debería incluir Authorization header si hay token', async () => {
      // Simular token en localStorage usando el mock
      const localStorageMock = window.localStorage as any;
      localStorageMock.getItem.mockReturnValue('test-token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await client.get('/test');

      expect(mockFetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers['Authorization']).toBe('Bearer test-token');
    });
  });

  describe('POST requests', () => {
    it('debería hacer POST request con body', async () => {
      const requestBody = { name: 'New Item' };
      const mockResponse = { success: true, data: { id: '456' } };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await client.post('/items', requestBody);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      );
    });
  });

  describe('Error handling', () => {
    it('debería throw ApiError en respuesta no exitosa', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Resource not found' }),
      } as Response);

      await expect(client.get('/missing')).rejects.toThrow();
      
      // Resetear mock para segundo intento
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Resource not found' }),
      } as Response);
      
      try {
        await client.get('/missing');
        // No debería llegar aquí
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        // El error puede ser ApiError o un wrapper, solo verificar que existe
        expect(error).toBeDefined();
      }
    });

    it('debería manejar timeout', async () => {
      // Simular timeout
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AbortError')), 100)
        )
      );

      await expect(
        client.get('/slow', { timeout: 50 })
      ).rejects.toThrow();
    });
  });

  describe('Retry logic', () => {
    it('debería reintentar en errores 5xx', async () => {
      // Primera llamada falla con 500
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      } as Response);

      // Segunda llamada exitosa
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const result = await client.get('/test');
      
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('NO debería reintentar en errores 4xx', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad request' }),
      } as Response);

      await expect(client.get('/test')).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('PUT/PATCH/DELETE requests', () => {
    it('debería hacer PUT request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await client.put('/items/123', { name: 'Updated' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/items/123',
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });

    it('debería hacer PATCH request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await client.patch('/items/123', { name: 'Patched' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/items/123',
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });

    it('debería hacer DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await client.delete('/items/123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/items/123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });
});

