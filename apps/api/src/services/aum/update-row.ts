/**
 * AUM Upsert - Update Existing Row Logic
 * 
 * AI_DECISION: Preservar datos de filas normalizadas durante actualizaciones
 * Justificación: Las filas normalizadas fueron completadas manualmente y deben preservarse
 * Impacto: Mantiene la integridad de asignaciones manuales de asesores
 */

import { db, aumImportRows } from '@cactus/db';
import { eq, sql, type SQL } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import type { AumRowInsert, ExistingRow } from './types';

/**
 * Determine if advisorRaw should be considered valid (non-empty string)
 */
function hasValidAdvisorRaw(value: string | null | undefined): boolean {
  return value !== null &&
    value !== undefined &&
    typeof value === 'string' &&
    value.trim().length > 0;
}

/**
 * Calculate preserved advisor raw based on priority rules:
 * 1. If existing row is normalized → preserve its advisor always
 * 2. If existing row is NOT normalized → use new row's advisor if exists
 * 3. If neither has advisor → maintain null
 */
function calculatePreservedAdvisorRaw(
  existingRow: ExistingRow,
  newRow: AumRowInsert
): string | null {
  const hasAdvisorInNew = hasValidAdvisorRaw(newRow.advisorRaw);
  const hasAdvisorInExisting = hasValidAdvisorRaw(existingRow.advisorRaw);

  if (existingRow.isNormalized && hasAdvisorInExisting) {
    return existingRow.advisorRaw;
  }
  if (hasAdvisorInNew) {
    return newRow.advisorRaw;
  }
  if (hasAdvisorInExisting) {
    return existingRow.advisorRaw;
  }
  return null;
}

/**
 * Calculate preserved matchedUserId based on priority rules
 */
function calculatePreservedMatchedUserId(
  existingRow: ExistingRow,
  newRow: AumRowInsert
): string | null {
  if (existingRow.isNormalized && existingRow.matchedUserId) {
    return existingRow.matchedUserId;
  }
  return existingRow.matchedUserId || newRow.matchedUserId || null;
}

/**
 * Unset preferred flag on duplicate rows for the same account
 */
async function unsetPreferredOnDuplicates(
  existingRow: ExistingRow,
  newRow: AumRowInsert,
  broker: string
): Promise<void> {
  const dbi = db();
  const conditions: SQL[] = [];

  if (newRow.accountNumber) {
    conditions.push(sql`r.account_number = ${newRow.accountNumber}`);
  }
  if (newRow.idCuenta) {
    conditions.push(sql`r.id_cuenta = ${newRow.idCuenta}`);
  }

  if (conditions.length === 0) return;

  try {
    // AI_DECISION: Solo marcar como no preferred las filas que realmente son duplicados
    // Justificación: No queremos marcar como no preferred filas que son únicas pero comparten algún identificador
    // Impacto: Preserva el flag preferred en filas que no son realmente duplicados
    await dbi.execute(sql`
      UPDATE aum_import_rows r
      SET is_preferred = false
      FROM aum_import_files f
      WHERE r.file_id = f.id
        AND f.broker = ${broker}
        AND r.id != ${existingRow.id}
        AND r.is_preferred = true
        AND (${sql.join(conditions, sql` OR `)})
    `);
  } catch (dedupError) {
    logger.warn({ err: dedupError, rowId: existingRow.id, fileId: newRow.fileId }, 'Error unsetting preferred flag on duplicate rows');
  }
}

/**
 * Update an existing AUM row while preserving important data
 * 
 * @param existingRow - Existing row in the database
 * @param newRow - New row with updated data
 * @param broker - Broker for queries
 * @returns true if update was successful, false otherwise
 */
export async function updateExistingRow(
  existingRow: ExistingRow,
  newRow: AumRowInsert,
  broker: string
): Promise<boolean> {
  const dbi = db();

  // Preserve matches if new row doesn't have them
  const preservedMatchedContactId = existingRow.matchedContactId || newRow.matchedContactId;
  const preservedAdvisorRaw = calculatePreservedAdvisorRaw(existingRow, newRow);
  const preservedMatchedUserId = calculatePreservedMatchedUserId(existingRow, newRow);
  
  // Once normalized, always normalized
  const preservedIsNormalized = existingRow.isNormalized;

  // AI_DECISION: Preservar isPreferred de la fila existente si el nuevo row tiene conflictos
  // Justificación: Si una fila ya era preferred y el nuevo row tiene conflictos, no debería perder el flag preferred
  // Impacto: Mantiene las filas preferred visibles incluso después de actualizaciones con conflictos
  const preservedIsPreferred = newRow.conflictDetected && existingRow.isPreferred
    ? existingRow.isPreferred
    : newRow.isPreferred;

  try {
    await dbi.update(aumImportRows)
      .set({
        fileId: newRow.fileId,
        holderName: newRow.holderName,
        accountNumber: newRow.accountNumber,
        idCuenta: newRow.idCuenta,
        advisorRaw: preservedAdvisorRaw,
        matchedContactId: preservedMatchedContactId,
        matchedUserId: preservedMatchedUserId,
        matchStatus: preservedMatchedContactId ? 'matched' : 'unmatched',
        isPreferred: preservedIsPreferred,
        conflictDetected: newRow.conflictDetected,
        isNormalized: preservedIsNormalized,
        aumDollars: newRow.aumDollars,
        bolsaArg: newRow.bolsaArg,
        fondosArg: newRow.fondosArg,
        bolsaBci: newRow.bolsaBci,
        pesos: newRow.pesos,
        mep: newRow.mep,
        cable: newRow.cable,
        cv7000: newRow.cv7000,
        raw: newRow.raw,
        updatedAt: new Date()
      })
      .where(eq(aumImportRows.id, existingRow.id));

    // If this row is being set as preferred, unset other rows with same identifier
    if (newRow.isPreferred) {
      await unsetPreferredOnDuplicates(existingRow, newRow, broker);
    }

    return true;
  } catch (error) {
    logger.warn({ err: error, rowId: existingRow.id, fileId: newRow.fileId }, 'Error updating AUM row');
    return false;
  }
}


