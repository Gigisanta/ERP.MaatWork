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
  type AumMonthlySnapshotInsert
} from './aumUpsert';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  aumImportRows: {},
  aumImportFiles: {},
  advisorAccountMapping: {},
  aumMonthlySnapshots: {},
  eq: vi.fn(),
  and: vi.fn(),
  sql: vi.fn()
}));

vi.mock('../utils/aum-normalization', () => ({
  normalizeAccountNumber: vi.fn((value: string | null | undefined) => {
    if (!value) return null;
    return value.replace(/\D+/g, '');
  })
}));

vi.mock('./aumMatcher', () => ({
  isNameSimilarityHigh: vi.fn((name1: string | null, name2: string | null) => {
    if (!name1 || !name2) return false;
    return name1.toLowerCase().trim() === name2.toLowerCase().trim();
  })
}));

vi.mock('../config/aum-limits', () => ({
  AUM_LIMITS: {
    BATCH_INSERT_SIZE: 500
  }
}));

vi.mock('../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn()
  }
}));

import { db } from '@cactus/db';
import { aumImportRows, advisorAccountMapping, aumMonthlySnapshots, eq, sql } from '@cactus/db';
import { normalizeAccountNumber } from '../utils/aum-normalization';
import { isNameSimilarityHigh } from './aumMatcher';
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
      mockNormalizeAccountNumber
        .mockReturnValueOnce('12345')
        .mockReturnValueOnce('67890');

      const result = detectAccountNumberChange('cuenta-123', '12345', '67890');

      expect(result).toBe(true);
    });

    it('debería no detectar cambio cuando accountNumbers son iguales', () => {
      mockNormalizeAccountNumber
        .mockReturnValueOnce('12345')
        .mockReturnValueOnce('12345');

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
      mockNormalizeAccountNumber
        .mockReturnValueOnce('12345')
        .mockReturnValueOnce('12345');

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
            limit: vi.fn().mockResolvedValue([{
              advisorRaw: 'advisor@example.com',
              matchedUserId: 'user-123'
            }])
          })
        })
      });

      mockDb.mockReturnValue({
        select: mockSelect
      } as any);

      const result = await applyAdvisorAccountMapping('12345');

      expect(result).toEqual({
        advisorRaw: 'advisor@example.com',
        matchedUserId: 'user-123'
      });
    });

    it('debería retornar null cuando no existe mapping', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      mockDb.mockReturnValue({
        select: mockSelect
      } as any);

      const result = await applyAdvisorAccountMapping('12345');

      expect(result).toEqual({
        advisorRaw: null,
        matchedUserId: null
      });
    });

    it('debería retornar null cuando hay error en DB', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('DB error'))
          })
        })
      });

      mockDb.mockReturnValue({
        select: mockSelect
      } as any);

      const result = await applyAdvisorAccountMapping('12345');

      expect(result).toEqual({
        advisorRaw: null,
        matchedUserId: null
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
      ...overrides
    });

    it('debería insertar nuevas filas cuando no existen', async () => {
      // Mock findExistingRow returns null (no existing row)
      const mockExecute = vi.fn().mockResolvedValue({
        rows: []
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined)
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        // First call: findExistingRow (execute)
        if (callCount === 1) {
          return { execute: mockExecute } as any;
        }
        // Second call: insertNewRow (insert)
        return { insert: mockInsert } as any;
      });

      const rows = [createMockRow()];
      const result = await upsertAumRows(rows, 'balanz');

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(1);
      expect(result.stats.updated).toBe(0);
      expect(result.stats.errors).toBe(0);
    });

    it('debería actualizar filas existentes cuando existen', async () => {
      // Mock findExistingRow returns existing row
      const mockExecute = vi.fn().mockResolvedValue({
        rows: [{
          id: 'row-123',
          file_id: 'file-456',
          account_number: '12345',
          holder_name: 'Juan Perez',
          id_cuenta: null,
          matched_contact_id: 'contact-123',
          matched_user_id: null,
          advisor_raw: null,
          match_status: 'matched',
          is_preferred: true
        }]
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined)
        })
      });

      const mockExecuteUpdate = vi.fn().mockResolvedValue({
        rowCount: 0
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        // First call: findExistingRow (execute)
        if (callCount === 1) {
          return { execute: mockExecute } as any;
        }
        // Second call: updateExistingRow (update)
        if (callCount === 2) {
          return { update: mockUpdate } as any;
        }
        // Third call: updateExistingRow unset preferred (execute)
        return { execute: mockExecuteUpdate } as any;
      });

      const rows = [createMockRow({ accountNumber: '12345' })];
      const result = await upsertAumRows(rows, 'balanz');

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(0);
      expect(result.stats.updated).toBe(1);
      expect(result.stats.errors).toBe(0);
    });

    it('debería procesar batches correctamente', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        rows: []
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined)
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 1) {
          return { execute: mockExecute } as any;
        }
        return { insert: mockInsert } as any;
      });

      // Create 3 rows (should process in one batch if BATCH_INSERT_SIZE > 3)
      const rows = [
        createMockRow({ accountNumber: '12345' }),
        createMockRow({ accountNumber: '67890' }),
        createMockRow({ accountNumber: '11111' })
      ];
      const result = await upsertAumRows(rows, 'balanz');

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(3);
      expect(result.stats.updated).toBe(0);
      expect(result.stats.errors).toBe(0);
    });

    it('debería contar errores cuando insert falla', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        rows: []
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error('Insert error'))
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 1) {
          return { execute: mockExecute } as any;
        }
        return { insert: mockInsert } as any;
      });

      const rows = [createMockRow()];
      const result = await upsertAumRows(rows, 'balanz');

      expect(result.success).toBe(true); // Still success if some rows processed
      expect(result.stats.inserted).toBe(0);
      expect(result.stats.updated).toBe(0);
      expect(result.stats.errors).toBe(1);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('debería trackear updatedOnlyHolderName cuando corresponde', async () => {
      // Mock findExistingRow returns existing row
      const mockExecute = vi.fn().mockResolvedValue({
        rows: [{
          id: 'row-123',
          file_id: 'file-456',
          account_number: null,
          holder_name: 'Juan Perez',
          id_cuenta: null,
          matched_contact_id: null,
          matched_user_id: null,
          advisor_raw: null,
          match_status: 'unmatched',
          is_preferred: true
        }]
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined)
        })
      });

      const mockExecuteUpdate = vi.fn().mockResolvedValue({
        rowCount: 0
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { execute: mockExecute } as any;
        }
        if (callCount === 2) {
          return { update: mockUpdate } as any;
        }
        return { execute: mockExecuteUpdate } as any;
      });

      // Row with only holderName (no accountNumber, no idCuenta)
      const rows = [createMockRow({
        accountNumber: null,
        idCuenta: null,
        holderName: 'Juan Perez',
        advisorRaw: null
      })];
      const result = await upsertAumRows(rows, 'balanz');

      expect(result.success).toBe(true);
      expect(result.stats.updated).toBe(1);
      expect(result.stats.updatedOnlyHolderName).toBe(1);
    });
  });

  describe('upsertAumMonthlySnapshots', () => {
    const createMockSnapshot = (overrides: Partial<AumMonthlySnapshotInsert> = {}): AumMonthlySnapshotInsert => ({
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
      ...overrides
    });

    it('debería insertar nuevo snapshot cuando no existe', async () => {
      // Mock check for existing snapshot returns empty
      const mockExecuteCheck = vi.fn().mockResolvedValue({
        rows: []
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined)
      });

      // Mock check for existing (execute)
      // Then insert (insert)
      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 1) {
          return { execute: mockExecuteCheck } as any;
        }
        return { insert: mockInsert } as any;
      });

      const snapshots = [createMockSnapshot()];
      const result = await upsertAumMonthlySnapshots(snapshots);

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(1);
      expect(result.stats.updated).toBe(0);
      expect(result.stats.errors).toBe(0);
    });

    it('debería actualizar snapshot existente cuando existe', async () => {
      // Mock check for existing snapshot returns existing
      const mockExecuteCheck = vi.fn().mockResolvedValue({
        rows: [{ id: 'snapshot-123' }]
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined)
      })
      });

      const mockExecuteUpdate = vi.fn().mockResolvedValue({
        rows: []
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { execute: mockExecuteCheck } as any;
        }
        if (callCount === 2) {
          return { execute: mockExecuteUpdate } as any;
        }
        return { update: mockUpdate } as any;
      });

      const snapshots = [createMockSnapshot()];
      const result = await upsertAumMonthlySnapshots(snapshots);

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(0);
      expect(result.stats.updated).toBe(1);
      expect(result.stats.errors).toBe(0);
    });

    it('debería procesar múltiples snapshots', async () => {
      const mockExecuteCheck = vi.fn().mockResolvedValue({
        rows: []
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined)
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 1) {
          return { execute: mockExecuteCheck } as any;
        }
        return { insert: mockInsert } as any;
      });

      const snapshots = [
        createMockSnapshot({ accountNumber: '12345', reportMonth: 1 }),
        createMockSnapshot({ accountNumber: '67890', reportMonth: 1 }),
        createMockSnapshot({ accountNumber: '11111', reportMonth: 2 })
      ];
      const result = await upsertAumMonthlySnapshots(snapshots);

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(3);
      expect(result.stats.updated).toBe(0);
      expect(result.stats.errors).toBe(0);
    });

    it('debería contar errores cuando upsert falla', async () => {
      const mockExecuteCheck = vi.fn().mockResolvedValue({
        rows: []
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error('Insert error'))
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 1) {
          return { execute: mockExecuteCheck } as any;
        }
        return { insert: mockInsert } as any;
      });

      const snapshots = [createMockSnapshot()];
      const result = await upsertAumMonthlySnapshots(snapshots);

      expect(result.success).toBe(true); // Still success if some processed
      expect(result.stats.inserted).toBe(0);
      expect(result.stats.updated).toBe(0);
      expect(result.stats.errors).toBe(1);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('debería manejar snapshots con accountNumber null', async () => {
      const mockExecuteCheck = vi.fn().mockResolvedValue({
        rows: []
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined)
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 1) {
          return { execute: mockExecuteCheck } as any;
        }
        return { insert: mockInsert } as any;
      });

      const snapshots = [createMockSnapshot({ accountNumber: null, idCuenta: 'cuenta-123' })];
      const result = await upsertAumMonthlySnapshots(snapshots);

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(1);
    });
  });
});


