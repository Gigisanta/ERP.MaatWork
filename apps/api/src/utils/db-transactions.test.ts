/**
 * Tests para db-transactions utility
 * 
 * AI_DECISION: Tests unitarios para transacciones con retry y timeout
 * Justificación: Validación crítica de lógica de retry, manejo de errores transitorios y timeouts
 * Impacto: Prevenir errores en operaciones críticas de base de datos
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Logger } from 'pino';
import { transactionWithLogging, type TransactionOptions } from './db-transactions';

// Mock de db-logger
vi.mock('./db-logger', () => ({
  loggedTransaction: vi.fn()
}));

// Mock de @cactus/db
vi.mock('@cactus/db', () => ({
  db: vi.fn(() => ({
    transaction: vi.fn()
  }))
}));

import { loggedTransaction } from './db-logger';
import { db } from '@cactus/db';

describe('transactionWithLogging', () => {
  let mockLogger: Logger;
  let mockTransactionFn: ReturnType<typeof db>['transaction'];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as unknown as Logger;

    mockTransactionFn = vi.fn();
    (db as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      transaction: mockTransactionFn
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('transacción exitosa', () => {
    it('debería ejecutar transacción exitosamente sin retry', async () => {
      const expectedResult = { success: true, id: '123' };
      const transactionFn = vi.fn().mockResolvedValue(expectedResult);

      mockTransactionFn.mockResolvedValue(expectedResult);
      (loggedTransaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (_logger, _operation, fn) => await fn()
      );

      const result = await transactionWithLogging(
        mockLogger,
        'test-operation',
        transactionFn
      );

      expect(result).toEqual(expectedResult);
      expect(mockTransactionFn).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('debería usar opciones por defecto correctamente', async () => {
      const expectedResult = { success: true };
      const transactionFn = vi.fn().mockResolvedValue(expectedResult);

      mockTransactionFn.mockResolvedValue(expectedResult);
      (loggedTransaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (_logger, _operation, fn) => await fn()
      );

      await transactionWithLogging(mockLogger, 'test', transactionFn);

      expect(mockTransactionFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry con errores transitorios', () => {
    it('debería reintentar en deadlock (40P01) y tener éxito', async () => {
      const expectedResult = { success: true };
      const transactionFn = vi.fn().mockResolvedValue(expectedResult);

      const deadlockError = { code: '40P01', message: 'deadlock detected' };

      mockTransactionFn
        .mockRejectedValueOnce(deadlockError)
        .mockResolvedValueOnce(expectedResult);

      (loggedTransaction as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(deadlockError)
        .mockImplementationOnce(async (_logger, _operation, fn) => {
          await vi.advanceTimersByTimeAsync(100);
          return await fn();
        });

      const promise = transactionWithLogging(
        mockLogger,
        'test-operation',
        transactionFn,
        { maxRetries: 3, retryDelay: 100 }
      );

      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result).toEqual(expectedResult);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'test-operation',
          attempt: 0,
          errorCode: '40P01'
        }),
        'Retrying transaction after transient error'
      );
    });

    it('debería reintentar en serialization_failure (40001)', async () => {
      const expectedResult = { success: true };
      const transactionFn = vi.fn().mockResolvedValue(expectedResult);

      const serializationError = { code: '40001', message: 'serialization failure' };

      mockTransactionFn
        .mockRejectedValueOnce(serializationError)
        .mockResolvedValueOnce(expectedResult);

      (loggedTransaction as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(serializationError)
        .mockImplementationOnce(async (_logger, _operation, fn) => {
          await vi.advanceTimersByTimeAsync(100);
          return await fn();
        });

      const promise = transactionWithLogging(
        mockLogger,
        'test-operation',
        transactionFn,
        { maxRetries: 3, retryDelay: 100 }
      );

      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result).toEqual(expectedResult);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('debería reintentar en lock_not_available (55P03)', async () => {
      const expectedResult = { success: true };
      const transactionFn = vi.fn().mockResolvedValue(expectedResult);

      const lockError = { code: '55P03', message: 'lock not available' };

      mockTransactionFn
        .mockRejectedValueOnce(lockError)
        .mockResolvedValueOnce(expectedResult);

      (loggedTransaction as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(lockError)
        .mockImplementationOnce(async (_logger, _operation, fn) => {
          await vi.advanceTimersByTimeAsync(100);
          return await fn();
        });

      const promise = transactionWithLogging(
        mockLogger,
        'test-operation',
        transactionFn,
        { maxRetries: 3, retryDelay: 100 }
      );

      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result).toEqual(expectedResult);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('debería usar exponential backoff en retries', async () => {
      const expectedResult = { success: true };
      const transactionFn = vi.fn().mockResolvedValue(expectedResult);
      const deadlockError = { code: '40P01', message: 'deadlock' };

      mockTransactionFn
        .mockRejectedValueOnce(deadlockError)
        .mockRejectedValueOnce(deadlockError)
        .mockResolvedValueOnce(expectedResult);

      (loggedTransaction as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(deadlockError)
        .mockRejectedValueOnce(deadlockError)
        .mockImplementationOnce(async (_logger, _operation, fn) => {
          await vi.advanceTimersByTimeAsync(200);
          return await fn();
        });

      const retryDelay = 100;
      const promise = transactionWithLogging(
        mockLogger,
        'test-operation',
        transactionFn,
        { maxRetries: 3, retryDelay }
      );

      // Avanzar timers para simular delays
      await vi.advanceTimersByTimeAsync(retryDelay * Math.pow(2, 0)); // Primer retry: 100ms
      await vi.advanceTimersByTimeAsync(retryDelay * Math.pow(2, 1)); // Segundo retry: 200ms

      const result = await promise;

      expect(result).toEqual(expectedResult);
      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
      
      // Verificar que los delays fueron los correctos
      const warnCalls = (mockLogger.warn as ReturnType<typeof vi.fn>).mock.calls;
      expect(warnCalls[0][0].delay).toBe(100); // 100 * 2^0
      expect(warnCalls[1][0].delay).toBe(200); // 100 * 2^1
    });

    it('debería fallar después de max retries', async () => {
      const deadlockError = { code: '40P01', message: 'deadlock detected' };
      const transactionFn = vi.fn();

      mockTransactionFn.mockRejectedValue(deadlockError);
      (loggedTransaction as ReturnType<typeof vi.fn>).mockRejectedValue(deadlockError);

      const promise = expect(
        transactionWithLogging(
          mockLogger,
          'test-operation',
          transactionFn,
          { maxRetries: 2, retryDelay: 100 }
        )
      ).rejects.toEqual(deadlockError);

      // Avanzar timers para los retries
      await vi.advanceTimersByTimeAsync(100); // Primer retry
      await vi.advanceTimersByTimeAsync(200); // Segundo retry
      await vi.advanceTimersByTimeAsync(400); // Tercer retry (falla)

      await promise;

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'test-operation',
          attempt: 2,
          maxRetries: 2,
          errorCode: '40P01'
        }),
        'Transaction failed after max retries'
      );
    });
  });

  describe('errores no transitorios', () => {
    it('debería fallar inmediatamente sin retry para error no transitorio', async () => {
      vi.useRealTimers(); // Usar timers reales para este test
      const nonTransientError = { code: '23505', message: 'unique violation' };
      const transactionFn = vi.fn();

      mockTransactionFn.mockRejectedValue(nonTransientError);
      (loggedTransaction as ReturnType<typeof vi.fn>).mockRejectedValue(nonTransientError);

      await expect(
        transactionWithLogging(mockLogger, 'test-operation', transactionFn)
      ).rejects.toEqual(nonTransientError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'test-operation',
          attempt: 0,
          errorCode: '23505'
        }),
        'Transaction failed with non-transient error'
      );
      expect(mockLogger.warn).not.toHaveBeenCalled();
      vi.useFakeTimers(); // Volver a fake timers
    });

    it('debería fallar inmediatamente para error sin código', async () => {
      const errorWithoutCode = new Error('Some error');
      const transactionFn = vi.fn();

      mockTransactionFn.mockRejectedValue(errorWithoutCode);
      (loggedTransaction as ReturnType<typeof vi.fn>).mockRejectedValue(errorWithoutCode);

      await expect(
        transactionWithLogging(mockLogger, 'test-operation', transactionFn)
      ).rejects.toEqual(errorWithoutCode);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'test-operation',
          attempt: 0,
          errorCode: 'UNKNOWN'
        }),
        'Transaction failed with non-transient error'
      );
    });
  });

  describe('timeout handling', () => {
    it('debería reintentar en timeout (57014)', async () => {
      const expectedResult = { success: true };
      const transactionFn = vi.fn().mockResolvedValue(expectedResult);
      const timeoutError = { code: '57014', message: 'query canceled' };

      mockTransactionFn
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce(expectedResult);

      (loggedTransaction as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(timeoutError)
        .mockImplementationOnce(async (_logger, _operation, fn) => {
          await vi.advanceTimersByTimeAsync(100);
          return await fn();
        });

      const promise = transactionWithLogging(
        mockLogger,
        'test-operation',
        transactionFn,
        { maxRetries: 3, retryDelay: 100 }
      );

      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result).toEqual(expectedResult);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('debería reintentar en error con mensaje "timeout"', async () => {
      const expectedResult = { success: true };
      const transactionFn = vi.fn().mockResolvedValue(expectedResult);
      const timeoutError = new Error('Transaction timeout after 30000ms');

      mockTransactionFn
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce(expectedResult);

      (loggedTransaction as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(timeoutError)
        .mockImplementationOnce(async (_logger, _operation, fn) => {
          await vi.advanceTimersByTimeAsync(100);
          return await fn();
        });

      const promise = transactionWithLogging(
        mockLogger,
        'test-operation',
        transactionFn,
        { maxRetries: 3, retryDelay: 100 }
      );

      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result).toEqual(expectedResult);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('debería aplicar timeout personalizado', async () => {
      vi.useRealTimers(); // Usar timers reales para este test
      const expectedResult = { success: true };
      const transactionFn = vi.fn().mockResolvedValue(expectedResult);
      const customTimeout = 5000;

      mockTransactionFn.mockResolvedValue(expectedResult);
      (loggedTransaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (_logger, _operation, fn) => {
          return await fn();
        }
      );

      await transactionWithLogging(
        mockLogger,
        'test-operation',
        transactionFn,
        { timeout: customTimeout }
      );

      expect(mockTransactionFn).toHaveBeenCalledTimes(1);
      vi.useFakeTimers(); // Volver a fake timers
    });
  });

  describe('opciones personalizadas', () => {
    it('debería respetar maxRetries personalizado', async () => {
      const deadlockError = { code: '40P01', message: 'deadlock' };
      const transactionFn = vi.fn();

      mockTransactionFn.mockRejectedValue(deadlockError);
      (loggedTransaction as ReturnType<typeof vi.fn>).mockRejectedValue(deadlockError);

      const promise = expect(
        transactionWithLogging(mockLogger, 'test', transactionFn, { maxRetries: 1, retryDelay: 100 })
      ).rejects.toEqual(deadlockError);

      await vi.advanceTimersByTimeAsync(100); // Primer retry
      await vi.advanceTimersByTimeAsync(200); // Segundo retry (falla)

      await promise;

      // Debería haber intentado 2 veces (intento inicial + 1 retry)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 1, maxRetries: 1 }),
        'Transaction failed after max retries'
      );
    });

    it('debería respetar retryDelay personalizado', async () => {
      const expectedResult = { success: true };
      const transactionFn = vi.fn().mockResolvedValue(expectedResult);
      const deadlockError = { code: '40P01', message: 'deadlock' };
      const customDelay = 200;

      mockTransactionFn
        .mockRejectedValueOnce(deadlockError)
        .mockResolvedValueOnce(expectedResult);

      (loggedTransaction as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(deadlockError)
        .mockImplementationOnce(async (_logger, _operation, fn) => {
          await vi.advanceTimersByTimeAsync(customDelay);
          return await fn();
        });

      const promise = transactionWithLogging(
        mockLogger,
        'test',
        transactionFn,
        { maxRetries: 3, retryDelay: customDelay }
      );

      await vi.advanceTimersByTimeAsync(customDelay);
      const result = await promise;

      expect(result).toEqual(expectedResult);
      const warnCall = (mockLogger.warn as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(warnCall[0].delay).toBe(customDelay);
    });
  });

  describe('edge cases', () => {
    it('debería manejar error null/undefined', async () => {
      const transactionFn = vi.fn();
      const nullError = null;

      mockTransactionFn.mockRejectedValue(nullError);
      (loggedTransaction as ReturnType<typeof vi.fn>).mockRejectedValue(nullError);

      await expect(
        transactionWithLogging(mockLogger, 'test', transactionFn)
      ).rejects.toEqual(nullError);

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('debería manejar error sin propiedades esperadas', async () => {
      const transactionFn = vi.fn();
      const weirdError = 'string error';

      mockTransactionFn.mockRejectedValue(weirdError);
      (loggedTransaction as ReturnType<typeof vi.fn>).mockRejectedValue(weirdError);

      await expect(
        transactionWithLogging(mockLogger, 'test', transactionFn)
      ).rejects.toEqual(weirdError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ errorCode: 'UNKNOWN' }),
        'Transaction failed with non-transient error'
      );
    });

    it('debería lanzar error genérico si lastError es undefined', async () => {
      vi.useRealTimers(); // Usar timers reales para este test
      const transactionFn = vi.fn();

      // Simular un caso donde el loop termina sin error (no debería pasar)
      mockTransactionFn.mockImplementation(() => {
        throw new Error('Unexpected');
      });
      (loggedTransaction as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Unexpected');
      });

      await expect(
        transactionWithLogging(mockLogger, 'test', transactionFn, { maxRetries: -1 })
      ).rejects.toThrow();
      vi.useFakeTimers(); // Volver a fake timers
    });
  });
});
