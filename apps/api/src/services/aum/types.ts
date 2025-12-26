/**
 * AUM Upsert Service - Shared Types
 * Re-exportados desde @maatwork/types para consistencia
 */

export type {
  AumRowInsert,
  UpsertStats,
  UpsertResult,
  AumMonthlySnapshotInsert,
} from '@maatwork/types';

// Tipos específicos de DB que no están en @maatwork/types
export interface AumRowDbResult {
  id: string;
  file_id: string;
  account_number: string | null;
  holder_name: string | null;
  id_cuenta: string | null;
  matched_contact_id: string | null;
  matched_user_id: string | null;
  advisor_raw: string | null;
  match_status: 'matched' | 'ambiguous' | 'unmatched';
  is_preferred: boolean | null;
  is_normalized: boolean | null;
}

export interface ExistingRow {
  id: string;
  fileId: string;
  accountNumber: string | null;
  holderName: string | null;
  idCuenta: string | null;
  matchedContactId: string | null;
  matchedUserId: string | null;
  advisorRaw: string | null;
  matchStatus: string;
  isPreferred: boolean;
  isNormalized: boolean;
}

export interface MonthlySnapshotUpsertStats {
  inserted: number;
  updated: number;
  errors: number;
}

export interface MonthlySnapshotUpsertResult {
  success: boolean;
  stats: MonthlySnapshotUpsertStats;
  error?: string;
}
