/**
 * Types para AUM Upload
 *
 * AI_DECISION: Extraer tipos a archivo separado
 * Justificación: Mejora la organización y permite reutilización de tipos
 * Impacto: Código más modular y mantenible
 */

import type { InferSelectModel } from 'drizzle-orm';
import { aumImportRows } from '@cactus/db/schema';

// Type for AUM import row from Drizzle schema
export type AumImportRow = InferSelectModel<typeof aumImportRows>;

// Validation statistics for parsed rows
export interface ValidationStats {
  rowsWithIdCuenta: number;
  rowsWithComitente: number;
  rowsWithHolderName: number;
  rowsWithAdvisor: number;
  rowsWithFinancialData: number;
  rowsWithInvalidFinancialData: number;
  rowsMissingIdentifiers: number;
  // AI_DECISION: Nuevos campos para detectar problemas adicionales en los datos
  // Justificación: Permite identificar y reportar errores de formato que antes pasaban desapercibidos
  // Impacto: Mayor robustez en la validación de datos AUM
  rowsWithCorruptedAdvisor?: number;
  rowsWithNegativeAum?: number;
}

// Totals from database query
export interface TotalsRow {
  total?: number | string;
  matched?: number | string;
  ambiguous?: number | string;
  conflicts?: number | string;
}

// Contact result from database
export interface ContactResult {
  id: string;
  full_name: string;
}

// Upload response data
export interface UploadResponse {
  ok: boolean;
  fileId: string;
  filename: string;
  fileType: 'master' | 'monthly';
  reportMonth: number | null;
  reportYear: number | null;
  totals: {
    parsed: number;
    matched: number;
    ambiguous: number;
    conflicts: number;
    unmatched: number;
    inserts: number;
    updates: number;
    monthlySnapshots: {
      inserted: number;
      updated: number;
      errors: number;
    } | null;
  };
}
