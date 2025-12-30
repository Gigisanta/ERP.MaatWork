/**
 * Tipos para AUM Rows
 */

export interface CountCacheEntry {
  total: number;
  timestamp: number;
}

export interface AumRowResult {
  id: string;
  file_id: string;
  account_number: string | null;
  holder_name: string | null;
  id_cuenta: string | null;
  advisor_raw: string | null;
  matched_contact_id: string | null;
  matched_user_id: string | null;
  match_status: 'matched' | 'ambiguous' | 'unmatched';
  is_preferred: boolean;
  conflict_detected: boolean;
  needs_confirmation: boolean;
  is_normalized: boolean | null;
  row_created_at: Date;
  row_updated_at: Date;
  current_file_id: string;
  current_file_name: string;
  current_file_created_at: Date;
  file_type: string;
  file_report_month: number | null;
  file_report_year: number | null;
  aum_dollars: string | number | null;
  bolsa_arg: string | number | null;
  fondos_arg: string | number | null;
  bolsa_bci: string | number | null;
  pesos: string | number | null;
  mep: string | number | null;
  cable: string | number | null;
  cv7000: string | number | null;
  broker: string;
  original_filename: string;
  file_status: string;
  file_created_at: Date;
  contact_name: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  user_name: string | null;
  user_email: string | null;
  suggested_user_id: string | null;
}

export interface AumRowResultDuplicate {
  id: string;
  file_id: string;
  account_number: string | null;
  holder_name: string | null;
  advisor_raw: string | null;
  matched_contact_id: string | null;
  matched_user_id: string | null;
  match_status: string;
  is_preferred: boolean;
  conflict_detected: boolean;
  row_created_at: Date | string;
  broker: string;
  original_filename: string;
  file_created_at: Date | string;
  contact_name: string | null;
  user_name: string | null;
}

export interface MonthlySnapshotRow {
  id: string;
  account_number: string | null;
  id_cuenta: string | null;
  report_month: number;
  report_year: number;
  file_id: string;
  file_name: string;
  file_created_at: Date;
  aum_dollars: string | null;
  bolsa_arg: string | null;
  fondos_arg: string | null;
  bolsa_bci: string | null;
  pesos: string | null;
  mep: string | null;
  cable: string | null;
  cv7000: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CacheFilters {
  broker?: string;
  status?: string;
  fileId?: string;
  preferredOnly: boolean;
  search?: string;
  onlyUpdated: boolean;
  reportMonth?: number;
  reportYear?: number;
}
