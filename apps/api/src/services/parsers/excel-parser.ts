/**
 * Excel File Parser for AUM files
 *
 * AI_DECISION: Migrar de xlsx a exceljs para resolver vulnerabilidades de seguridad
 * Justificación: xlsx tiene vulnerabilidades HIGH sin parche disponible (Prototype Pollution, ReDoS)
 * Impacto: Mejor seguridad, exceljs es mantenido activamente
 */

import type { ParseResult } from '../aum-parser';
import ExcelJS from 'exceljs';

/**
 * Convert ExcelJS worksheet to array of objects (similar to xlsx sheet_to_json)
 */
function worksheetToJson(worksheet: ExcelJS.Worksheet): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  const headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      // First row is headers
      row.eachCell((cell, colNumber) => {
        const value = cell.value;
        headers[colNumber - 1] =
          value !== null && value !== undefined ? String(value) : `Column${colNumber}`;
      });
    } else {
      // Data rows
      const rowData: Record<string, unknown> = {};
      let hasData = false;

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          let value: unknown = cell.value;

          // Handle ExcelJS cell value types
          if (value !== null && typeof value === 'object') {
            // Handle rich text
            if ('richText' in value && Array.isArray((value as { richText: unknown[] }).richText)) {
              value = (value as { richText: Array<{ text: string }> }).richText
                .map((rt) => rt.text)
                .join('');
            }
            // Handle formula results
            else if ('result' in value) {
              value = (value as { result: unknown }).result;
            }
            // Handle hyperlinks
            else if ('text' in value) {
              value = (value as { text: string }).text;
            }
            // Handle dates
            else if (value instanceof Date) {
              // Keep as Date object for now, let mapper handle formatting
            }
          }

          rowData[header] = value;
          if (value !== null && value !== undefined && value !== '') {
            hasData = true;
          }
        }
      });

      // Only add rows that have at least some data
      if (hasData) {
        rows.push(rowData);
      }
    }
  });

  return rows;
}

/**
 * Parse Excel file (.xlsx, .xls) to AUM rows
 */
export async function parseExcelFile(filePath: string, originalName: string): Promise<ParseResult> {
  try {
    const workbook = new ExcelJS.Workbook();

    // Read Excel file
    try {
      await workbook.xlsx.readFile(filePath);
    } catch (readError) {
      return {
        success: false,
        error: 'Error reading Excel file',
        details: readError instanceof Error ? readError.message : String(readError),
      };
    }

    // Validate workbook has sheets
    if (!workbook.worksheets || workbook.worksheets.length === 0) {
      return {
        success: false,
        error: 'Excel file contains no sheets',
        details: `File: ${originalName}`,
      };
    }

    // Get first sheet
    const worksheet = workbook.worksheets[0];
    const sheetName = worksheet.name;

    if (!worksheet) {
      return {
        success: false,
        error: `Cannot access sheet "${sheetName}"`,
        details: `Available sheets: ${workbook.worksheets.map((ws) => ws.name).join(', ')}`,
      };
    }

    // Convert sheet to JSON
    let jsonData: Array<Record<string, unknown>>;
    try {
      jsonData = worksheetToJson(worksheet);
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
