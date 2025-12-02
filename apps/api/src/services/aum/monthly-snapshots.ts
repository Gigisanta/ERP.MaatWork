/**
 * AUM Upsert - Monthly Snapshots Functions
 * 
 * AI_DECISION: Batch processing para snapshots mensuales
 * Justificación: Mejora performance al procesar grandes volúmenes de datos
 * Impacto: Reducción de tiempo de procesamiento y mejor manejo de errores
 */

import { db, aumMonthlySnapshots } from '@cactus/db';
import { eq, sql, type SQL } from 'drizzle-orm';
import { AUM_LIMITS } from '../../config/aum-limits';
import { logger } from '../../utils/logger';
import type { AumMonthlySnapshotInsert, MonthlySnapshotUpsertStats, MonthlySnapshotUpsertResult } from './types';

/**
 * Build SQL conditions for finding existing monthly snapshot
 */
function buildSnapshotConditions(snapshot: AumMonthlySnapshotInsert): SQL[] {
  const conditions: SQL[] = [];
  
  if (snapshot.accountNumber) {
    conditions.push(sql`account_number = ${snapshot.accountNumber}`);
  } else {
    conditions.push(sql`account_number IS NULL`);
  }
  
  if (snapshot.idCuenta) {
    conditions.push(sql`id_cuenta = ${snapshot.idCuenta}`);
  } else {
    conditions.push(sql`id_cuenta IS NULL`);
  }
  
  conditions.push(sql`report_month = ${snapshot.reportMonth}`);
  conditions.push(sql`report_year = ${snapshot.reportYear}`);

  return conditions;
}

/**
 * Upsert monthly snapshot for a single row
 * Preserves historical data by creating new snapshot for each month/year
 */
async function upsertSingleMonthlySnapshot(
  snapshot: AumMonthlySnapshotInsert
): Promise<boolean> {
  const dbi = db();

  try {
    const conditions = buildSnapshotConditions(snapshot);

    const existingResult = await dbi.execute(sql`
      SELECT id
      FROM aum_monthly_snapshots
      WHERE ${sql.join(conditions, sql` AND `)}
      LIMIT 1
    `);

    const existing = existingResult.rows?.[0] as { id: string } | undefined;

    if (existing) {
      // Update existing snapshot
      await dbi.update(aumMonthlySnapshots)
        .set({
          aumDollars: snapshot.aumDollars,
          bolsaArg: snapshot.bolsaArg,
          fondosArg: snapshot.fondosArg,
          bolsaBci: snapshot.bolsaBci,
          pesos: snapshot.pesos,
          mep: snapshot.mep,
          cable: snapshot.cable,
          cv7000: snapshot.cv7000,
          fileId: snapshot.fileId,
          updatedAt: new Date()
        })
        .where(eq(aumMonthlySnapshots.id, existing.id));
    } else {
      // Create new snapshot
      await dbi.insert(aumMonthlySnapshots).values({
        fileId: snapshot.fileId,
        accountNumber: snapshot.accountNumber,
        idCuenta: snapshot.idCuenta,
        reportMonth: snapshot.reportMonth,
        reportYear: snapshot.reportYear,
        aumDollars: snapshot.aumDollars,
        bolsaArg: snapshot.bolsaArg,
        fondosArg: snapshot.fondosArg,
        bolsaBci: snapshot.bolsaBci,
        pesos: snapshot.pesos,
        mep: snapshot.mep,
        cable: snapshot.cable,
        cv7000: snapshot.cv7000
      });
    }

    return true;
  } catch (error) {
    logger.warn({ 
      err: error, 
      accountNumber: snapshot.accountNumber,
      idCuenta: snapshot.idCuenta,
      reportMonth: snapshot.reportMonth,
      reportYear: snapshot.reportYear
    }, 'Error upserting monthly snapshot');
    return false;
  }
}

/**
 * Check if snapshot exists in the database
 */
async function checkSnapshotExists(snapshot: AumMonthlySnapshotInsert): Promise<boolean> {
  const dbi = db();
  const conditions = buildSnapshotConditions(snapshot);

  const existingResult = await dbi.execute(sql`
    SELECT id
    FROM aum_monthly_snapshots
    WHERE ${sql.join(conditions, sql` AND `)}
    LIMIT 1
  `);

  return Boolean(existingResult.rows?.[0]);
}

/**
 * Upsert monthly snapshots in batches
 */
export async function upsertAumMonthlySnapshots(
  snapshots: AumMonthlySnapshotInsert[]
): Promise<MonthlySnapshotUpsertResult> {
  const stats: MonthlySnapshotUpsertStats = {
    inserted: 0,
    updated: 0,
    errors: 0
  };

  const batchSize = AUM_LIMITS.BATCH_INSERT_SIZE;

  for (let i = 0; i < snapshots.length; i += batchSize) {
    const chunk = snapshots.slice(i, i + batchSize);

    // Process chunk using Promise.all for parallelization
    await Promise.allSettled(
      chunk.map(async (snapshot) => {
        try {
          const isNew = !(await checkSnapshotExists(snapshot));
          const success = await upsertSingleMonthlySnapshot(snapshot);
          
          if (success) {
            if (isNew) {
              stats.inserted++;
            } else {
              stats.updated++;
            }
          } else {
            stats.errors++;
          }
        } catch (error) {
          stats.errors++;
          logger.warn({ 
            err: error, 
            snapshotIndex: i,
            accountNumber: snapshot.accountNumber,
            reportMonth: snapshot.reportMonth,
            reportYear: snapshot.reportYear
          }, 'Error processing monthly snapshot in batch');
        }
      })
    );

    // Log batch progress only every 10 batches or at the end
    const currentBatch = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(snapshots.length / batchSize);
    const isLastBatch = i + batchSize >= snapshots.length;
    const shouldLog = isLastBatch || currentBatch % 10 === 0;
    
    if (shouldLog) {
      logger.debug({ 
        batch: `${currentBatch}/${totalBatches}`
      }, `Snapshots batch ${currentBatch}/${totalBatches} processed`);
    }
  }

  logger.info({ 
    totalSnapshots: snapshots.length,
    inserted: stats.inserted,
    updated: stats.updated,
    errors: stats.errors
  }, `Snapshots upsert: ${stats.inserted} inserted, ${stats.updated} updated, ${stats.errors} errors`);

  return {
    success: stats.errors === 0 || stats.inserted + stats.updated > 0,
    stats
  };
}


