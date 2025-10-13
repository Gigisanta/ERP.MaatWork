/**
 * Reglas de validación y calidad de datos
 * Implementa STORY 7 - KAN-128
 */

import type { ClusterCuentasValidRow } from '../parsers/cluster-cuentas';
import type { ComisionesValidRow } from '../parsers/comisiones';

/**
 * Resultado de una validación
 */
export interface ValidationResult {
  valid: boolean;
  level: 'error' | 'warning';
  rule: string;
  message: string;
  context?: Record<string, any>;
}

/**
 * Validaciones duras (bloquean el proceso)
 */

/**
 * Valida que comitente/cuotapartista sean enteros válidos
 */
export function validateClientIds(
  comitente: number | null,
  cuotapartista: number | null,
  rowNumber: number
): ValidationResult | null {
  if (comitente === null || !Number.isInteger(comitente)) {
    return {
      valid: false,
      level: 'error',
      rule: 'HARD_001_COMITENTE_INVALID',
      message: `Fila ${rowNumber}: comitente debe ser un entero válido`,
      context: { comitente, rowNumber }
    };
  }
  
  if (cuotapartista === null || !Number.isInteger(cuotapartista)) {
    return {
      valid: false,
      level: 'error',
      rule: 'HARD_002_CUOTAPARTISTA_INVALID',
      message: `Fila ${rowNumber}: cuotapartista debe ser un entero válido`,
      context: { cuotapartista, rowNumber }
    };
  }
  
  return null; // Valid
}

/**
 * Valida que ComisionDolarizada sea >= 0
 */
export function validateCommissionAmount(
  comisionDolarizada: number | null,
  rowNumber: number
): ValidationResult | null {
  if (comisionDolarizada === null || comisionDolarizada < 0) {
    return {
      valid: false,
      level: 'error',
      rule: 'HARD_003_COMISION_NEGATIVE',
      message: `Fila ${rowNumber}: ComisionDolarizada debe ser >= 0`,
      context: { comisionDolarizada, rowNumber }
    };
  }
  
  return null;
}

/**
 * Valida que fechas sean válidas
 */
export function validateDate(
  date: Date | null,
  fieldName: string,
  rowNumber: number
): ValidationResult | null {
  if (!date || isNaN(date.getTime())) {
    return {
      valid: false,
      level: 'error',
      rule: 'HARD_004_DATE_INVALID',
      message: `Fila ${rowNumber}: ${fieldName} no es una fecha válida`,
      context: { date, fieldName, rowNumber }
    };
  }
  
  return null;
}

/**
 * Validaciones blandas (generan alertas pero no bloquean)
 */

/**
 * Valida consistencia monetaria ComisionPesificada vs ComisionDolarizada
 */
export function validateMonetaryConsistency(
  row: ComisionesValidRow,
  rowNumber: number
): ValidationResult | null {
  if (
    row.comisionPesificada !== null &&
    row.cotizacionDolar !== null &&
    row.cotizacionDolar > 0
  ) {
    const calculated = row.comisionPesificada / row.cotizacionDolar;
    const diff = Math.abs(calculated - row.comisionDolarizada);
    const diffPct = (diff / row.comisionDolarizada) * 100;
    
    if (diffPct > 1) {
      return {
        valid: true, // No bloquea
        level: 'warning',
        rule: 'SOFT_001_MONETARY_INCONSISTENCY',
        message: `Fila ${rowNumber}: Diferencia entre ComisionDolarizada directa (${row.comisionDolarizada.toFixed(2)}) y calculada (${calculated.toFixed(2)}) > 1%`,
        context: {
          direct: row.comisionDolarizada,
          calculated,
          diffPct,
          rowNumber
        }
      };
    }
  }
  
  return null;
}

/**
 * Valida que cliente activo = 0 pero tiene comisiones recientes
 */
export function validateInactiveClientWithCommissions(
  clientActive: boolean | null,
  hasRecentCommissions: boolean,
  clientId: string
): ValidationResult | null {
  if (clientActive === false && hasRecentCommissions) {
    return {
      valid: true,
      level: 'warning',
      rule: 'SOFT_002_INACTIVE_WITH_COMMISSIONS',
      message: `Cliente ${clientId} marcado como inactivo pero tiene comisiones recientes`,
      context: { clientId, clientActive, hasRecentCommissions }
    };
  }
  
  return null;
}

/**
 * Valida AUM con breakdowns
 */
export function validateAumBreakdown(
  row: ClusterCuentasValidRow,
  rowNumber: number
): ValidationResult | null {
  const sum = (row.bolsaArg || 0) +
              (row.fondosArg || 0) +
              (row.bolsaBci || 0) +
              (row.pesos || 0) +
              (row.mep || 0) +
              (row.cable || 0) +
              (row.cv7000 || 0) +
              (row.cv10000 || 0);
  
  const diff = Math.abs(row.aumEnDolares - sum);
  const tolerance = 0.01;
  
  if (diff > tolerance) {
    return {
      valid: false,
      level: 'error',
      rule: 'HARD_005_AUM_BREAKDOWN_MISMATCH',
      message: `Fila ${rowNumber}: Suma de breakdowns (${sum.toFixed(2)}) no coincide con AUM (${row.aumEnDolares.toFixed(2)}) ±${tolerance}`,
      context: {
        aumTotal: row.aumEnDolares,
        sumBreakdowns: sum,
        diff,
        tolerance,
        rowNumber
      }
    };
  }
  
  return null;
}

/**
 * Colector de métricas de validación
 */
export class ValidationCollector {
  private errors: ValidationResult[] = [];
  private warnings: ValidationResult[] = [];
  
  add(result: ValidationResult | null) {
    if (!result) return;
    
    if (result.level === 'error') {
      this.errors.push(result);
    } else {
      this.warnings.push(result);
    }
  }
  
  hasErrors(): boolean {
    return this.errors.length > 0;
  }
  
  getErrors(): ValidationResult[] {
    return this.errors;
  }
  
  getWarnings(): ValidationResult[] {
    return this.warnings;
  }
  
  getStats() {
    const errorsByRule = this.errors.reduce((acc, e) => {
      acc[e.rule] = (acc[e.rule] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const warningsByRule = this.warnings.reduce((acc, w) => {
      acc[w.rule] = (acc[w.rule] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalErrors: this.errors.length,
      totalWarnings: this.warnings.length,
      errorsByRule,
      warningsByRule
    };
  }
  
  toJSON() {
    return {
      errors: this.errors,
      warnings: this.warnings,
      stats: this.getStats()
    };
  }
}




