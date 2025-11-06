/**
 * Tipos relacionados con AUM (Assets Under Management)
 */

import type { BaseEntity, TimestampedEntity } from './common';

/**
 * Estado de match de fila AUM
 */
export type AumMatchStatus = 'matched' | 'ambiguous' | 'unmatched';

/**
 * Totales de upload de archivo AUM
 */
export interface AumTotals {
  parsed: number;
  matched: number;
  ambiguous: number;
  conflicts: number;
  unmatched: number;
}

/**
 * Archivo AUM - extiende BaseEntity (solo createdAt)
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
 * Información básica de contacto para AUM
 */
export interface AumContactInfo {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
}

/**
 * Información básica de usuario para AUM
 */
export interface AumUserInfo {
  id: string;
  name: string;
  email: string;
}

/**
 * Fila AUM base - usando intersection type
 */
export interface AumRow extends BaseEntity {
  fileId: string;
  accountNumber: string | null;
  holderName: string | null;
  advisorRaw: string | null;
  matchedContactId: string | null;
  matchedUserId: string | null;
  suggestedUserId?: string | null;
  matchStatus: AumMatchStatus;
  isPreferred: boolean;
  conflictDetected: boolean;
  rowCreatedAt: string;
  // Columnas financieras extendidas
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
  raw?: Record<string, unknown>; // Datos raw del parseo (sin estructura conocida)
}

/**
 * Fila duplicada (para resolución) - usando Pick para campos requeridos
 */
export interface DuplicateRow extends Omit<AumRow, 'accountNumber'> {
  accountNumber: string; // Required en duplicados
}

/**
 * Row para tabla de historial - extiende AumRow
 */
export interface Row extends AumRow {
  file: AumFile; // Required en historial
}

/**
 * Resumen de upload de archivo AUM
 */
export interface AumUploadSummary {
  fileId: string;
  totals: AumTotals;
}

/**
 * Response de upload AUM
 */
export interface AumUploadResponse {
  ok: boolean;
  fileId: string;
  filename: string;
  totals: AumTotals;
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
 * Response de filas AUM con paginación
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
