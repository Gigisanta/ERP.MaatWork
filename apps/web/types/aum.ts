/**
 * Tipos relacionados con AUM (Assets Under Management)
 */

/**
 * Archivo AUM
 */
export interface AumFile {
  id: string;
  broker: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByUserId: string;
  status: string;
  totalParsed?: number;
  totalMatched?: number;
  totalUnmatched?: number;
  totals?: {
    parsed: number;
    matched: number;
    ambiguous: number;
    conflicts: number;
    unmatched: number;
  };
  createdAt: string;
}

/**
 * Fila AUM
 */
export interface AumRow {
  id: string;
  fileId: string;
  accountNumber: string | null;
  holderName: string | null;
  advisorRaw: string | null;
  matchedContactId: string | null;
  matchedUserId: string | null;
  matchStatus: 'matched' | 'ambiguous' | 'unmatched';
  isPreferred: boolean;
  conflictDetected: boolean;
  rowCreatedAt: string;
  file?: AumFile;
  contact?: {
    id: string;
    fullName: string;
    firstName: string;
    lastName: string;
  } | null;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
  raw?: Record<string, unknown>; // Datos raw del parseo (sin estructura conocida)
}

/**
 * Fila duplicada (para resolución)
 */
export interface DuplicateRow {
  id: string;
  fileId: string;
  accountNumber: string; // Required en duplicados
  holderName: string | null;
  advisorRaw: string | null;
  matchedContactId: string | null;
  matchedUserId: string | null;
  matchStatus: 'matched' | 'ambiguous' | 'unmatched';
  isPreferred: boolean;
  conflictDetected: boolean;
  rowCreatedAt: string;
}

/**
 * Row para tabla de historial (extiende AumRow)
 */
export interface Row extends AumRow {
  file: AumFile; // Required en historial
}

/**
 * Resumen de upload de archivo AUM
 */
export interface AumUploadSummary {
  fileId: string;
  totals: {
    parsed: number;
    matched: number;
    ambiguous: number;
    conflicts: number;
    unmatched: number;
  };
}

/**
 * Response de upload AUM
 */
export interface AumUploadResponse {
  ok: boolean;
  fileId: string;
  filename: string;
  totals: {
    parsed: number;
    matched: number;
    ambiguous: number;
    conflicts: number;
    unmatched: number;
  };
}

/**
 * Request para matchear fila AUM
 */
export interface AumMatchRequest {
  rowId: string;
  matchedContactId?: string | null;
  matchedUserId?: string | null;
  isPreferred?: boolean;
}

/**
 * Response de filas AUM
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
 * Response de duplicados AUM
 */
export interface AumDuplicatesResponse {
  ok: boolean;
  accountNumber: string;
  rows: AumRow[];
  hasConflicts: boolean;
}

/**
 * Errores de API con mensajes estructurados
 */
export interface ApiErrorWithMessage {
  message?: string;
  userMessage?: string;
  error?: string;
}

