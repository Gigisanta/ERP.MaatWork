/**
 * Row Mapper for AUM data processing
 *
 * AI_DECISION: Extraer lógica de mapeo de filas a módulo independiente
 * Justificación: Separar responsabilidades, centralizar lógica de transformación
 * Impacto: Código más mantenible y testeable
 */

import { mapAumColumns } from '@/utils/aum-columns';
import { normalizeAccountNumber } from '@/utils/aum/aum-normalization';
import type { ParsedAumRow, ParseResult, ParseStats } from '../aum-parser';

/**
 * Map raw rows (from Excel or CSV) to AUM format
 */
export async function mapRowsToAumFormat(
  rawRows: Array<Record<string, unknown>>,
  filename: string
): Promise<ParseResult> {
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

      // Accept row if it has at least accountNumber OR idCuenta OR holderName
      const isValidRow = hasValidAccountNumber || hasValidIdCuenta || hasValidHolderName;

      if (!isValidRow) {
        // Log first few invalid rows for debugging
        if (errorCount < maxErrorLogs) {
          const { logger } = await import('../../utils/logger');
          logger.debug(
            {
              rowIndex: i,
              hasValidAccountNumber,
              hasValidIdCuenta,
              hasValidHolderName,
              rawRow: JSON.stringify(rawRow).substring(0, 200),
            },
            'Skipping invalid row - no valid identifiers'
          );
        }
        errorCount++;
        continue;
      }

      // Create parsed row
      const parsedRow: ParsedAumRow = {
        accountNumber: hasValidAccountNumber ? normalizeAccountNumber(mapped.accountNumber!) : null,
        holderName: hasValidHolderName ? String(mapped.holderName).trim() : null,
        idCuenta: hasValidIdCuenta ? String(mapped.idCuenta).trim() : null,
        advisorRaw: mapped.advisorRaw,
        aumDollars: mapped.aumDollars,
        bolsaArg: typeof mapped.bolsaArg === 'number' ? mapped.bolsaArg : null,
        fondosArg: typeof mapped.fondosArg === 'number' ? mapped.fondosArg : null,
        bolsaBci: typeof mapped.bolsaBci === 'number' ? mapped.bolsaBci : null,
        pesos: typeof mapped.pesos === 'number' ? mapped.pesos : null,
        mep: typeof mapped.mep === 'number' ? mapped.mep : null,
        cable: typeof mapped.cable === 'number' ? mapped.cable : null,
        cv7000: typeof mapped.cv7000 === 'number' ? mapped.cv7000 : null,
        raw: rawRow,
      };

      rows.push(parsedRow);
    } catch (error) {
      // Log first few errors for debugging
      if (errorCount < maxErrorLogs) {
        const { logger } = await import('../../utils/logger');
        logger.debug(
          {
            rowIndex: i,
            error: error instanceof Error ? error.message : String(error),
            filename,
          },
          'Error processing row'
        );
      }
      errorCount++;
    }
  }

  // Calculate stats
  const validRows = rows.length;
  const totalRows = rawRows.length;
  const rowsWithOnlyHolderName = rows.filter(
    (row) => row.holderName && !row.accountNumber && !row.idCuenta
  ).length;

  const stats: ParseStats = {
    totalRows,
    validRows,
    errorCount,
    rowsWithOnlyHolderName,
  };

  // Log summary
  const { logger } = await import('../../utils/logger');
  logger.info(
    {
      filename,
      validRows,
      totalRows,
    },
    `Parsed ${validRows}/${totalRows} rows`
  );

  return {
    success: true,
    data: rows,
    stats,
  };
}
