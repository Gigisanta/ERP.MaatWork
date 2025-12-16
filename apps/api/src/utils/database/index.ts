/**
 * Database utilities - named exports for better tree-shaking
 *
 * AI_DECISION: Convert barrel exports to named exports for better tree-shaking
 * Justificación: Barrel exports (export *) import everything even when only one function is needed
 * Impacto: Reduced bundle size and better optimization
 */

// Batch loading utilities
export {
  batchLoadContactTags,
  batchLoadTasks,
  batchLoadNotes,
  batchLoadBrokerAccounts,
  batchLoadPortfolioAssignments,
  batchLoadAllContactRelations,
  type ContactTag,
  type Task,
  type Note,
  type BrokerAccount,
  type PortfolioAssignment,
  type ContactTagWithContactId,
} from './batch-loading';

// Batch validation utilities
export {
  validateBatchIds,
  validateLimit,
  validateOffset,
  validatePeriod,
  sanitizeQueryParam,
  BATCH_LIMITS,
  type BatchValidationResult,
} from './batch-validation';

// Database logging utilities
export {
  createDrizzleLogger,
  loggedQuery,
  loggedTransaction,
  createOperationName,
  getQueryMetrics,
  getSlowQueries,
  getNPlusOneQueries,
  type QueryMetrics,
  type AggregatedQueryMetrics,
} from './db-logger';

// Database transactions utilities
export { transactionWithLogging, type TransactionOptions } from './db-transactions';

// Optimistic locking utilities
export {
  updateWithVersion,
  VersionConflictError,
  isVersionConflictError,
  createVersionConflictResponse,
  type VersionedUpdateResult,
} from './optimistic-locking';
