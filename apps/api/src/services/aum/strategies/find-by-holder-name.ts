/**
 * AUM Upsert - Strategy 4: Find by holderName
 *
 * AI_DECISION: Buscar por holderName en dos casos:
 * 1. Cuando la nueva fila no tiene identificadores (solo holderName)
 * 2. Cuando la nueva fila tiene identificadores pero existe una fila antigua sin identificadores
 *
 * Justificación: El archivo monthly puede tener más identificadores que el master.
 *   Por ejemplo, master puede tener solo holderName="Juan" y monthly tiene holderName="Juan" + accountNumber=123.
 *   Necesitamos encontrar la fila del master para actualizarla con los nuevos identificadores.
 *
 * Impacto: Mejor matching entre archivos con diferentes niveles de información
 */

import { db } from '@maatwork/db';
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
 * Search by holderName - lowest priority strategy
 *
 * Two modes:
 * 1. If new row has only holderName: search for existing rows that also only have holderName
 * 2. If new row has identifiers but no match found by other strategies: search for existing rows
 *    that only have holderName (to consolidate rows where monthly has more info than master)
 */
export async function findByHolderName(
  row: AumRowInsert,
  broker: string
): Promise<ExistingRow | null> {
  const dbi = db();

  if (!row.holderName || row.holderName.trim().length === 0) {
    return null;
  }

  const hasIdCuenta = row.idCuenta && row.idCuenta.trim().length > 0;
  const hasAccountNumber = row.accountNumber && row.accountNumber.trim().length > 0;
  const hasIdentifiers = hasIdCuenta || hasAccountNumber;

  try {
    // AI_DECISION: Buscar filas existentes que solo tengan holderName (sin identificadores)
    // Justificación: Si el master tenía solo holderName y el monthly tiene holderName + identificadores,
    //   necesitamos encontrar la fila del master para actualizarla y enriquecerla con los nuevos identificadores.
    // Impacto: Evita duplicados cuando el monthly tiene más información que el master
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

      // Si la nueva fila tiene identificadores y encontramos una fila sin identificadores,
      // logueamos esto como enriquecimiento de datos
      if (hasIdentifiers) {
        logger.debug(
          {
            holderName: row.holderName,
            newAccountNumber: row.accountNumber,
            newIdCuenta: row.idCuenta,
            existingRowId: dbRow.id,
          },
          'AUM findByHolderName: Found row without identifiers to enrich'
        );
      }

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
      'Error searching AUM row by holderName'
    );
  }

  return null;
}
