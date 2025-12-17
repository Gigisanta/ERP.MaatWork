/**
 * Tests para http-client
 *
 * AI_DECISION: Tests unitarios para cliente HTTP con keepalive
 * Justificación: Validación crítica de pooling y timeout
 * Impacto: Prevenir errores en conexiones HTTP
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// AI_DECISION: Use vi.hoisted to declare MockAgent before vi.mock hoisting
// Justificación: vi.mock se hoistea al inicio del archivo, pero las clases declaradas después no están disponibles
// Impacto: Soluciona "Cannot access 'MockAgent' before initialization"
const { MockAgent } = vi.hoisted(() => {
  class MockAgent {
    destroy = vi.fn();
    constructor(_options?: unknown) {
      // Constructor accepts options but doesn't need to do anything
    }
  }
  return { MockAgent };
});

// Mock node:http and node:https
vi.mock('node:http', () => ({
  default: {
    Agent: MockAgent,
    request: vi.fn(),
  },
}));

vi.mock('node:https', () => ({
  default: {
    Agent: MockAgent,
    request: vi.fn(),
  },
}));

import { HttpClient, getHttpClient } from './http-client';
import http from 'node:http';
import https from 'node:https';

describe('HttpClient', () => {
  let httpClient: HttpClient;

  beforeEach(() => {
    vi.clearAllMocks();
    httpClient = new HttpClient({
      timeout: 30000,
      keepAlive: true,
      maxSockets: 50,
    });
  });

  afterEach(() => {
    try {
      httpClient.destroy();
    } catch {
      // Ignore destroy errors in tests
    }
  });

  it('debería crear instancia con configuración por defecto', () => {
    const client = new HttpClient();
    expect(client).toBeInstanceOf(HttpClient);
    try {
      client.destroy();
    } catch {
      // Ignore destroy errors
    }
  });

  it('debería crear instancia con configuración personalizada', () => {
    const client = new HttpClient({
      timeout: 60000,
      keepAlive: false,
      maxSockets: 100,
    });
    expect(client).toBeInstanceOf(HttpClient);
    try {
      client.destroy();
    } catch {
      // Ignore destroy errors
    }
  });

  it('debería realizar request HTTP exitoso', async () => {
    const chunks: Buffer[] = [Buffer.from('{"test":"data"}')];
    const mockResponse = {
      statusCode: 200,
      statusMessage: 'OK',
      headers: { 'content-type': 'application/json' },
      on: vi.fn((event: string, callback: (data?: unknown) => void) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from('{"test":"data"}')), 10);
        }
        if (event === 'end') {
          setTimeout(() => callback(), 20);
        }
        return mockResponse;
      }),
    };

    const mockRequest = {
      on: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
      setTimeout: vi.fn(),
      destroy: vi.fn(),
    };

    (http.request as any).mockImplementation(
      (options: unknown, callback: (res: unknown) => void) => {
        setTimeout(() => callback(mockResponse), 10);
        return mockRequest;
      }
    );

    const result = await httpClient.request('http://example.com/test');

    expect(result.status).toBe(200);
    expect(result.statusText).toBe('OK');
  }, 10000);

  it('debería manejar timeout correctamente', async () => {
    const mockRequest = {
      on: vi.fn((event: string, callback: () => void) => {
        if (event === 'timeout') {
          setTimeout(() => callback(), 10);
        }
        return mockRequest;
      }),
      destroy: vi.fn(),
    };

    (http.request as any).mockReturnValue(mockRequest);

    await expect(httpClient.request('http://example.com/test', { timeout: 10 })).rejects.toThrow();
  });

  it('debería manejar AbortSignal', async () => {
    const controller = new AbortController();
    const mockRequest = {
      on: vi.fn(),
      destroy: vi.fn(),
    };

    (http.request as any).mockReturnValue(mockRequest);

    controller.abort();

    await expect(
      httpClient.request('http://example.com/test', { signal: controller.signal })
    ).rejects.toThrow();
  });

  it('debería realizar POST request con body', async () => {
    const mockResponse = {
      statusCode: 201,
      statusMessage: 'Created',
      headers: {},
      on: vi.fn((event: string, callback: (data?: unknown) => void) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from('{"id":"123"}')), 10);
        }
        if (event === 'end') {
          setTimeout(() => callback(), 20);
        }
        return mockResponse;
      }),
    };

    const mockRequest = {
      on: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    };

    (http.request as any).mockImplementation(
      (options: unknown, callback: (res: unknown) => void) => {
        setTimeout(() => callback(mockResponse), 10);
        return mockRequest;
      }
    );

    const result = await httpClient.post('http://example.com/test', { name: 'test' });

    expect(result.status).toBe(201);
    expect(mockRequest.write).toHaveBeenCalled();
  });

  it('debería destruir agents correctamente', () => {
    const client = new HttpClient();
    // Get the agent instances from the client
    const httpAgent = (client as any).httpAgent as MockAgent;
    const httpsAgent = (client as any).httpsAgent as MockAgent;

    client.destroy();

    expect(httpAgent.destroy).toHaveBeenCalled();
    expect(httpsAgent.destroy).toHaveBeenCalled();
  });
});

describe('getHttpClient', () => {
  it('debería retornar singleton instance', () => {
    const client1 = getHttpClient();
    const client2 = getHttpClient();
    expect(client1).toBe(client2);
  });
});
