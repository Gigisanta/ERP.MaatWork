/**
 * AUM Upsert - Strategy 2: Reverse Lookup (id_cuenta = accountNumber)
 */

import { db } from '@maatwork/db';
import { sql } from 'drizzle-orm';
import { logger } from '../../../utils/logger';
import type { AumRowInsert, AumRowDbResult, ExistingRow } from '../types';

/**
 * Reverse lookup - search where id_cuenta equals our accountNumber
 * Handles cases where CSV1 stored accountNumber in id_cuenta field
 */
export async function findByReverseLookup(
  row: AumRowInsert,
  broker: string
): Promise<ExistingRow | null> {
  const dbi = db();

  const hasIdCuenta = row.idCuenta && row.idCuenta.trim().length > 0;
  const hasAccountNumber = row.accountNumber && row.accountNumber.trim().length > 0;

  if (!hasIdCuenta || !hasAccountNumber || !row.accountNumber) {
    return null;
  }

  try {
    const result = await dbi.execute(sql`
      SELECT r.id, r.file_id, r.account_number, r.holder_name, r.id_cuenta,
             r.matched_contact_id, r.matched_user_id, r.advisor_raw, r.match_status, 
             r.is_preferred, r.is_normalized
      FROM aum_import_rows r
      INNER JOIN aum_import_files f ON r.file_id = f.id
      WHERE r.id_cuenta = ${row.accountNumber}
        AND f.broker = ${broker}
        AND r.file_id != ${row.fileId}
      ORDER BY r.is_normalized DESC, f.created_at DESC, r.created_at DESC
      LIMIT 1
    `);

    if (result.rows && result.rows.length > 0) {
      const dbRow = result.rows[0] as AumRowDbResult;
      return {
        id: dbRow.id,
        fileId: dbRow.file_id,
        accountNumber: dbRow.account_number,
        holderName: dbRow.holder_name,
        idCuenta: dbRow.id_cuenta,
        matchedContactId: dbRow.matched_contact_id,
        matchedUserId: dbRow.matched_user_id,
        advisorRaw: dbRow.advisor_raw,
        matchStatus: dbRow.match_status,
        isPreferred: dbRow.is_preferred ?? true,
        isNormalized: dbRow.is_normalized ?? false,
      };
    }
  } catch (error) {
    logger.warn(
      { err: error, accountNumber: row.accountNumber, fileId: row.fileId },
      'Error in reverse lookup'
    );
  }

  return null;
}








