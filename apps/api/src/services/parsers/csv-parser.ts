/**
 * CSV File Parser for AUM files
 *
 * AI_DECISION: Extraer parsing de CSV a módulo independiente
 * Justificación: Separar responsabilidades, facilitar testing, reutilización
 * Impacto: Código más modular y testeable
 */

import { promises as fs } from 'node:fs';
import type { ParseResult } from '../aum-parser';

/**
 * Parse CSV file to AUM rows
 */
export async function parseCsvFile(filePath: string, originalName: string): Promise<ParseResult> {
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
      const { logger } = await import('../../utils/logger');
      logger.debug({ count: detectedColumns.length }, 'CSV columns detected');
    }

    // Import and use row mapper
    const { mapRowsToAumFormat } = await import('../mappers/row-mapper');
    return await mapRowsToAumFormat(records, originalName);
  } catch (error) {
    return {
      success: false,
      error: 'Unexpected error processing CSV file',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}
