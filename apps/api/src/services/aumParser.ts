/**
 * AUM File Parser Service
 *
 * AI_DECISION: Extraer lógica de parsing a servicio independiente con Result type
 * Justificación: Separar responsabilidades, eliminar try-catch anidados, mejorar testability
 * Impacto: Código más limpio, mantenible y testeable con manejo de errores explícito
 */

import { extname } from 'node:path';
import { promises as fs } from 'node:fs';
import { resetAumMapperLogging } from '../utils/aum-columns';
import { parseExcelFile } from './parsers/excel-parser';
import { parseCsvFile } from './parsers/csv-parser';

// ==========================================================
// Types
// ==========================================================

export interface ParsedAumRow {
  accountNumber: string | null;
  holderName: string | null;
  idCuenta: string | null;
  advisorRaw: string | null;
  aumDollars: number | null;
  bolsaArg: number | null;
  fondosArg: number | null;
  bolsaBci: number | null;
  pesos: number | null;
  mep: number | null;
  cable: number | null;
  cv7000: number | null;
  raw: Record<string, unknown>;
}

export interface ParseStats {
  totalRows: number;
  validRows: number;
  errorCount: number;
  rowsWithOnlyHolderName: number;
}

export interface ParseResult {
  success: boolean;
  data?: ParsedAumRow[];
  stats?: ParseStats;
  error?: string;
  details?: string;
}

// ==========================================================
// Parser Functions
// ==========================================================

// ==========================================================
// Main Parser Function
// ==========================================================

/**
 * Parse AUM file (Excel or CSV) and return structured rows
 *
 * @param filePath - Path to the file on disk
 * @param originalName - Original filename (for error messages and extension detection)
 * @returns ParseResult with rows or error
 */
export async function parseAumFile(filePath: string, originalName: string): Promise<ParseResult> {
  // AI_DECISION: Resetear flag de logging para cada archivo nuevo
  // Justificación: Permite logging en primera fila de cada archivo parseado
  // Impacto: Mejor debugging sin necesidad de variables globales
  resetAumMapperLogging();

  // Validate file exists
  try {
    await fs.access(filePath);
  } catch {
    return {
      success: false,
      error: 'File not accessible',
      details: `File path: ${filePath}`,
    };
  }

  // Determine file type and parse
  const ext = extname(originalName).toLowerCase();

  if (ext === '.xlsx' || ext === '.xls') {
    return parseExcelFile(filePath, originalName);
  } else if (ext === '.csv') {
    return parseCsvFile(filePath, originalName);
  } else {
    return {
      success: false,
      error: 'Unsupported file type',
      details: `Extension: ${ext}, supported: .xlsx, .xls, .csv`,
    };
  }
}
