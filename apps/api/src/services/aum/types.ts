/**
 * AUM Upsert Service - Shared Types
 *
 * AI_DECISION: Centralizar tipos para mejor mantenibilidad
 * Justificación: Tipos compartidos entre múltiples módulos de AUM upsert
 * Impacto: Evita duplicación y facilita refactorizaciones futuras
 */

export interface AumRowInsert {
  fileId: string;
  raw: Record<string, unknown>;
  accountNumber: string | null;
  holderName: string | null;
  idCuenta: string | null;
  advisorRaw: string | null;
  matchedContactId: string | null;
  matchedUserId: string | null;
  matchStatus: 'matched' | 'ambiguous' | 'unmatched';
  isPreferred: boolean;
  conflictDetected: boolean;
  aumDollars: number | null;
  bolsaArg: number | null;
  fondosArg: number | null;
  bolsaBci: number | null;
  pesos: number | null;
  mep: number | null;
  cable: number | null;
  cv7000: number | null;
}

/**
 * Tipo para filas devueltas por queries SQL directas en aumUpsert
 */
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

export interface UpsertStats {
  inserted: number;
  updated: number;
  errors: number;
  updatedOnlyHolderName: number;
}

export interface UpsertResult {
  success: boolean;
  stats: UpsertStats;
  error?: string;
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

// Monthly Snapshots Types

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



























