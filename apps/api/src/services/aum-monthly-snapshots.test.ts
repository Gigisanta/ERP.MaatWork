/**
 * Tests para snapshots mensuales de AUM
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, aumImportFiles, aumMonthlySnapshots, users } from '@cactus/db';
import { eq, sql } from 'drizzle-orm';
import {
  upsertAumMonthlySnapshots,
  type AumMonthlySnapshotInsert
} from './aumUpsert';

describe('aum-monthly-snapshots', () => {
  let testUserId: string;
  let testFileId: string;

  beforeEach(async () => {
    const dbi = db();
    
    // Crear usuario de prueba
    const [testUser] = await dbi.insert(users).values({
      email: `test-${Date.now()}@example.com`,
      fullName: 'Test User',
      role: 'admin',
      active: true
    }).returning();
    
    testUserId = testUser.id;

    // Crear archivo de prueba
    const [testFile] = await dbi.insert(aumImportFiles).values({
      broker: 'balanz',
      originalFilename: 'test-monthly.csv',
      mimeType: 'text/csv',
      sizeBytes: 1000,
      uploadedByUserId: testUserId,
      status: 'parsed',
      totalParsed: 0,
      totalMatched: 0,
      totalUnmatched: 0,
      fileType: 'monthly',
      reportMonth: 1,
      reportYear: 2025
    }).returning();
    
    testFileId = testFile.id;
  });

  afterEach(async () => {
    const dbi = db();
    
    // Limpiar datos de prueba
    await dbi.execute(sql`DELETE FROM aum_monthly_snapshots WHERE file_id = ${testFileId}`);
    await dbi.execute(sql`DELETE FROM aum_import_files WHERE id = ${testFileId}`);
    await dbi.execute(sql`DELETE FROM users WHERE id = ${testUserId}`);
  });

  describe('upsertAumMonthlySnapshots', () => {
    it('debe crear nuevos snapshots cuando no existen', async () => {
      const snapshots: AumMonthlySnapshotInsert[] = [
        {
          fileId: testFileId,
          accountNumber: 'ACC001',
          idCuenta: 'ID001',
          reportMonth: 1,
          reportYear: 2025,
          aumDollars: 1000.50,
          bolsaArg: 500.25,
          fondosArg: 300.75,
          bolsaBci: null,
          pesos: 200.00,
          mep: null,
          cable: null,
          cv7000: null
        }
      ];

      const result = await upsertAumMonthlySnapshots(snapshots);

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(1);
      expect(result.stats.updated).toBe(0);
      expect(result.stats.errors).toBe(0);

      // Verificar que se creó en la base de datos
      const dbi = db();
      const created = await dbi
        .select()
        .from(aumMonthlySnapshots)
        .where(eq(aumMonthlySnapshots.fileId, testFileId));

      expect(created.length).toBe(1);
      expect(created[0].accountNumber).toBe('ACC001');
      expect(created[0].idCuenta).toBe('ID001');
      expect(created[0].reportMonth).toBe(1);
      expect(created[0].reportYear).toBe(2025);
    });

    it('debe actualizar snapshots existentes', async () => {
      const dbi = db();
      
      // Crear snapshot inicial
      await dbi.insert(aumMonthlySnapshots).values({
        fileId: testFileId,
        accountNumber: 'ACC001',
        idCuenta: 'ID001',
        reportMonth: 1,
        reportYear: 2025,
        aumDollars: 1000.50
      });

      // Intentar upsert con valores actualizados
      const snapshots: AumMonthlySnapshotInsert[] = [
        {
          fileId: testFileId,
          accountNumber: 'ACC001',
          idCuenta: 'ID001',
          reportMonth: 1,
          reportYear: 2025,
          aumDollars: 2000.75, // Valor actualizado
          bolsaArg: null,
          fondosArg: null,
          bolsaBci: null,
          pesos: null,
          mep: null,
          cable: null,
          cv7000: null
        }
      ];

      const result = await upsertAumMonthlySnapshots(snapshots);

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(0);
      expect(result.stats.updated).toBe(1);
      expect(result.stats.errors).toBe(0);

      // Verificar que se actualizó
      const updated = await dbi
        .select()
        .from(aumMonthlySnapshots)
        .where(eq(aumMonthlySnapshots.fileId, testFileId));

      expect(updated.length).toBe(1);
      expect(updated[0].aumDollars).toBe('2000.75');
    });

    it('debe preservar snapshots de diferentes meses', async () => {
      const snapshots: AumMonthlySnapshotInsert[] = [
        {
          fileId: testFileId,
          accountNumber: 'ACC001',
          idCuenta: 'ID001',
          reportMonth: 1,
          reportYear: 2025,
          aumDollars: 1000.50,
          bolsaArg: null,
          fondosArg: null,
          bolsaBci: null,
          pesos: null,
          mep: null,
          cable: null,
          cv7000: null
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
          cv7000: null
        }
      ];

      const result = await upsertAumMonthlySnapshots(snapshots);

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(2);
      expect(result.stats.updated).toBe(0);

      // Verificar que ambos meses existen
      const dbi = db();
      const allSnapshots = await dbi
        .select()
        .from(aumMonthlySnapshots)
        .where(eq(aumMonthlySnapshots.fileId, testFileId));

      expect(allSnapshots.length).toBe(2);
      
      const janSnapshot = allSnapshots.find(s => s.reportMonth === 1);
      const febSnapshot = allSnapshots.find(s => s.reportMonth === 2);
      
      expect(janSnapshot).toBeDefined();
      expect(febSnapshot).toBeDefined();
      expect(janSnapshot?.aumDollars).toBe('1000.50');
      expect(febSnapshot?.aumDollars).toBe('1500.75');
    });

    it('debe manejar snapshots con solo accountNumber o solo idCuenta', async () => {
      const snapshots: AumMonthlySnapshotInsert[] = [
        {
          fileId: testFileId,
          accountNumber: 'ACC001',
          idCuenta: null,
          reportMonth: 1,
          reportYear: 2025,
          aumDollars: 1000.50,
          bolsaArg: null,
          fondosArg: null,
          bolsaBci: null,
          pesos: null,
          mep: null,
          cable: null,
          cv7000: null
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
          cv7000: null
        }
      ];

      const result = await upsertAumMonthlySnapshots(snapshots);

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(2);
    });

    it('debe procesar snapshots en batch', async () => {
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
        cv7000: null
      }));

      const result = await upsertAumMonthlySnapshots(snapshots);

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(150);
      expect(result.stats.errors).toBe(0);

      // Verificar que todos se crearon
      const dbi = db();
      const allSnapshots = await dbi
        .select()
        .from(aumMonthlySnapshots)
        .where(eq(aumMonthlySnapshots.fileId, testFileId));

      expect(allSnapshots.length).toBe(150);
    });
  });
});

