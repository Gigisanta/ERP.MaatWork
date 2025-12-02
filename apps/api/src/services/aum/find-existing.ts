/**
 * AUM Upsert - Find Existing Row Orchestrator
 *
 * Orchestrates multiple search strategies to find existing AUM rows
 */

import { findByIdCuenta } from './strategies/find-by-id-cuenta';
import { findByReverseLookup } from './strategies/find-by-reverse-lookup';
import { findByAccountNumber } from './strategies/find-by-account-number';
import { findByHolderName } from './strategies/find-by-holder-name';
import type { AumRowInsert, ExistingRow } from './types';

/**
 * Find existing row using multiple strategies in priority order:
 * 1. idCuenta (highest priority)
 * 2. Reverse lookup (id_cuenta = accountNumber)
 * 3. accountNumber (normalized)
 * 4. holderName ONLY (lowest priority, only when new row has no identifiers)
 */
export async function findExistingRow(
  row: AumRowInsert,
  broker: string
): Promise<ExistingRow | null> {
  // Strategy 1: Search by idCuenta (highest priority)
  const byIdCuenta = await findByIdCuenta(row, broker);
  if (byIdCuenta) return byIdCuenta;

  // Strategy 2: Reverse lookup (id_cuenta = accountNumber)
  const byReverseLookup = await findByReverseLookup(row, broker);
  if (byReverseLookup) return byReverseLookup;

  // Strategy 3: Search by accountNumber (normalized)
  const byAccountNumber = await findByAccountNumber(row, broker);
  if (byAccountNumber) return byAccountNumber;

  // Strategy 4: Search by holderName ONLY (lowest priority)
  const byHolderName = await findByHolderName(row, broker);
  if (byHolderName) return byHolderName;

  return null;
}
