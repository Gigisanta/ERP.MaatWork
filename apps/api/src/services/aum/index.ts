/**
 * AUM Upsert Service - Barrel Export
 * 
 * Modular AUM upsert service with:
 * - Multiple search strategies (idCuenta, accountNumber, holderName)
 * - Row update/insert logic with preservation rules
 * - Monthly snapshots batch processing
 * - Advisor account mapping
 */

// Types
export type {
  AumRowInsert,
  AumRowDbResult,
  UpsertStats,
  UpsertResult,
  ExistingRow,
  AumMonthlySnapshotInsert,
  MonthlySnapshotUpsertStats,
  MonthlySnapshotUpsertResult
} from './types';

// Main functions
export { upsertAumRows } from './upsert';
export { findExistingRow } from './find-existing';
export { updateExistingRow } from './update-row';
export { insertNewRow } from './insert-row';
export { applyAdvisorAccountMapping } from './advisor-mapping';
export { upsertAumMonthlySnapshots } from './monthly-snapshots';

// Helpers
export { detectAccountNumberChange } from './helpers';

// Strategies (for advanced usage/testing)
export {
  findByIdCuenta,
  findByReverseLookup,
  findByAccountNumber,
  findByHolderName,
  hasOnlyHolderName
} from './strategies';


