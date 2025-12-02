/**
 * AUM Upsert - Find Existing Row Orchestrator
 *
 * Orchestrates multiple search strategies to find existing AUM rows
 *
 * AI_DECISION: Siempre intentar búsqueda por holderName como último recurso
 * Justificación: El archivo monthly puede tener más identificadores que el master.
 *   Si no encontramos match por identificadores, necesitamos buscar por holderName
 *   para encontrar filas del master que solo tenían holderName y enriquecerlas.
 * Impacto: Evita duplicados cuando el monthly tiene más información que el master
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
 * 4. holderName (lowest priority - matches rows without identifiers)
 *
 * The holderName strategy now also handles the case where the new row has identifiers
 * but the existing row doesn't (enrichment scenario).
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

  // Strategy 4: Search by holderName (lowest priority)
  // This now handles both:
  // - New rows that only have holderName
  // - New rows with identifiers but matching existing rows that only have holderName (enrichment)
  const byHolderName = await findByHolderName(row, broker);
  if (byHolderName) return byHolderName;

  return null;
}
