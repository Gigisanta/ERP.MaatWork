/**
 * AUM File Parser Service
 *
 * AI_DECISION: Extraer lógica de parsing a servicio independiente con Result type
 * Justificación: Separar responsabilidades, eliminar try-catch anidados, mejorar testability
 * Impacto: Código más limpio, mantenible y testeable con manejo de errores explícito
 */

import { extname } from 'node:path';
import { promises as fs } from 'node:fs';
import { mapAumColumns, resetAumMapperLogging } from '../utils/aum-columns';
import { normalizeAccountNumber } from '../utils/aum-normalization';
import { logger } from '../utils/logger';

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

/**
 * Parse Excel file (.xlsx, .xls) to AUM rows
 */
async function parseExcelFile(filePath: string, originalName: string): Promise<ParseResult> {
  try {
    // Dynamic import of xlsx module
    const XLSX = await import('xlsx');
    const xlsxModule = 'default' in XLSX ? XLSX.default : XLSX;

    // Read Excel file
    let workbook;
    try {
      workbook = xlsxModule.readFile(filePath, {
        cellDates: true,
        cellNF: false,
        cellText: false,
      });
    } catch (readError) {
      return {
        success: false,
        error: 'Error reading Excel file',
        details: readError instanceof Error ? readError.message : String(readError),
      };
    }

    // Validate workbook has sheets
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        success: false,
        error: 'Excel file contains no sheets',
        details: `File: ${originalName}`,
      };
    }

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      return {
        success: false,
        error: `Cannot access sheet "${sheetName}"`,
        details: `Available sheets: ${workbook.SheetNames.join(', ')}`,
      };
    }

    // Convert sheet to JSON
    let jsonData: Array<Record<string, unknown>>;
    try {
      jsonData = xlsxModule.utils.sheet_to_json(worksheet, {
        defval: null,
        raw: true,
        dateNF: 'yyyy-mm-dd',
        blankrows: false,
      }) as Array<Record<string, unknown>>;
    } catch (parseError) {
      return {
        success: false,
        error: 'Error parsing Excel sheet',
        details: parseError instanceof Error ? parseError.message : String(parseError),
      };
    }

    if (!jsonData || jsonData.length === 0) {
      return {
        success: false,
        error: 'Excel file contains no data',
        details: `Sheet "${sheetName}" is empty`,
      };
    }

    // Log detected columns for debugging
    if (jsonData.length > 0) {
      const firstRow = jsonData[0];
      const detectedColumns = Object.keys(firstRow);
      logger.debug({ count: detectedColumns.length }, 'Excel columns detected');
    }

    // Map rows
    return mapRowsToAumFormat(jsonData, originalName);
  } catch (error) {
    return {
      success: false,
      error: 'Unexpected error processing Excel file',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Parse CSV file to AUM rows
 */
async function parseCsvFile(filePath: string, originalName: string): Promise<ParseResult> {
  try {
    // Dynamic import of csv-parse module
    const { parse } = await import('csv-parse/sync');

    // Read CSV file
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch (readError) {
      return {
        success: false,
        error: 'Error reading CSV file',
        details: readError instanceof Error ? readError.message : String(readError),
      };
    }

    // Parse CSV
    let records: Array<Record<string, string>>;
    try {
      records = parse(content, {
        columns: true,
        skip_empty_lines: true, // AI_DECISION: Saltar líneas completamente vacías para evitar problemas de mapeo
        trim: true,
        bom: true,
        relax_quotes: true,
        escape: '"',
        quote: '"',
        cast: false,
        skip_records_with_empty_values: false, // Mantener filas con algunos valores vacíos pero no completamente vacías
        // AI_DECISION: Usar relax_column_count para manejar filas con diferente número de columnas
        // Justificación: Algunas filas pueden tener menos columnas que el header, causando desalineación
        // Impacto: Previene que filas incompletas corrompan el mapeo de columnas
        relax_column_count: true,
      }) as Array<Record<string, string>>;
    } catch (parseError) {
      return {
        success: false,
        error: 'Error parsing CSV file',
        details: parseError instanceof Error ? parseError.message : String(parseError),
      };
    }

    if (!records || records.length === 0) {
      return {
        success: false,
        error: 'CSV file contains no data',
        details: `File: ${originalName}`,
      };
    }

    // Log detected columns for debugging
    if (records.length > 0) {
      const firstRecord = records[0];
      const detectedColumns = Object.keys(firstRecord);
      logger.debug({ count: detectedColumns.length }, 'CSV columns detected');
    }

    // Map rows
    return mapRowsToAumFormat(records, originalName);
  } catch (error) {
    return {
      success: false,
      error: 'Unexpected error processing CSV file',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Map raw rows (from Excel or CSV) to AUM format
 */
function mapRowsToAumFormat(
  rawRows: Array<Record<string, unknown>>,
  filename: string
): ParseResult {
  const rows: ParsedAumRow[] = [];
  let errorCount = 0;
  let skippedRows = 0;
  const maxErrorLogs = 5; // Limitar logs de errores a primeras 5 filas

  for (let i = 0; i < rawRows.length; i++) {
    try {
      const rawRow = rawRows[i];

      // Check if row has any data
      const hasData =
        rawRow &&
        typeof rawRow === 'object' &&
        Object.keys(rawRow).length > 0 &&
        Object.values(rawRow).some((v) => v !== null && v !== undefined && v !== '');

      if (!hasData) {
        skippedRows++;
        continue;
      }

      // Map columns using flexible column mapper
      const mapped = mapAumColumns(rawRow);

      // Validate row has useful data
      const hasValidIdCuenta =
        mapped.idCuenta && typeof mapped.idCuenta === 'string' && mapped.idCuenta.trim().length > 0;
      const hasValidAccountNumber =
        mapped.accountNumber &&
        typeof mapped.accountNumber === 'string' &&
        mapped.accountNumber.trim().length > 0;
      const hasValidHolderName =
        mapped.holderName &&
        typeof mapped.holderName === 'string' &&
        mapped.holderName.trim().length > 0;
      const hasValidAdvisor =
        mapped.advisorRaw &&
        typeof mapped.advisorRaw === 'string' &&
        mapped.advisorRaw.trim().length > 0;
      const hasFinancialData =
        mapped.aumDollars !== null ||
        mapped.bolsaArg !== null ||
        mapped.fondosArg !== null ||
        mapped.bolsaBci !== null ||
        mapped.pesos !== null ||
        mapped.mep !== null ||
        mapped.cable !== null ||
        mapped.cv7000 !== null;

      // AI_DECISION: Validar que la fila tenga datos útiles antes de procesarla
      // Justificación: Filas completamente vacías no aportan valor y pueden causar problemas
      // Impacto: Previene procesamiento de filas completamente vacías mientras permite filas con datos parciales
      // Nota: Una fila es válida si tiene al menos: identificador, datos financieros, o nombre del titular
      // Aceptamos TODAS las filas con holderName porque el usuario confirmó que todos los datos están correctos
      const hasUsefulData =
        hasValidIdCuenta || hasValidAccountNumber || hasFinancialData || hasValidHolderName;

      // Rechazar solo filas completamente vacías (sin ningún dato útil)
      if (!hasUsefulData) {
        skippedRows++;
        // Solo loguear primeras 10 para diagnóstico, pero no saturar logs
        if (i < 10) {
          logger.debug(
            {
              rowIndex: i + 1,
              hasIdCuenta: hasValidIdCuenta,
              hasAccountNumber: hasValidAccountNumber,
              hasHolderName: hasValidHolderName,
              hasAdvisor: hasValidAdvisor,
              hasFinancialData,
              holderName: mapped.holderName,
              filename,
            },
            'AUM Parser: Fila rechazada - completamente vacía'
          );
        }
        continue;
      }

      // Normalize account number if present
      const normalizedAccountNumber = mapped.accountNumber
        ? normalizeAccountNumber(mapped.accountNumber)
        : null;

      rows.push({
        accountNumber: normalizedAccountNumber,
        holderName: mapped.holderName,
        idCuenta: mapped.idCuenta,
        advisorRaw: mapped.advisorRaw,
        aumDollars: mapped.aumDollars,
        bolsaArg: mapped.bolsaArg,
        fondosArg: mapped.fondosArg,
        bolsaBci: mapped.bolsaBci,
        pesos: mapped.pesos,
        mep: mapped.mep,
        cable: mapped.cable,
        cv7000: mapped.cv7000,
        raw: rawRow,
      });
    } catch (rowError) {
      errorCount++;
      // Solo logear primeras 5 filas con error para no saturar consola
      if (errorCount <= maxErrorLogs) {
        logger.warn(
          {
            err: rowError,
            rowIndex: i + 1,
            filename,
          },
          'Error processing AUM row'
        );
      }

      // Add row with null values but preserve raw data
      rows.push({
        accountNumber: null,
        holderName: null,
        idCuenta: null,
        advisorRaw: null,
        aumDollars: null,
        bolsaArg: null,
        fondosArg: null,
        bolsaBci: null,
        pesos: null,
        mep: null,
        cable: null,
        cv7000: null,
        raw: rawRows[i] || {},
      });
    }
  }

  if (rows.length === 0) {
    return {
      success: false,
      error: 'No valid rows found in file',
      details: `File: ${filename}, Total rows: ${rawRows.length}, Skipped: ${skippedRows}`,
    };
  }

  // Calculate stats
  const rowsWithOnlyHolderName = rows.filter(
    (r) =>
      r.holderName &&
      r.holderName.trim().length > 0 &&
      (!r.accountNumber || r.accountNumber.trim().length === 0) &&
      (!r.idCuenta || r.idCuenta.trim().length === 0)
  ).length;

  const stats: ParseStats = {
    totalRows: rawRows.length,
    validRows: rows.length,
    errorCount,
    rowsWithOnlyHolderName,
  };

  // Mensaje más conciso y legible
  const errorMsg = errorCount > 0 ? ` (${errorCount} error${errorCount > 1 ? 's' : ''})` : '';
  const skippedMsg = skippedRows > 0 ? `, ${skippedRows} skipped` : '';
  logger.info(
    {
      filename,
      validRows: rows.length,
      totalRows: rawRows.length,
    },
    `Parsed ${rows.length}/${rawRows.length} rows${errorMsg}${skippedMsg}`
  );

  return {
    success: true,
    data: rows,
    stats,
  };
}

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
