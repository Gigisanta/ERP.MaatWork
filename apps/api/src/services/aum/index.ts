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
  
  
  
  
  AumMonthlySnapshotInsert,
  
  
} from './types';

// Main functions
export { upsertAumRows } from './upsert';
;
;
;
export { applyAdvisorAccountMapping } from './advisor-mapping';
export { upsertAumMonthlySnapshots } from './monthly-snapshots';
export {
  matchContactByAccountNumber,
  matchContactByHolderName,
  
  
  
  
  
  
  reprocessUnmatchedRowsForContact,
  
  
  matchAdvisor,
} from './matcher';

// Helpers
export { detectAccountNumberChange } from './helpers';

// Strategies (for advanced usage/testing)
;



