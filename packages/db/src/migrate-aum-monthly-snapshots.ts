/**
 * Script de migración para datos existentes de AUM
 *
 * Identifica archivos master vs monthly por nombre y crea snapshots iniciales
 * desde aum_import_rows existentes.
 *
 * AI_DECISION: Script de migración para preservar datos históricos
 * Justificación: Migra datos existentes al nuevo esquema de snapshots mensuales
 * Impacto: Permite preservar historial de datos ya importados
 *
 * NOTE: Las funciones detectAumFileType, extractReportPeriod y detectAumFileMetadata
 * están duplicadas de apps/api/src/utils/aum-file-detection.ts.
 * La versión canónica está en el API. Si necesitas modificar la lógica,
 * actualiza primero apps/api/src/utils/aum-file-detection.ts y luego sincroniza aquí.
 * Esta duplicación existe porque packages/db no puede depender de apps/api.
 */

import { db, aumImportFiles, aumImportRows, aumMonthlySnapshots } from './index';
import { sql, eq } from 'drizzle-orm';

/**
 * Detecta el tipo de archivo AUM basado en el nombre
 * @see apps/api/src/utils/aum-file-detection.ts for canonical implementation
 */
function detectAumFileType(filename: string): 'master' | 'monthly' {
  const normalized = filename.toLowerCase();

  if (normalized.includes('balanz cactus') && normalized.includes('2025')) {
    return 'master';
  }

  if (normalized.includes('reportecluster') || normalized.includes('cluster')) {
    return 'monthly';
  }

  return 'monthly';
}

/**
 * Extrae mes y año del nombre del archivo o usa fecha actual
 * @see apps/api/src/utils/aum-file-detection.ts for canonical implementation
 */
function extractReportPeriod(
  filename: string,
  fileType: 'master' | 'monthly'
): { reportMonth: number; reportYear: number } | null {
  if (fileType === 'master') {
    return null;
  }

  const monthYearPatterns = [/(\d{4})[_-](\d{1,2})/, /(\d{1,2})[_-](\d{4})/, /(\d{4})(\d{2})/];

  for (const pattern of monthYearPatterns) {
    const match = filename.match(pattern);
    if (match) {
      let year: number;
      let month: number;

      if (pattern === monthYearPatterns[2]) {
        year = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
      } else {
        const first = parseInt(match[1], 10);
        const second = parseInt(match[2], 10);

        if (first >= 2000) {
          year = first;
          month = second;
        } else if (second >= 2000) {
          year = second;
          month = first;
        } else {
          year = first >= 100 ? first : second;
          month = first >= 100 ? second : first;
        }
      }

      if (month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
        return { reportMonth: month, reportYear: year };
      }
    }
  }

  const now = new Date();
  return {
    reportMonth: now.getMonth() + 1,
    reportYear: now.getFullYear(),
  };
}

/**
 * Detecta tipo de archivo y extrae período
 * @see apps/api/src/utils/aum-file-detection.ts for canonical implementation
 */
function detectAumFileMetadata(filename: string): {
  fileType: 'master' | 'monthly';
  reportMonth: number | null;
  reportYear: number | null;
} {
  const fileType = detectAumFileType(filename);
  const period = extractReportPeriod(filename, fileType);

  return {
    fileType,
    reportMonth: period?.reportMonth ?? null,
    reportYear: period?.reportYear ?? null,
  };
}

/**
 * Migra datos existentes de AUM a snapshots mensuales
 */
export async function migrateExistingAumData(): Promise<{
  filesUpdated: number;
  snapshotsCreated: number;
  errors: number;
}> {
  const stats = {
    filesUpdated: 0,
    snapshotsCreated: 0,
    errors: 0,
  };

  const dbi = db();

  try {
    // 1. Actualizar metadata de archivos existentes (fileType, reportMonth, reportYear)
    console.log('→ Actualizando metadata...');

    const existingFiles = await dbi
      .select()
      .from(aumImportFiles)
      .where(sql`file_type IS NULL OR report_month IS NULL OR report_year IS NULL`);

    for (const file of existingFiles) {
      try {
        const metadata = detectAumFileMetadata(file.originalFilename);

        await dbi
          .update(aumImportFiles)
          .set({
            fileType: metadata.fileType,
            reportMonth: metadata.reportMonth,
            reportYear: metadata.reportYear,
          })
          .where(eq(aumImportFiles.id, file.id));

        stats.filesUpdated++;
      } catch (error) {
        console.error(
          `✗ Error archivo ${file.id}:`,
          error instanceof Error ? error.message : String(error)
        );
        stats.errors++;
      }
    }

    // 2. Crear snapshots mensuales desde aum_import_rows existentes
    console.log('→ Creando snapshots...');

    // Obtener archivos mensuales con filas
    const monthlyFiles = await dbi.execute(sql`
      SELECT DISTINCT f.id, f.report_month, f.report_year
      FROM aum_import_files f
      INNER JOIN aum_import_rows r ON f.id = r.file_id
      WHERE f.file_type = 'monthly'
        AND f.report_month IS NOT NULL
        AND f.report_year IS NOT NULL
    `);

    for (const fileRow of monthlyFiles.rows || []) {
      const fileId = fileRow.id as string;
      const reportMonth = fileRow.report_month as number;
      const reportYear = fileRow.report_year as number;

      try {
        // Verificar si ya existen snapshots para este archivo
        const existingSnapshots = await dbi.execute(sql`
          SELECT COUNT(*) as count
          FROM aum_monthly_snapshots
          WHERE file_id = ${fileId}
        `);

        const count = Number(
          (existingSnapshots.rows?.[0] as { count: string | number } | undefined)?.count || 0
        );

        if (count > 0) {
          continue; // Snapshots ya existen, saltar
        }

        // Obtener filas del archivo
        const rows = await dbi
          .select({
            accountNumber: aumImportRows.accountNumber,
            idCuenta: aumImportRows.idCuenta,
            aumDollars: aumImportRows.aumDollars,
            bolsaArg: aumImportRows.bolsaArg,
            fondosArg: aumImportRows.fondosArg,
            bolsaBci: aumImportRows.bolsaBci,
            pesos: aumImportRows.pesos,
            mep: aumImportRows.mep,
            cable: aumImportRows.cable,
            cv7000: aumImportRows.cv7000,
          })
          .from(aumImportRows)
          .where(eq(aumImportRows.fileId, fileId));

        // Filtrar filas con identificador válido
        const validRows = rows.filter((row) => row.accountNumber || row.idCuenta);

        if (validRows.length === 0) {
          continue; // No hay filas válidas, saltar
        }

        // Crear snapshots en batch
        const batchSize = 100;
        for (let i = 0; i < validRows.length; i += batchSize) {
          const chunk = validRows.slice(i, i + batchSize);

          const snapshotsToInsert = chunk.map((row) => ({
            fileId,
            accountNumber: row.accountNumber,
            idCuenta: row.idCuenta,
            reportMonth,
            reportYear,
            aumDollars: row.aumDollars,
            bolsaArg: row.bolsaArg,
            fondosArg: row.fondosArg,
            bolsaBci: row.bolsaBci,
            pesos: row.pesos,
            mep: row.mep,
            cable: row.cable,
            cv7000: row.cv7000,
          }));

          // Insertar snapshots en batch usando onConflictDoNothing para evitar duplicados
          for (const snapshot of snapshotsToInsert) {
            try {
              await dbi.insert(aumMonthlySnapshots).values(snapshot).onConflictDoNothing();
              stats.snapshotsCreated++;
            } catch (error) {
              // Ignorar errores de duplicados (ya manejados por onConflictDoNothing)
              if (
                !(
                  error instanceof Error &&
                  (error.message.includes('duplicate') || error.message.includes('unique'))
                )
              ) {
                console.error(
                  `✗ Error snapshot ${fileId}:`,
                  error instanceof Error ? error.message : String(error)
                );
                stats.errors++;
              }
            }
          }
        }

        // Snapshots creados (log implícito en stats)
      } catch (error) {
        console.error(
          `✗ Error archivo ${fileId}:`,
          error instanceof Error ? error.message : String(error)
        );
        stats.errors++;
      }
    }

    console.log(
      `✓ Migración completada: ${stats.filesUpdated} archivos, ${stats.snapshotsCreated} snapshots, ${stats.errors} errores`
    );
    return stats;
  } catch (error) {
    console.error('✗ Error en migración:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateExistingAumData()
    .then((stats) => {
      console.log(
        `✓ Finalizado: ${stats.filesUpdated} archivos, ${stats.snapshotsCreated} snapshots`
      );
      process.exit(0);
    })
    .catch((error) => {
      console.error('✗ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
