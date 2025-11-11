/**
 * Test de verificación de importación AUM
 * 
 * Compara el CSV con los datos cargados en la base de datos
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { join } from 'path';
import { db } from '@cactus/db';
import { sql, eq, desc } from 'drizzle-orm';
import { aumImportFiles } from '@cactus/db/schema';

const CSV_FILE = 'Balanz Cactus 2025 - AUM Balanz.csv';
const BROKER = 'balanz';

describe('AUM Import Verification', () => {
  it('should verify CSV data matches database', async () => {
    // 1. Parsear CSV
    const csvPath = join(process.cwd(), CSV_FILE);
    const csvContent = readFileSync(csvPath, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: false,
      trim: true
    });

    // Contar filas válidas
    const validRows = records.filter(r => {
      return Object.values(r).some(v => v && String(v).trim().length > 0);
    });

    // Contar filas con solo Descripcion
    const rowsWithOnlyDescripcion = records.filter(r => {
      const hasIdCuenta = r.idCuenta && r.idCuenta.trim().length > 0;
      const hasComitente = r.comitente && r.comitente.trim().length > 0;
      const hasDescripcion = r.Descripcion && r.Descripcion.trim().length > 0;
      return !hasIdCuenta && !hasComitente && hasDescripcion;
    });

    console.log(`\nCSV Analysis:`);
    console.log(`  Total rows: ${records.length}`);
    console.log(`  Valid rows: ${validRows.length}`);
    console.log(`  Rows with only Descripcion: ${rowsWithOnlyDescripcion.length}`);

    // 2. Buscar archivo en base de datos
    const dbi = db();
    const files = await dbi
      .select()
      .from(aumImportFiles)
      .where(eq(aumImportFiles.originalFilename, CSV_FILE))
      .orderBy(desc(aumImportFiles.createdAt))
      .limit(1);

    expect(files.length).toBeGreaterThan(0);
    const file = files[0];

    console.log(`\nDatabase File:`);
    console.log(`  ID: ${file.id}`);
    console.log(`  Status: ${file.status}`);
    console.log(`  total_parsed: ${file.totalParsed}`);

    // 3. Contar filas en base de datos
    const countResult = await dbi.execute(sql`
      SELECT COUNT(*)::int as count
      FROM aum_import_rows
      WHERE file_id = ${file.id}
    `);
    const dbCount = countResult.rows[0]?.count ?? 0;

    // 4. Contar filas con solo holderName
    const onlyHolderNameResult = await dbi.execute(sql`
      SELECT COUNT(*)::int as count
      FROM aum_import_rows
      WHERE file_id = ${file.id}
        AND (account_number IS NULL OR account_number = '')
        AND (id_cuenta IS NULL OR id_cuenta = '')
        AND holder_name IS NOT NULL
        AND holder_name != ''
    `);
    const dbOnlyHolderNameCount = onlyHolderNameResult.rows[0]?.count ?? 0;

    console.log(`\nDatabase Counts:`);
    console.log(`  Total rows: ${dbCount}`);
    console.log(`  Rows with only holderName: ${dbOnlyHolderNameCount}`);

    // 5. Verificaciones
    console.log(`\nVerification:`);
    console.log(`  CSV valid rows: ${validRows.length}`);
    console.log(`  DB rows: ${dbCount}`);
    console.log(`  Difference: ${validRows.length - dbCount}`);

    // Verificar que los conteos coinciden
    expect(dbCount).toBe(validRows.length);
    expect(dbOnlyHolderNameCount).toBe(rowsWithOnlyDescripcion.length);

    // 6. Verificar algunas filas específicas
    console.log(`\nSample Verification:`);
    
    // Verificar filas con solo Descripcion
    const sampleDescripcionRows = rowsWithOnlyDescripcion.slice(0, 3);
    for (const csvRow of sampleDescripcionRows) {
      const holderName = csvRow.Descripcion?.trim();
      if (!holderName) continue;
      
      const dbRow = await dbi.execute(sql`
        SELECT id, holder_name
        FROM aum_import_rows
        WHERE file_id = ${file.id}
          AND holder_name = ${holderName}
          AND (account_number IS NULL OR account_number = '')
          AND (id_cuenta IS NULL OR id_cuenta = '')
        LIMIT 1
      `);
      
      expect(dbRow.rows?.length).toBeGreaterThan(0);
      console.log(`  ✅ "${holderName}" - found in DB`);
    }

    // Verificar filas con idCuenta
    const rowsWithIdCuenta = validRows.filter(r => r.idCuenta && r.idCuenta.trim().length > 0).slice(0, 3);
    for (const csvRow of rowsWithIdCuenta) {
      const idCuenta = csvRow.idCuenta?.trim();
      if (!idCuenta) continue;
      
      const dbRow = await dbi.execute(sql`
        SELECT id, holder_name, id_cuenta
        FROM aum_import_rows
        WHERE file_id = ${file.id}
          AND id_cuenta = ${idCuenta}
        LIMIT 1
      `);
      
      expect(dbRow.rows?.length).toBeGreaterThan(0);
      const dbData = dbRow.rows[0];
      expect(dbData.id_cuenta).toBe(idCuenta);
      console.log(`  ✅ idCuenta ${idCuenta} - found in DB`);
    }

    console.log(`\n✅ All verifications passed!`);
  });
});

