/**
 * Excel File Parser for AUM files
 *
 * AI_DECISION: Extraer parsing de Excel a módulo independiente
 * Justificación: Separar responsabilidades, facilitar testing, reutilización
 * Impacto: Código más modular y testeable
 */

import { promises as fs } from 'node:fs';
import type { ParseResult } from '../aumParser';

/**
 * Parse Excel file (.xlsx, .xls) to AUM rows
 */
export async function parseExcelFile(filePath: string, originalName: string): Promise<ParseResult> {
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
      const { logger } = await import('../../utils/logger');
      logger.debug({ count: detectedColumns.length }, 'Excel columns detected');
    }

    // Import and use row mapper
    const { mapRowsToAumFormat } = await import('../mappers/row-mapper');
    return await mapRowsToAumFormat(jsonData, originalName);
  } catch (error) {
    return {
      success: false,
      error: 'Unexpected error processing Excel file',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}
