/**
 * AUM Upsert - Insert New Row Logic
 */

import { db, aumImportRows } from '@maatwork/db';
import { logger } from '../../utils/logger';
import type { AumRowInsert } from './types';

/**
 * Insert a new AUM row into the database
 */
export async function insertNewRow(row: AumRowInsert): Promise<boolean> {
  const dbi = db();

  try {
    await dbi.insert(aumImportRows).values({
      fileId: row.fileId,
      raw: row.raw,
      accountNumber: row.accountNumber,
      holderName: row.holderName,
      idCuenta: row.idCuenta,
      advisorRaw: row.advisorRaw,
      matchedContactId: row.matchedContactId,
      matchedUserId: row.matchedUserId,
      matchStatus: row.matchStatus,
      isPreferred: row.isPreferred,
      conflictDetected: row.conflictDetected,
      aumDollars: row.aumDollars,
      bolsaArg: row.bolsaArg,
      fondosArg: row.fondosArg,
      bolsaBci: row.bolsaBci,
      pesos: row.pesos,
      mep: row.mep,
      cable: row.cable,
      cv7000: row.cv7000,
    });

    return true;
  } catch (error) {
    logger.warn(
      { err: error, fileId: row.fileId, accountNumber: row.accountNumber },
      'Error inserting AUM row'
    );
    return false;
  }
}








