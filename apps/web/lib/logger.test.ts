/**
 * Tests para logger estructurado
 *
 * AI_DECISION: Tests unitarios para ClientLogger
 * Justificación: Validación crítica de logging estructurado
 * Impacto: Prevenir errores en logging y debugging
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger, ClientLogger, toLogContextValue, toLogContext, type LogLevel } from './logger';

// Mock apiClient
vi.mock('./api-client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe('toLogContextValue', () => {
  it('debería retornar null para null', () => {
    expect(toLogContextValue(null)).toBeNull();
  });

  it('debería retornar undefined para undefined', () => {
    expect(toLogContextValue(undefined)).toBeUndefined();
  });

  it('debería retornar valores primitivos sin cambios', () => {
    expect(toLogContextValue('string')).toBe('string');
    expect(toLogContextValue(123)).toBe(123);
    expect(toLogContextValue(true)).toBe(true);
  });

  it('debería convertir Error a objeto', () => {
    const error = new Error('Test error');
    error.stack = 'Error: Test error\n    at test.js:1:1';

    const result = toLogContextValue(error);

    expect(result).toEqual({
      message: 'Test error',
      name: 'Error',
      stack: 'Error: Test error\n    at test.js:1:1',
    });
  });

  it('debería convertir arrays recursivamente', () => {
    const arr = ['string', 123, true, null];
    const result = toLogContextValue(arr);

    expect(result).toEqual(['string', 123, true, null]);
  });

  it('debería convertir objetos recursivamente', () => {
    const obj = {
      string: 'value',
      number: 123,
      nested: {
        bool: true,
      },
    };
    const result = toLogContextValue(obj);

    expect(result).toEqual({
      string: 'value',
      number: 123,
      nested: {
        bool: true,
      },
    });
  });

  it('debería convertir valores desconocidos a string', () => {
    const symbol = Symbol('test');
    const result = toLogContextValue(symbol);

    expect(typeof result).toBe('string');
  });
});

describe('toLogContext', () => {
  it('debería convertir Record con valores unknown', () => {
    const record = {
      string: 'value',
      number: 123,
      error: new Error('Test'),
    };

    const result = toLogContext(record);

    expect(result.string).toBe('value');
    expect(result.number).toBe(123);
    expect(result.error).toMatchObject({
      message: 'Test',
      name: 'Error',
    });
    // stack puede estar presente o no dependiendo del entorno
    if ('stack' in (result.error as object)) {
      expect(typeof (result.error as { stack?: string }).stack).toBe('string');
    }
  });
});

describe('ClientLogger', () => {
  let mockConsole: {
    log: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsole = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    };

    // Mock window
    global.window = {
      ...global.window,
      location: { href: 'http://localhost:3000' },
      navigator: { userAgent: 'test-agent' },
    } as any;

    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('debería generar sessionId único', () => {
      const logger1 = new ClientLogger();
      const logger2 = new ClientLogger();

      expect(logger1['sessionId']).toBeDefined();
      expect(logger2['sessionId']).toBeDefined();
      expect(logger1['sessionId']).not.toBe(logger2['sessionId']);
    });

    it('debería extraer userId y role de token en localStorage', () => {
      const mockToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXItMTIzIiwicm9sZSI6ImFkbWluIn0.test';
      global.localStorage.getItem = vi.fn().mockReturnValue(mockToken);

      const testLogger = new ClientLogger();

      expect(testLogger['userId']).toBe('user-123');
      expect(testLogger['userRole']).toBe('admin');
    });

    it('debería manejar token inválido correctamente', () => {
      global.localStorage.getItem = vi.fn().mockReturnValue('invalid-token');

      const testLogger = new ClientLogger();

      expect(testLogger['userId']).toBeNull();
      expect(testLogger['userRole']).toBeNull();
    });
  });

  describe('Logging methods', () => {
    let testLogger: ClientLogger;

    beforeEach(() => {
      testLogger = new ClientLogger();
      process.env.NODE_ENV = 'development';
      process.env.NEXT_PUBLIC_VERBOSE_LOGS = 'true';
    });

    it('debería loguear debug correctamente', () => {
      testLogger.debug('Debug message', { key: 'value' });

      expect(mockConsole.debug).toHaveBeenCalled();
    });

    it('debería loguear info correctamente', () => {
      testLogger.info('Info message', { key: 'value' });

      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('debería loguear warn correctamente', () => {
      testLogger.warn('Warning message', { key: 'value' });

      expect(mockConsole.warn).toHaveBeenCalled();
    });

    it('debería loguear error correctamente', () => {
      testLogger.error('Error message', { key: 'value' });

      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('debería incluir contexto en logs', () => {
      process.env.NEXT_PUBLIC_VERBOSE_LOGS = 'true';
      testLogger.info('Test', { userId: '123', action: 'test' });

      const call = mockConsole.log.mock.calls[0];
      expect(call[0]).toContain('Test');
      expect(call[1]).toEqual({ userId: '123', action: 'test' });
    });
  });

  describe('updateUser', () => {
    it('debería actualizar userId y userRole', () => {
      const testLogger = new ClientLogger();

      testLogger.updateUser('new-user-123', 'manager');

      expect(testLogger['userId']).toBe('new-user-123');
      expect(testLogger['userRole']).toBe('manager');
    });

    it('debería permitir null para logout', () => {
      const testLogger = new ClientLogger();
      testLogger.updateUser('user-123', 'admin');

      testLogger.updateUser(null, null);

      expect(testLogger['userId']).toBeNull();
      expect(testLogger['userRole']).toBeNull();
    });
  });

  describe('logRequest', () => {
    it('debería loguear request con requestId', () => {
      const testLogger = new ClientLogger();
      process.env.NODE_ENV = 'development';
      process.env.NEXT_PUBLIC_VERBOSE_LOGS = 'true';

      testLogger.logRequest('GET', '/api/users', 'req-123', { userId: 'user-1' });

      expect(mockConsole.log).toHaveBeenCalled();
      const call = mockConsole.log.mock.calls[0];
      expect(call[0]).toContain('GET');
      expect(call[0]).toContain('/api/users');
    });
  });

  describe('logResponse', () => {
    it('debería loguear response exitosa como info', () => {
      const testLogger = new ClientLogger();
      process.env.NODE_ENV = 'development';
      process.env.NEXT_PUBLIC_VERBOSE_LOGS = 'true';

      testLogger.logResponse('GET', '/api/users', 200, 150, 'req-123');

      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('debería loguear response 4xx como error', () => {
      const testLogger = new ClientLogger();
      process.env.NODE_ENV = 'development';

      testLogger.logResponse('GET', '/api/users', 404, 50, 'req-123');

      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('debería loguear response 3xx como warn', () => {
      const testLogger = new ClientLogger();
      process.env.NODE_ENV = 'development';

      testLogger.logResponse('GET', '/api/users', 301, 30, 'req-123');

      expect(mockConsole.warn).toHaveBeenCalled();
    });
  });

  describe('logNetworkError', () => {
    it('debería loguear error de red', () => {
      const testLogger = new ClientLogger();
      process.env.NODE_ENV = 'development';

      const error = new Error('Network error');
      testLogger.logNetworkError('GET', '/api/users', error, 'req-123');

      expect(mockConsole.error).toHaveBeenCalled();
      const call = mockConsole.error.mock.calls[0];
      expect(call[0]).toContain('Network error');
    });
  });

  describe('Production mode', () => {
    it('debería solo loguear errores y warnings en producción', () => {
      const testLogger = new ClientLogger();
      process.env.NODE_ENV = 'production';

      testLogger.debug('Debug message');
      testLogger.info('Info message');
      testLogger.warn('Warning message');
      testLogger.error('Error message');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.log).not.toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
    });
  });

  describe('sendToBackend', () => {
    it('debería prevenir recursión infinita', async () => {
      const testLogger = new ClientLogger();
      process.env.NODE_ENV = 'production';

      // Simular que ya estamos enviando un log
      testLogger['isSendingLog'] = true;

      testLogger.error('Test error');

      // No debería intentar enviar al backend
      // Verificamos que no hay llamadas a apiClient
      const { apiClient } = await import('./api-client');
      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('debería desactivar envío después de MAX_BACKEND_ERRORS', async () => {
      const testLogger = new ClientLogger();
      process.env.NODE_ENV = 'production';

      const { apiClient } = await import('./api-client');
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Backend error'));

      // Enviar múltiples errores
      for (let i = 0; i < 5; i++) {
        testLogger.error(`Error ${i}`);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Después de 3 errores, debería dejar de intentar
      expect(apiClient.post).toHaveBeenCalledTimes(3);
    });
  });
});

describe('logger singleton', () => {
  it('debería exportar instancia de logger', () => {
    expect(logger).toBeInstanceOf(ClientLogger);
  });

  it('debería tener métodos de logging', () => {
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });
});
