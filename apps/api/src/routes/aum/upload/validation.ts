/**
 * Validación post-parseo para AUM Upload
 *
 * AI_DECISION: Extraer lógica de validación a módulo separado
 * Justificación: La validación de filas parseadas es compleja y merece su propio módulo
 * Impacto: Código más legible y testeable
 */

import type { ValidationStats } from './types';

// Type for parsed row from AUM parser
interface ParsedRow {
  idCuenta?: string | null;
  accountNumber?: string | null;
  holderName?: string | null;
  advisorRaw?: string | null;
  aumDollars?: number | null;
  bolsaArg?: number | null;
  fondosArg?: number | null;
  bolsaBci?: number | null;
  pesos?: number | null;
  mep?: number | null;
  cable?: number | null;
  cv7000?: number | null;
}

interface ValidationResult {
  stats: ValidationStats;
  errors: string[];
  warnings: string[];
}

/**
 * Valida las filas parseadas y genera estadísticas
 */
export function validateParsedRows(parsedRows: ParsedRow[]): ValidationResult {
  const stats: ValidationStats = {
    rowsWithIdCuenta: 0,
    rowsWithComitente: 0,
    rowsWithHolderName: 0,
    rowsWithAdvisor: 0,
    rowsWithFinancialData: 0,
    rowsWithInvalidFinancialData: 0,
    rowsMissingIdentifiers: 0,
  };

  const errors: string[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < parsedRows.length; i++) {
    const row = parsedRows[i];

    // Contar campos presentes
    if (row.idCuenta) stats.rowsWithIdCuenta++;
    if (row.accountNumber) stats.rowsWithComitente++;
    if (row.holderName) stats.rowsWithHolderName++;
    if (row.advisorRaw) stats.rowsWithAdvisor++;

    // Validar que tenga al menos un identificador
    if (!row.idCuenta && !row.accountNumber) {
      stats.rowsMissingIdentifiers++;
      if (i < 10) {
        // Solo reportar primeros 10 para no saturar logs
        warnings.push(`Fila ${i + 1}: Sin identificador (idCuenta o comitente)`);
      }
    }

    // Validar valores financieros
    const financialFields = [
      { name: 'aumDollars', value: row.aumDollars },
      { name: 'bolsaArg', value: row.bolsaArg },
      { name: 'fondosArg', value: row.fondosArg },
      { name: 'bolsaBci', value: row.bolsaBci },
      { name: 'pesos', value: row.pesos },
      { name: 'mep', value: row.mep },
      { name: 'cable', value: row.cable },
      { name: 'cv7000', value: row.cv7000 },
    ];

    let hasFinancialData = false;
    for (const field of financialFields) {
      if (field.value !== null && field.value !== undefined) {
        hasFinancialData = true;
        // Validar que sea un número válido (no NaN, no Infinity)
        if (typeof field.value === 'number' && (!isFinite(field.value) || isNaN(field.value))) {
          stats.rowsWithInvalidFinancialData++;
          if (stats.rowsWithInvalidFinancialData <= 10) {
            errors.push(`Fila ${i + 1}: Valor inválido en ${field.name}: ${field.value}`);
          }
        }
      }
    }

    if (hasFinancialData) {
      stats.rowsWithFinancialData++;
    }
  }

  return { stats, errors, warnings };
}

/**
 * Calcula porcentajes de validación para logging
 */
export function calculateValidationPercentages(
  stats: ValidationStats,
  totalRows: number
): { pctWithIdentifiers: number; pctWithFinancialData: number } {
  // AI_DECISION: Calcular porcentaje de filas con al menos un identificador, no la suma de ambos
  // Justificación: Una fila puede tener ambos identificadores, sumarlos daría porcentajes >100%
  // Impacto: Los porcentajes de validación ahora reflejan correctamente el porcentaje de filas con identificadores
  const rowsWithAtLeastOneIdentifier = totalRows - stats.rowsMissingIdentifiers;
  const pctWithIdentifiers =
    totalRows > 0 ? Math.round((rowsWithAtLeastOneIdentifier / totalRows) * 100) : 0;
  const pctWithFinancialData =
    totalRows > 0 ? Math.round((stats.rowsWithFinancialData / totalRows) * 100) : 0;

  return { pctWithIdentifiers, pctWithFinancialData };
}
