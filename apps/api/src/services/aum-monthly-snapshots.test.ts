/**
 * Tests para snapshots mensuales de AUM
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, aumImportFiles, aumMonthlySnapshots, users } from '@cactus/db';
import { eq, sql } from 'drizzle-orm';
import { upsertAumMonthlySnapshots, type AumMonthlySnapshotInsert } from './aum';

// Mock dependencies
vi.mock('@cactus/db', async () => {
  const actual = await vi.importActual('@cactus/db');
  return {
    ...actual,
    db: vi.fn(),
    aumImportFiles: {},
    aumMonthlySnapshots: {},
    users: {},
    eq: vi.fn(() => ({ mockCondition: true })),
    sql: vi.fn(),
  };
});

const mockDb = vi.mocked(db);

describe.skip('aum-monthly-snapshots', () => {
  const testFileId = 'test-file-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('upsertAumMonthlySnapshots', () => {
    it('debe crear nuevos snapshots cuando no existen', async () => {
      // Simple mock that makes the function succeed
      mockDb.mockImplementation(() => ({
        select: vi.fn().mockResolvedValue([]),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            onConflictDoUpdate: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([
                {
                  id: 'snapshot-1',
                  fileId: testFileId,
                  accountNumber: 'ACC001',
                },
              ]),
            }),
          }),
        }),
      }));

      const snapshots: AumMonthlySnapshotInsert[] = [
        {
          fileId: testFileId,
          accountNumber: 'ACC001',
          idCuenta: 'ID001',
          reportMonth: 1,
          reportYear: 2025,
          aumDollars: 1000.5,
          bolsaArg: 500.25,
          fondosArg: 300.75,
          bolsaBci: null,
          pesos: 200.0,
          mep: null,
          cable: null,
          cv7000: null,
        },
      ];

      const result = await upsertAumMonthlySnapshots(snapshots);

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(1);
      expect(result.stats.updated).toBe(0);
      expect(result.stats.errors).toBe(0);
    });

    it('debe actualizar snapshots existentes', async () => {
      // Mock DB for update scenario
      mockDb.mockImplementation(() => ({
        select: vi.fn().mockResolvedValue([
          {
            id: 'existing-snapshot',
            fileId: testFileId,
            accountNumber: 'ACC001',
          },
        ]),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            onConflictDoUpdate: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([
                {
                  id: 'existing-snapshot',
                  fileId: testFileId,
                  accountNumber: 'ACC001',
                },
              ]),
            }),
          }),
        }),
      }));

      const snapshots: AumMonthlySnapshotInsert[] = [
        {
          fileId: testFileId,
          accountNumber: 'ACC001',
          idCuenta: 'ID001',
          reportMonth: 1,
          reportYear: 2025,
          aumDollars: 2000.75,
          bolsaArg: null,
          fondosArg: null,
          bolsaBci: null,
          pesos: null,
          mep: null,
          cable: null,
          cv7000: null,
        },
      ];

      const result = await upsertAumMonthlySnapshots(snapshots);

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(0);
      expect(result.stats.updated).toBe(1);
      expect(result.stats.errors).toBe(0);
    });

    it('debe preservar snapshots de diferentes meses', async () => {
      // Mock DB for multiple month snapshots
      mockDb.mockImplementation(() => ({
        select: vi.fn().mockResolvedValue([]),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            onConflictDoUpdate: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: 'snapshot-1' }, { id: 'snapshot-2' }]),
            }),
          }),
        }),
      }));

      const snapshots: AumMonthlySnapshotInsert[] = [
        {
          fileId: testFileId,
          accountNumber: 'ACC001',
          idCuenta: 'ID001',
          reportMonth: 1,
          reportYear: 2025,
          aumDollars: 1000.5,
          bolsaArg: null,
          fondosArg: null,
          bolsaBci: null,
          pesos: null,
          mep: null,
          cable: null,
          cv7000: null,
        },
        {
          fileId: testFileId,
          accountNumber: 'ACC001',
          idCuenta: 'ID001',
          reportMonth: 2,
          reportYear: 2025,
          aumDollars: 1500.75,
          bolsaArg: null,
          fondosArg: null,
          bolsaBci: null,
          pesos: null,
          mep: null,
          cable: null,
          cv7000: null,
        },
      ];

      const result = await upsertAumMonthlySnapshots(snapshots);

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(2);
      expect(result.stats.updated).toBe(0);
    });

    it('debe manejar snapshots con solo accountNumber o solo idCuenta', async () => {
      // Mock DB for partial data
      mockDb.mockImplementation(() => ({
        select: vi.fn().mockResolvedValue([]),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            onConflictDoUpdate: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: 'snapshot-1' }, { id: 'snapshot-2' }]),
            }),
          }),
        }),
      }));

      const snapshots: AumMonthlySnapshotInsert[] = [
        {
          fileId: testFileId,
          accountNumber: 'ACC001',
          idCuenta: null,
          reportMonth: 1,
          reportYear: 2025,
          aumDollars: 1000.5,
          bolsaArg: null,
          fondosArg: null,
          bolsaBci: null,
          pesos: null,
          mep: null,
          cable: null,
          cv7000: null,
        },
        {
          fileId: testFileId,
          accountNumber: null,
          idCuenta: 'ID001',
          reportMonth: 1,
          reportYear: 2025,
          aumDollars: 2000.75,
          bolsaArg: null,
          fondosArg: null,
          bolsaBci: null,
          pesos: null,
          mep: null,
          cable: null,
          cv7000: null,
        },
      ];

      const result = await upsertAumMonthlySnapshots(snapshots);

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(2);
    });

    it('debe procesar snapshots en batch', async () => {
      // Mock DB for large batch
      const batchSize = 150;
      mockDb.mockImplementation(() => ({
        select: vi.fn().mockResolvedValue([]),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            onConflictDoUpdate: vi.fn().mockReturnValue({
              returning: vi
                .fn()
                .mockResolvedValue(
                  Array.from({ length: batchSize }, (_, i) => ({ id: `snapshot-${i}` }))
                ),
            }),
          }),
        }),
      }));

      const snapshots: AumMonthlySnapshotInsert[] = Array.from({ length: 150 }, (_, i) => ({
        fileId: testFileId,
        accountNumber: `ACC${i.toString().padStart(3, '0')}`,
        idCuenta: `ID${i.toString().padStart(3, '0')}`,
        reportMonth: 1,
        reportYear: 2025,
        aumDollars: 1000 + i,
        bolsaArg: null,
        fondosArg: null,
        bolsaBci: null,
        pesos: null,
        mep: null,
        cable: null,
        cv7000: null,
      }));

      const result = await upsertAumMonthlySnapshots(snapshots);

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(150);
      expect(result.stats.errors).toBe(0);
    });
  });
});
