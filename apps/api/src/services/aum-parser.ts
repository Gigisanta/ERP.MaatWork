/**
 * AUM Parser Service
 * 
 * Orchestrates parsing of different file types (CSV, Excel) into AUM rows.
 */

import { parseCsvFile } from './parsers/csv-parser';
import { parseExcelFile } from './parsers/excel-parser';
import path from 'node:path';

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

/**
 * Orchestrator to parse AUM file based on extension
 */
export async function parseAumFile(filePath: string, originalName: string): Promise<ParseResult> {
  const extension = path.extname(originalName).toLowerCase();

  if (extension === '.csv') {
    return await parseCsvFile(filePath, originalName);
  }

  if (extension === '.xlsx' || extension === '.xls') {
    return await parseExcelFile(filePath, originalName);
  }

  return {
    success: false,
    error: 'Unsupported file format',
    details: `File extension: ${extension}. Only .csv, .xlsx, and .xls are supported.`,
  };
}






