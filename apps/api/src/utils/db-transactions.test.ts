import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger } from 'pino';
import { transactionWithLogging } from './db-transactions';
import { db } from '@cactus/db';

// Mock de db y loggedTransaction
const mockTransaction = vi.fn();
const mockDbInstance = {
  transaction: mockTransaction
};

vi.mock('@cactus/db', () => ({
  db: vi.fn(() => mockDbInstance)
}));

vi.mock('./db-logger', () => ({
  loggedTransaction: vi.fn(async (logger, operation, fn) => {
    return await fn();
  })
}));

describe('transactionWithLogging', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    } as unknown as Logger;
  });

  it('debería ejecutar transacción exitosamente', async () => {
    const mockTx = { select: vi.fn() };
    mockTransaction.mockImplementation(async (fn: any) => {
      return await fn(mockTx);
    });

    const result = await transactionWithLogging(
      mockLogger,
      'test-transaction',
      async (tx) => {
        return { success: true };
      }
    );

    expect(result).toEqual({ success: true });
    expect(mockTransaction).toHaveBeenCalled();
  });

  it('debería reintentar en caso de error transitorio', async () => {
    const mockTx = { select: vi.fn() };
    let attempt = 0;
    
    mockTransaction.mockImplementation(async (fn: any) => {
      attempt++;
      if (attempt === 1) {
        const error: any = new Error('Deadlock detected');
        error.code = '40P01';
        throw error;
      }
      return await fn(mockTx);
    });

    const result = await transactionWithLogging(
      mockLogger,
      'test-transaction',
      async (tx) => {
        return { success: true };
      },
      { maxRetries: 3, retryDelay: 10 }
    );

    expect(result).toEqual({ success: true });
    expect(attempt).toBe(2);
  });

  it('debería fallar después de max retries', async () => {
    mockTransaction.mockRejectedValue(
      Object.assign(new Error('Deadlock'), { code: '40P01' })
    );

    await expect(
      transactionWithLogging(
        mockLogger,
        'test-transaction',
        async () => ({ success: true }),
        { maxRetries: 2, retryDelay: 10 }
      )
    ).rejects.toThrow();

    expect(mockLogger.error).toHaveBeenCalled();
  });
});

