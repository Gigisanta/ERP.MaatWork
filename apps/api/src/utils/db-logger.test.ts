/**
 * Tests para db-logger utility
 * 
 * AI_DECISION: Tests unitarios para logging de queries de base de datos
 * Justificación: Validación crítica de métricas de performance
 * Impacto: Prevenir errores en monitoreo de queries
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Logger } from 'pino';
import { loggedQuery, createDrizzleLogger, loggedTransaction } from './db-logger';

describe('loggedQuery', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as unknown as Logger;
  });

  it('debería loggear query exitosa con duración corta (debug)', async () => {
    const queryFn = vi.fn().mockResolvedValue([{ id: '1' }]);
    
    await loggedQuery(mockLogger, 'test-query', queryFn, 'select');

    expect(queryFn).toHaveBeenCalledOnce();
    expect(mockLogger.debug).toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('debería loggear query exitosa con duración moderada (info)', async () => {
    const queryFn = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 600));
      return [{ id: '1' }];
    });
    
    await loggedQuery(mockLogger, 'test-query', queryFn, 'select');

    expect(mockLogger.info).toHaveBeenCalled();
  });

  it('debería loggear query lenta como warning', async () => {
    const queryFn = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 1100));
      return [{ id: '1' }];
    });
    
    await loggedQuery(mockLogger, 'test-query', queryFn, 'select');

    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('debería calcular rowCount para arrays', async () => {
    const queryFn = vi.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]);
    
    await loggedQuery(mockLogger, 'test-query', queryFn, 'select');

    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.objectContaining({
        rowCount: 2
      }),
      'DB query completed'
    );
  });

  it('debería loggear error de query', async () => {
    const error = new Error('DB error');
    const queryFn = vi.fn().mockRejectedValue(error);
    
    await expect(
      loggedQuery(mockLogger, 'test-query', queryFn, 'select')
    ).rejects.toThrow('DB error');

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error
      }),
      'DB query failed'
    );
  });
});

describe('createDrizzleLogger', () => {
  let mockLogger: Logger;
  let drizzleLogger: ReturnType<typeof createDrizzleLogger>;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as unknown as Logger;
    
    drizzleLogger = createDrizzleLogger(mockLogger);
  });

  it('debería crear logger con método select', async () => {
    const queryFn = vi.fn().mockResolvedValue([]);
    
    await drizzleLogger.select('test-select', queryFn);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.objectContaining({
        queryType: 'select'
      }),
      'DB query completed'
    );
  });

  it('debería crear logger con método insert', async () => {
    const queryFn = vi.fn().mockResolvedValue([]);
    
    await drizzleLogger.insert('test-insert', queryFn);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.objectContaining({
        queryType: 'insert'
      }),
      'DB query completed'
    );
  });

  it('debería crear logger con método update', async () => {
    const queryFn = vi.fn().mockResolvedValue([]);
    
    await drizzleLogger.update('test-update', queryFn);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.objectContaining({
        queryType: 'update'
      }),
      'DB query completed'
    );
  });

  it('debería crear logger con método delete', async () => {
    const queryFn = vi.fn().mockResolvedValue([]);
    
    await drizzleLogger.delete('test-delete', queryFn);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.objectContaining({
        queryType: 'delete'
      }),
      'DB query completed'
    );
  });

  it('debería crear logger con método raw', async () => {
    const queryFn = vi.fn().mockResolvedValue([]);
    
    await drizzleLogger.raw('test-raw', queryFn);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.objectContaining({
        queryType: 'raw'
      }),
      'DB query completed'
    );
  });
});

describe('loggedTransaction', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as unknown as Logger;
  });

  it('debería loggear transacción exitosa', async () => {
    const transactionFn = vi.fn().mockResolvedValue({ success: true });
    
    await loggedTransaction(mockLogger, 'test-transaction', transactionFn);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        queryType: 'transaction'
      }),
      'DB transaction completed'
    );
  });

  it('debería loggear error de transacción', async () => {
    const error = new Error('Transaction failed');
    const transactionFn = vi.fn().mockRejectedValue(error);
    
    await expect(
      loggedTransaction(mockLogger, 'test-transaction', transactionFn)
    ).rejects.toThrow('Transaction failed');

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error
      }),
      'DB transaction failed'
    );
  });
});















