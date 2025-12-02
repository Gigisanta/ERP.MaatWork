/**
 * AUM Upsert Service - Helper Functions
 */

import { normalizeAccountNumber } from '../../utils/aum-normalization';

/**
 * Detect if accountNumber (comitente) changed for the same idCuenta
 */
export function detectAccountNumberChange(
  idCuenta: string | null,
  newAccountNumber: string | null,
  existingAccountNumber: string | null
): boolean {
  if (!idCuenta) return false;
  if (!newAccountNumber || !existingAccountNumber) return false;

  const normalizedNew = normalizeAccountNumber(newAccountNumber);
  const normalizedExisting = normalizeAccountNumber(existingAccountNumber);

  return normalizedNew !== normalizedExisting;
}
