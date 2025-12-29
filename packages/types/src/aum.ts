/**
 * Shared types related to AUM (Assets Under Management)
 */

import type { BaseEntity } from './common';

/**
 * AUM row match status
 */
export type AumMatchStatus = 'matched' | 'ambiguous' | 'unmatched';

/**
 * AUM file upload totals
 */
export interface AumTotals {
  parsed: number;
  matched: number;
  ambiguous: number;
  conflicts: number;
  unmatched: number;
  inserts?: number;
  updates?: number;
}

/**
 * AUM File
 */
export interface AumFile extends BaseEntity {
  broker: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByUserId: string;
  status: string;
  totalParsed?: number;
  totalMatched?: number;
  totalUnmatched?: number;
  totals?: AumTotals;
  createdAt: string;
}

/**
 * Basic contact info for AUM
 */
export interface AumContactInfo {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
}

/**
 * Basic user info for AUM
 */
export interface AumUserInfo {
  id: string;
  name: string;
  email: string;
}

/**
 * Base AUM Row
 */
export interface AumRow extends BaseEntity {
  id: string;
  fileId: string;
  accountNumber: string | null;
  holderName: string | null;
  idCuenta?: string | null;
  advisorRaw: string | null;
  advisorNormalized: string | null;
  matchedContactId: string | null;
  matchedUserId: string | null;
  suggestedUserId?: string | null;
  matchStatus: AumMatchStatus;
  isPreferred: boolean;
  conflictDetected: boolean;
  needsConfirmation?: boolean;
  isNormalized?: boolean;
  rowCreatedAt: string;
  rowUpdatedAt?: string;
  isUpdated?: boolean;
  updatedByFile?: {
    id: string;
    name: string;
    createdAt: string;
  };
  // Financial columns
  aumDollars: number | null;
  bolsaArg: number | null;
  fondosArg: number | null;
  bolsaBci: number | null;
  pesos: number | null;
  mep: number | null;
  cable: number | null;
  cv7000: number | null;
  file?: AumFile;
  contact?: AumContactInfo | null;
  user?: AumUserInfo | null;
  raw?: Record<string, unknown>;
}

/**
 * Extended Row with file info (frontend helper)
 */
export interface Row extends AumRow {
  file: AumFile;
}

/**
 * Duplicate AUM row info
 */
export interface DuplicateRow extends Omit<AumRow, 'accountNumber'> {
  accountNumber: string;
}

/**
 * AUM upload summary
 */
export interface AumUploadSummary {
  fileId: string;
  totals: AumTotals;
}

/**
 * AUM manual confirmation info
 */
export interface AumConfirmation {
  rowId: string;
  idCuenta: string | null;
  oldAccountNumber: string | null;
  newAccountNumber: string | null;
  reason: string;
}

/**
 * AUM upload response
 */
export interface AumUploadResponse {
  ok: boolean;
  fileId: string;
  filename: string;
  totals: AumTotals;
  confirmationsRequired?: number;
  confirmations?: AumConfirmation[];
}

/**
 * AUM match request
 */
export interface AumMatchRequest {
  rowId: string;
  matchedContactId?: string | null;
  matchedUserId?: string | null;
  isPreferred?: boolean;
}

/**
 * Paginated AUM rows response
 */
export interface AumRowsResponse {
  rows: AumRow[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * AUM duplicates response
 */
export interface AumDuplicatesResponse {
  ok: boolean;
  accountNumber: string;
  rows: AumRow[];
  hasConflicts: boolean;
}

/**
 * Request to insert AUM row (Backend)
 */
export interface AumRowInsert extends Omit<AumRow, 'id' | 'advisorNormalized' | 'rowCreatedAt' | 'rowUpdatedAt' | 'isUpdated' | 'updatedByFile' | 'file' | 'contact' | 'user' | 'suggestedUserId'> {}

/**
 * Upsert Statistics
 */
export interface UpsertStats {
  inserted: number;
  updated: number;
  errors: number;
  updatedOnlyHolderName: number;
}

/**
 * Upsert Result
 */
export interface UpsertResult {
  success: boolean;
  stats: UpsertStats;
  error?: string;
}

/**
 * Monthly AUM snapshot
 */
export interface AumMonthlySnapshotInsert {
  fileId: string;
  accountNumber: string | null;
  idCuenta: string | null;
  reportMonth: number;
  reportYear: number;
  aumDollars: number | null;
  bolsaArg: number | null;
  fondosArg: number | null;
  bolsaBci: number | null;
  pesos: number | null;
  mep: number | null;
  cable: number | null;
  cv7000: number | null;
}
