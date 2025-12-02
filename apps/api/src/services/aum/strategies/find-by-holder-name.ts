/**
 * AUM Upsert - Strategy 4: Find by holderName ONLY
 *
 * AI_DECISION: Buscar por holderName solo cuando la nueva fila no tiene identificadores
 * Justificación: Si la nueva fila tiene accountNumber o idCuenta, debe buscar por esos identificadores primero
 * Impacto: Evita que filas únicas con accountNumber nuevo se actualicen incorrectamente por coincidencia de holderName
 */

import { db } from '@cactus/db';
import { sql } from 'drizzle-orm';
import { logger } from '../../../utils/logger';
import type { AumRowInsert, AumRowDbResult, ExistingRow } from '../types';

/**
 * Check if row has only holderName (no accountNumber, no idCuenta, no advisorRaw)
 */
export function hasOnlyHolderName(row: AumRowInsert): boolean {
  const hasIdCuenta = row.idCuenta && row.idCuenta.trim().length > 0;
  const hasAccountNumber = row.accountNumber && row.accountNumber.trim().length > 0;

  return Boolean(
    row.holderName &&
      row.holderName.trim().length > 0 &&
      !hasIdCuenta &&
      !hasAccountNumber &&
      (!row.advisorRaw || row.advisorRaw.trim().length === 0)
  );
}

/**
 * Search by holderName ONLY - lowest priority strategy
 * Only used when the new row doesn't have accountNumber or idCuenta
 * Searches for existing rows that also only have holderName
 */
export async function findByHolderName(
  row: AumRowInsert,
  broker: string
): Promise<ExistingRow | null> {
  const dbi = db();

  if (!hasOnlyHolderName(row) || !row.holderName) {
    return null;
  }

  try {
    // Search for rows that only have holderName (no accountNumber or idCuenta)
    // This covers the case where CSV1 only had holderName and CSV2 also only has holderName
    const result = await dbi.execute(sql`
      SELECT r.id, r.file_id, r.account_number, r.holder_name, r.id_cuenta,
             r.matched_contact_id, r.matched_user_id, r.advisor_raw, r.match_status, 
             r.is_preferred, r.is_normalized
      FROM aum_import_rows r
      INNER JOIN aum_import_files f ON r.file_id = f.id
      WHERE LOWER(TRIM(r.holder_name)) = LOWER(TRIM(${row.holderName}))
        AND (r.account_number IS NULL OR r.account_number = '')
        AND (r.id_cuenta IS NULL OR r.id_cuenta = '')
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
      { err: error, holderName: row.holderName, fileId: row.fileId },
      'Error searching AUM row by holderName only'
    );
  }

  return null;
}
