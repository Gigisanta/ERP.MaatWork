/**
 * Tests para aumUpsert service
 *
 * AI_DECISION: Tests unitarios para servicio de upsert AUM
 * Justificación: Validación crítica de lógica de upsert y detección de duplicados
 * Impacto: Prevenir errores en importación y actualización de datos AUM
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectAccountNumberChange,
  upsertAumRows,
  applyAdvisorAccountMapping,
  upsertAumMonthlySnapshots,
  type AumRowInsert,
  type AumMonthlySnapshotInsert,
} from './aum';

// Mock dependencies
vi.mock('@maatwork/db', () => ({
  db: vi.fn(),
  aumImportRows: {},
  aumImportFiles: {},
  advisorAccountMapping: {},
  aumMonthlySnapshots: {},
}));

// AI_DECISION: Mock sql como tagged template function con join para monthly snapshots
vi.mock('drizzle-orm', () => ({
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({
      sql: strings.join('?'),
      values,
    }),
    {
      raw: vi.fn((str: string) => ({ sql: str, values: [] })),
      join: vi.fn((parts: unknown[], separator: unknown) => 'mocked-sql-join'),
    }
  ),
  eq: vi.fn((col: unknown, val: unknown) => ({ column: col, value: val })),
  and: vi.fn((...conditions: unknown[]) => ({ and: conditions })),
}));

vi.mock('../utils/aum/aum-normalization', () => ({
  normalizeAccountNumber: vi.fn((value: string | null | undefined) => {
    if (!value) return null;
    return value.replace(/\D+/g, '');
  }),
}));

vi.mock('./aumMatcher', () => ({
  isNameSimilarityHigh: vi.fn((name1: string | null, name2: string | null) => {
    if (!name1 || !name2) return false;
    return name1.toLowerCase().trim() === name2.toLowerCase().trim();
  }),
}));

vi.mock('../config/aum-limits', () => ({
  AUM_LIMITS: {
    BATCH_INSERT_SIZE: 500,
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

import { db, aumImportRows, advisorAccountMapping, aumMonthlySnapshots } from '@maatwork/db';
import { eq, sql } from 'drizzle-orm';
import { normalizeAccountNumber } from '../utils/aum/aum-normalization';
import { isNameSimilarityHigh } from './aum/matcher';
import { logger } from '../utils/logger';

const mockDb = vi.mocked(db);
const mockNormalizeAccountNumber = vi.mocked(normalizeAccountNumber);
const mockLogger = vi.mocked(logger);

describe('aumUpsert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectAccountNumberChange', () => {
    it('debería detectar cambio cuando accountNumbers son diferentes', () => {
      mockNormalizeAccountNumber.mockReturnValueOnce('12345').mockReturnValueOnce('67890');

      const result = detectAccountNumberChange('cuenta-123', '12345', '67890');

      expect(result).toBe(true);
    });

    it('debería no detectar cambio cuando accountNumbers son iguales', () => {
      mockNormalizeAccountNumber.mockReturnValueOnce('12345').mockReturnValueOnce('12345');

      const result = detectAccountNumberChange('cuenta-123', '12345', '12345');

      expect(result).toBe(false);
    });

    it('debería retornar false cuando idCuenta es null', () => {
      const result = detectAccountNumberChange(null, '12345', '67890');

      expect(result).toBe(false);
    });

    it('debería retornar false cuando newAccountNumber es null', () => {
      const result = detectAccountNumberChange('cuenta-123', null, '67890');

      expect(result).toBe(false);
    });

    it('debería retornar false cuando existingAccountNumber es null', () => {
      const result = detectAccountNumberChange('cuenta-123', '12345', null);

      expect(result).toBe(false);
    });

    it('debería normalizar accountNumbers antes de comparar', () => {
      mockNormalizeAccountNumber.mockReturnValueOnce('12345').mockReturnValueOnce('12345');

      const result = detectAccountNumberChange('cuenta-123', '123-45', '12345');

      expect(result).toBe(false);
      expect(mockNormalizeAccountNumber).toHaveBeenCalledWith('123-45');
      expect(mockNormalizeAccountNumber).toHaveBeenCalledWith('12345');
    });
  });

  describe('applyAdvisorAccountMapping', () => {
    it('debería retornar mapping cuando existe', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                advisorRaw: 'advisor@example.com',
                matchedUserId: 'user-123',
              },
            ]),
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await applyAdvisorAccountMapping('12345');

      expect(result).toEqual({
        advisorRaw: 'advisor@example.com',
        matchedUserId: 'user-123',
      });
    });

    it('debería retornar null cuando no existe mapping', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await applyAdvisorAccountMapping('12345');

      expect(result).toEqual({
        advisorRaw: null,
        matchedUserId: null,
      });
    });

    it('debería retornar null cuando hay error en DB', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('DB error')),
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await applyAdvisorAccountMapping('12345');

      expect(result).toEqual({
        advisorRaw: null,
        matchedUserId: null,
      });
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('upsertAumRows', () => {
    const createMockRow = (overrides: Partial<AumRowInsert> = {}): AumRowInsert => ({
      fileId: 'file-123',
      raw: {},
      accountNumber: '12345',
      holderName: 'Juan Perez',
      idCuenta: null,
      advisorRaw: null,
      matchedContactId: null,
      matchedUserId: null,
      matchStatus: 'unmatched',
      isPreferred: true,
      conflictDetected: false,
      aumDollars: 1000,
      bolsaArg: null,
      fondosArg: null,
      bolsaBci: null,
      pesos: null,
      mep: null,
      cable: null,
      cv7000: null,
      ...overrides,
    });

    it('debería insertar nuevas filas cuando no existen', async () => {
      // Mock findExistingRow returns null (no existing row)
      // findExistingRow with accountNumber will try strategy 3 (by accountNumber)
      // So it will call execute once
      const mockExecute = vi.fn().mockResolvedValue({
        rows: [],
      });

      const mockValues = vi.fn().mockResolvedValue(undefined);
      const mockInsert = vi.fn().mockReturnValue({
        values: mockValues,
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        // Call 1: findExistingRow strategy 3 (execute by accountNumber)
        if (callCount === 1) {
          return { execute: mockExecute } as any;
        }
        // Call 2: insertNewRow (insert().values())
        return { insert: mockInsert } as any;
      });

      const rows = [createMockRow()];
      const result = await upsertAumRows(rows, 'balanz');

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(1);
      expect(result.stats.updated).toBe(0);
      expect(result.stats.errors).toBe(0);
      expect(mockValues).toHaveBeenCalled();
    });

    it('debería actualizar filas existentes cuando existen', async () => {
      // Mock findExistingRow returns existing row
      // Strategy 1 (idCuenta): returns null immediately (no idCuenta in row)
      // Strategy 2 (reverse lookup): returns null immediately (no idCuenta in row)
      // Strategy 3 (accountNumber): calls execute and returns existing row
      // Then updateExistingRow calls update and execute (unsetPreferredOnDuplicates)
      let executeCallCount = 0;
      const mockExecute = vi.fn().mockImplementation(() => {
        executeCallCount++;
        // First call: strategy 3 (accountNumber) returns existing row
        if (executeCallCount === 1) {
          return Promise.resolve({
            rows: [
              {
                id: 'row-123',
                file_id: 'file-456',
                account_number: '12345',
                holder_name: 'Juan Perez',
                id_cuenta: null,
                matched_contact_id: 'contact-123',
                matched_user_id: null,
                advisor_raw: null,
                match_status: 'matched',
                is_preferred: true,
                is_normalized: false,
              },
            ],
          });
        }
        // Second call: unsetPreferredOnDuplicates
        return Promise.resolve({ rowCount: 0 });
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      mockDb.mockImplementation(() => {
        return {
          execute: mockExecute,
          update: mockUpdate,
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
          }),
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        } as any;
      });

      const rows = [createMockRow({ accountNumber: '12345' })];
      const result = await upsertAumRows(rows, 'balanz');

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(0);
      expect(result.stats.updated).toBe(1);
      expect(result.stats.errors).toBe(0);
    });

    it('debería procesar batches correctamente', async () => {
      // AI_DECISION: El código actual usa 4 estrategias de búsqueda (idCuenta, reverseLookup, accountNumber, holderName)
      // Justificación: findExistingRow ahora ejecuta hasta 4 queries secuenciales antes de insertar
      // Impacto: Los mocks deben simular que todas las estrategias retornan vacío para que se inserte
      const mockExecute = vi.fn().mockResolvedValue({
        rows: [],
      });

      const mockValues = vi.fn().mockResolvedValue(undefined);
      const mockInsert = vi.fn().mockReturnValue({
        values: mockValues,
      });

      mockDb.mockImplementation(() => {
        return {
          execute: mockExecute,
          insert: mockInsert,
        } as any;
      });

      // Create 3 rows (should process in one batch if BATCH_INSERT_SIZE > 3)
      const rows = [
        createMockRow({ accountNumber: '12345' }),
        createMockRow({ accountNumber: '67890' }),
        createMockRow({ accountNumber: '11111' }),
      ];
      const result = await upsertAumRows(rows, 'balanz');

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(3);
      expect(result.stats.updated).toBe(0);
      expect(result.stats.errors).toBe(0);
    });

    it('debería contar errores cuando insert falla', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        rows: [],
      });

      const mockValues = vi.fn().mockRejectedValue(new Error('Insert error'));
      const mockInsert = vi.fn().mockReturnValue({
        values: mockValues,
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        // Call 1: findExistingRow strategy 3 (execute by accountNumber)
        if (callCount === 1) {
          return { execute: mockExecute } as any;
        }
        // Call 2: insertNewRow (insert) - fails
        return { insert: mockInsert } as any;
      });

      const rows = [createMockRow()];
      const result = await upsertAumRows(rows, 'balanz');

      expect(result.success).toBe(false); // Fails because all rows failed
      expect(result.stats.inserted).toBe(0);
      expect(result.stats.updated).toBe(0);
      expect(result.stats.errors).toBe(1);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('debería trackear updatedOnlyHolderName cuando corresponde', async () => {
      // AI_DECISION: Para que se trackee updatedOnlyHolderName:
      // 1. findExistingRow debe encontrar una fila existente
      // 2. La fila nueva debe tener solo holderName (hasOnlyHolderName = true)
      // Justificación: El código verifica hasOnlyHolderName después de updateExistingRow exitoso
      // Impacto: Los mocks deben simular que se encuentra fila existente por holderName

      // Mock: solo estrategia 4 (holderName) encuentra, pero como 1-3 retornan null antes de execute,
      // la primera llamada a execute será de la estrategia 4.
      const mockExecute = vi.fn().mockResolvedValue({
        rows: [
          {
            id: 'row-123',
            file_id: 'file-456',
            account_number: null,
            holder_name: 'Juan Perez',
            id_cuenta: null,
            matched_contact_id: null,
            matched_user_id: null,
            advisor_raw: null,
            match_status: 'unmatched',
            is_preferred: true,
            is_normalized: false,
          },
        ],
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      mockDb.mockImplementation(() => {
        return {
          execute: mockExecute,
          update: mockUpdate,
        } as any;
      });

      // Row with only holderName (no accountNumber, no idCuenta)
      const rows = [
        createMockRow({
          accountNumber: null,
          idCuenta: null,
          holderName: 'Juan Perez',
          advisorRaw: null,
        }),
      ];
      const result = await upsertAumRows(rows, 'balanz');

      expect(result.success).toBe(true);
      expect(result.stats.updated).toBe(1);
      expect(result.stats.updatedOnlyHolderName).toBe(1);
    });
  });

  describe('upsertAumMonthlySnapshots', () => {
    const createMockSnapshot = (
      overrides: Partial<AumMonthlySnapshotInsert> = {}
    ): AumMonthlySnapshotInsert => ({
      fileId: 'file-123',
      accountNumber: '12345',
      idCuenta: null,
      reportMonth: 1,
      reportYear: 2024,
      aumDollars: 1000,
      bolsaArg: null,
      fondosArg: null,
      bolsaBci: null,
      pesos: null,
      mep: null,
      cable: null,
      cv7000: null,
      ...overrides,
    });

    it('debería insertar nuevo snapshot cuando no existe', async () => {
      // AI_DECISION: El código actual llama checkSnapshotExists + upsertSingleMonthlySnapshot
      // Justificación: checkSnapshotExists hace 1 execute, upsertSingleMonthlySnapshot hace otro execute + insert
      // Impacto: Todos los execute deben retornar rows vacío para que se inserte como nuevo
      const mockExecuteCheck = vi.fn().mockResolvedValue({
        rows: [],
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      mockDb.mockImplementation(() => {
        return {
          execute: mockExecuteCheck,
          insert: mockInsert,
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        } as any;
      });

      const snapshots = [createMockSnapshot()];
      const result = await upsertAumMonthlySnapshots(snapshots);

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(1);
      expect(result.stats.updated).toBe(0);
      expect(result.stats.errors).toBe(0);
    });

    it('debería actualizar snapshot existente cuando existe', async () => {
      // AI_DECISION: checkSnapshotExists retorna true, upsertSingleMonthlySnapshot encuentra y actualiza
      // Justificación: Ambos execute deben retornar el mismo snapshot existente
      // Impacto: Se cuenta como updated, no inserted
      const mockExecuteCheck = vi.fn().mockResolvedValue({
        rows: [{ id: 'snapshot-123' }],
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      mockDb.mockImplementation(() => {
        return {
          execute: mockExecuteCheck,
          update: mockUpdate,
        } as any;
      });

      const snapshots = [createMockSnapshot()];
      const result = await upsertAumMonthlySnapshots(snapshots);

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(0);
      expect(result.stats.updated).toBe(1);
      expect(result.stats.errors).toBe(0);
    });

    it('debería procesar múltiples snapshots', async () => {
      // AI_DECISION: Procesar 3 snapshots nuevos en paralelo
      // Justificación: Promise.allSettled procesa todos en paralelo, cada uno hace 2 executes + 1 insert
      // Impacto: Todos deben insertarse correctamente
      const mockExecuteCheck = vi.fn().mockResolvedValue({
        rows: [],
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      mockDb.mockImplementation(() => {
        return {
          execute: mockExecuteCheck,
          insert: mockInsert,
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        } as any;
      });

      const snapshots = [
        createMockSnapshot({ accountNumber: '12345', reportMonth: 1 }),
        createMockSnapshot({ accountNumber: '67890', reportMonth: 1 }),
        createMockSnapshot({ accountNumber: '11111', reportMonth: 2 }),
      ];
      const result = await upsertAumMonthlySnapshots(snapshots);

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(3);
      expect(result.stats.updated).toBe(0);
      expect(result.stats.errors).toBe(0);
    });

    it('debería contar errores cuando upsert falla', async () => {
      const mockExecuteCheck = vi.fn().mockResolvedValue({
        rows: [],
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error('Insert error')),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        // Calls 1-2: execute (checks)
        if (callCount <= 2) {
          return { execute: mockExecuteCheck } as any;
        }
        // Call 3: insert - fails
        return { insert: mockInsert, update: mockUpdate } as any;
      });

      const snapshots = [createMockSnapshot()];
      const result = await upsertAumMonthlySnapshots(snapshots);

      expect(result.success).toBe(false); // Fails because all failed
      expect(result.stats.inserted).toBe(0);
      expect(result.stats.updated).toBe(0);
      expect(result.stats.errors).toBe(1);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('debería manejar snapshots con accountNumber null', async () => {
      // AI_DECISION: Snapshot con accountNumber null pero idCuenta válido
      // Justificación: El código usa condiciones SQL que manejan nulls correctamente
      // Impacto: Debe insertarse usando idCuenta como identificador
      const mockExecuteCheck = vi.fn().mockResolvedValue({
        rows: [],
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      mockDb.mockImplementation(() => {
        return {
          execute: mockExecuteCheck,
          insert: mockInsert,
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        } as any;
      });

      const snapshots = [createMockSnapshot({ accountNumber: null, idCuenta: 'cuenta-123' })];
      const result = await upsertAumMonthlySnapshots(snapshots);

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(1);
    });
  });
});
