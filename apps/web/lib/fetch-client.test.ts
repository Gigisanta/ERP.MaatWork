/**
 * Tests para fetch-client
 * 
 * AI_DECISION: Tests unitarios para wrapper de fetch con logging
 * Justificación: Validación crítica de logging y correlación
 * Impacto: Prevenir errores en logging y correlación de requests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fetchWithLogging, fetchJson, postJson, putJson, deleteJson, getJson } from './fetch-client';
import { logger } from './logger';

// Mock dependencies
vi.mock('./logger', () => ({
  logger: {
    logRequest: vi.fn(),
    logResponse: vi.fn(),
    logNetworkError: vi.fn()
  }
}));

// Mock global fetch
global.fetch = vi.fn();

const mockFetch = vi.mocked(global.fetch);
const mockLogger = vi.mocked(logger);

describe('fetchWithLogging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debería agregar X-Request-ID header', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({})
    } as Response;

    mockFetch.mockResolvedValue(mockResponse);

    await fetchWithLogging('https://example.com/test');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/test',
      expect.objectContaining({
        headers: expect.any(Headers)
      })
    );
  });

  it('debería loguear request y response', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({})
    } as Response;

    mockFetch.mockResolvedValue(mockResponse);

    await fetchWithLogging('https://example.com/test');

    expect(mockLogger.logRequest).toHaveBeenCalled();
    expect(mockLogger.logResponse).toHaveBeenCalled();
  });

  it('debería manejar timeout correctamente', async () => {
    mockFetch.mockImplementation(() => {
      return new Promise((_, reject) => {
        setTimeout(() => {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          reject(error);
        }, 100);
      });
    });

    const promise = fetchWithLogging('https://example.com/test', { timeout: 50 });
    vi.advanceTimersByTime(50);
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow();
    expect(mockLogger.logNetworkError).toHaveBeenCalled();
  });

  it('debería usar requestId personalizado cuando se proporciona', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({})
    } as Response;

    mockFetch.mockResolvedValue(mockResponse);

    await fetchWithLogging('https://example.com/test', { requestId: 'custom-id' });

    expect(mockLogger.logRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'custom-id',
      expect.any(Object)
    );
  });

  it('debería omitir logging cuando skipLogging es true', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({})
    } as Response;

    mockFetch.mockResolvedValue(mockResponse);

    await fetchWithLogging('https://example.com/test', { skipLogging: true });

    expect(mockLogger.logRequest).not.toHaveBeenCalled();
    expect(mockLogger.logResponse).not.toHaveBeenCalled();
  });
});

describe('fetchJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería parsear JSON correctamente', async () => {
    const mockData = { id: '123', name: 'Test' };
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => mockData
    } as Response;

    mockFetch.mockResolvedValue(mockResponse);

    const result = await fetchJson<typeof mockData>('https://example.com/test');
    expect(result).toEqual(mockData);
  });

  it('debería lanzar error cuando response no es ok', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers(),
      text: async () => 'Not found'
    } as Response;

    mockFetch.mockResolvedValue(mockResponse);

    await expect(fetchJson('https://example.com/test')).rejects.toThrow();
  });
});

describe('postJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería enviar POST con body JSON', async () => {
    const mockResponse = {
      ok: true,
      status: 201,
      headers: new Headers(),
      json: async () => ({ id: '123' })
    } as Response;

    mockFetch.mockResolvedValue(mockResponse);

    await postJson('https://example.com/test', { name: 'Test' });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/test',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Test' })
      })
    );
  });
});

describe('putJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería enviar PUT con body JSON', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ id: '123' })
    } as Response;

    mockFetch.mockResolvedValue(mockResponse);

    await putJson('https://example.com/test', { name: 'Test' });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/test',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ name: 'Test' })
      })
    );
  });
});

describe('deleteJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería enviar DELETE request', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({})
    } as Response;

    mockFetch.mockResolvedValue(mockResponse);

    await deleteJson('https://example.com/test');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/test',
      expect.objectContaining({
        method: 'DELETE'
      })
    );
  });
});

describe('getJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería enviar GET request', async () => {
    const mockData = { id: '123' };
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => mockData
    } as Response;

    mockFetch.mockResolvedValue(mockResponse);

    const result = await getJson<typeof mockData>('https://example.com/test');
    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/test',
      expect.objectContaining({
        method: 'GET'
      })
    );
  });
});

