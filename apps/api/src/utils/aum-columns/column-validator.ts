/**
 * Validación y conversión de columnas
 *
 * Funciones para validar mapeo de columnas y convertir valores de forma segura
 */

import { normalizeColumnName } from './normalize-column-name';
import type { MappedAumColumns } from './types';

/**
 * Convierte un valor de Excel/CSV a string de forma segura
 * Maneja números, fechas, null, undefined, objetos, etc.
 */
export function safeToString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  // Si ya es string, retornarlo
  if (typeof value === 'string') {
    return value.trim() || null;
  }

  // Si es número, convertir a string
  if (typeof value === 'number') {
    // Manejar NaN e Infinity
    if (!isFinite(value)) {
      return null;
    }
    // Convertir a string sin notación científica para números grandes
    return value.toString();
  }

  // Si es boolean, convertir a string
  if (typeof value === 'boolean') {
    return value.toString();
  }

  // Si es Date, convertir a string ISO
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Si es objeto, intentar JSON.stringify
  if (typeof value === 'object') {
    try {
      const str = JSON.stringify(value);
      return str.trim() || null;
    } catch {
      return null;
    }
  }

  // Fallback: convertir a string
  try {
    return String(value).trim() || null;
  } catch {
    return null;
  }
}

/**
 * Convierte un valor de Excel/CSV a número de forma segura
 * Maneja strings numéricos, números, null, undefined, etc.
 *
 * AI_DECISION: Detección automática de formato numérico (europeo vs US)
 * Justificación: Los archivos CSV pueden venir en formato europeo (coma decimal, punto miles) o US (punto decimal, coma miles)
 * Impacto: Conversión confiable de valores numéricos independientemente del formato de origen
 */
export function safeToNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  // Si ya es número, validarlo y retornarlo
  if (typeof value === 'number') {
    // Manejar NaN e Infinity
    if (!isFinite(value)) {
      return null;
    }
    return value;
  }

  // Si es string, intentar parsearlo
  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Manejar valores vacíos y especiales
    if (trimmed === '' || trimmed === '-' || trimmed === '--' || trimmed === '—') {
      return null;
    }

    // AI_DECISION: Manejar explícitamente el caso de "0" para asegurar que se parsea como 0, no null
    // Justificación: Los valores cero deben distinguirse de valores vacíos/null
    // Impacto: Los valores cero se mostrarán como "0,00" en lugar de "--"
    if (
      trimmed === '0' ||
      trimmed === '0,00' ||
      trimmed === '0.00' ||
      trimmed === '0,0' ||
      trimmed === '0.0'
    ) {
      return 0;
    }

    // Detectar formato numérico
    // Formato europeo: punto como separador de miles, coma como decimal (ej: "4.971,15")
    // Formato US: coma como separador de miles, punto como decimal (ej: "4,971.15" o "4971.15")

    const hasComma = trimmed.includes(',');
    const hasDot = trimmed.includes('.');
    const lastCommaIndex = trimmed.lastIndexOf(',');
    const lastDotIndex = trimmed.lastIndexOf('.');

    let cleaned: string;

    if (hasComma && hasDot) {
      // Ambos separadores presentes: determinar formato por posición
      if (lastCommaIndex > lastDotIndex) {
        // Coma después del punto: formato europeo (ej: "4.971,15")
        // Eliminar puntos (miles) y reemplazar coma (decimal) por punto
        cleaned = trimmed
          .replace(/\./g, '') // Eliminar todos los puntos (separadores de miles)
          .replace(',', '.'); // Reemplazar coma por punto (decimal)
      } else {
        // Punto después de la coma: formato US (ej: "4,971.15")
        // Eliminar comas (miles) y mantener punto (decimal)
        cleaned = trimmed.replace(/,/g, ''); // Eliminar todas las comas (separadores de miles)
      }
    } else if (hasComma && !hasDot) {
      // Solo coma: puede ser formato europeo sin miles (ej: "971,15") o US con miles (ej: "4,971")
      // Si hay múltiples comas, es formato US con miles
      const commaCount = (trimmed.match(/,/g) || []).length;
      if (commaCount > 1) {
        // Múltiples comas: formato US con miles, eliminar comas
        cleaned = trimmed.replace(/,/g, '');
      } else {
        // Una coma: asumir formato europeo (decimal), reemplazar por punto
        cleaned = trimmed.replace(',', '.');
      }
    } else if (!hasComma && hasDot) {
      // Solo punto: puede ser formato US sin miles (ej: "971.15") o europeo con miles (ej: "4.971")
      // Si hay múltiples puntos, es formato europeo con miles
      const dotCount = (trimmed.match(/\./g) || []).length;
      if (dotCount > 1) {
        // Múltiples puntos: formato europeo con miles, eliminar puntos y agregar punto decimal al final si no existe
        // Ej: "4.971" -> "4971", "4.971.15" no debería ocurrir pero si ocurre, tratar como miles
        cleaned = trimmed.replace(/\./g, '');
      } else {
        // Un punto: formato US (decimal), mantener
        cleaned = trimmed;
      }
    } else {
      // Sin comas ni puntos: número entero, mantener como está
      cleaned = trimmed;
    }

    // Eliminar espacios y otros caracteres no numéricos (excepto punto y signo negativo)
    cleaned = cleaned.replace(/\s+/g, '').replace(/[^\d.-]/g, '');

    // Validar que tenga al menos un dígito
    if (!/\d/.test(cleaned)) {
      return null;
    }

    const parsed = parseFloat(cleaned);
    if (isNaN(parsed) || !isFinite(parsed)) {
      return null;
    }
    // AI_DECISION: Asegurar que 0 se retorna como 0, no null
    // Justificación: parseFloat puede retornar 0, que es un valor válido y debe distinguirse de null
    // Impacto: Los valores cero se mostrarán correctamente como "0,00"
    return parsed;
  }

  // Si es boolean, convertir (true = 1, false = 0)
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  // Fallback: intentar convertir a número
  try {
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) {
      return null;
    }
    return num;
  } catch {
    return null;
  }
}

interface ColumnMappingValidation {
  isValid: boolean;
  fileType: 'master' | 'monthly' | 'unknown';
  warnings: string[];
  errors: string[];
  mappedColumns: {
    idCuenta: boolean;
    comitente: boolean;
    holderName: boolean;
    advisor: boolean;
  };
}

/**
 * Valida el mapeo de columnas esperadas según el tipo de archivo
 *
 * AI_DECISION: Validación de mapeo de columnas esperadas
 * Justificación: Detecta problemas de mapeo temprano y genera warnings claros
 * Impacto: Mejor diagnóstico y detección de errores de estructura de archivos
 */
export function validateColumnMapping(
  availableColumns: string[],
  mapped: MappedAumColumns
): ColumnMappingValidation {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Detectar tipo de archivo basado en columnas disponibles
  const hasDescripcion = availableColumns.some(
    (col) =>
      normalizeColumnName(col) === normalizeColumnName('descripcion') ||
      normalizeColumnName(col) === normalizeColumnName('descripción')
  );
  const hasCuenta = availableColumns.some(
    (col) => normalizeColumnName(col) === normalizeColumnName('cuenta')
  );
  const hasAsesor = availableColumns.some(
    (col) => normalizeColumnName(col) === normalizeColumnName('asesor')
  );
  const hasComitente = availableColumns.some(
    (col) => normalizeColumnName(col) === normalizeColumnName('comitente')
  );

  let fileType: 'master' | 'monthly' | 'unknown' = 'unknown';
  if (hasDescripcion && hasAsesor && hasComitente) {
    fileType = 'master'; // Formato Balanz completo: idCuenta, comitente, Descripcion, Asesor
  } else if (hasCuenta && hasComitente && !hasAsesor) {
    fileType = 'monthly'; // Formato reporteClusterCuentasV2: idCuenta, comitente, cuenta (sin Asesor)
  } else if (hasComitente) {
    // Tiene comitente pero no podemos determinar claramente el tipo
    fileType = hasAsesor ? 'master' : 'monthly';
  }

  // Validar columnas críticas según tipo de archivo
  if (fileType === 'master') {
    // Master debe tener: idCuenta, comitente, Descripcion, Asesor
    if (!mapped.idCuenta) {
      warnings.push('Columna "idCuenta" no encontrada (esperada en archivo master)');
    }
    if (!mapped.accountNumber) {
      warnings.push('Columna "comitente" no encontrada (esperada en archivo master)');
    }
    if (!mapped.holderName) {
      errors.push('Columna "Descripcion" no encontrada (requerida en archivo master)');
    }
    if (!mapped.advisorRaw) {
      warnings.push('Columna "Asesor" no encontrada (esperada en archivo master)');
    }
  } else if (fileType === 'monthly') {
    // Monthly debe tener: idCuenta, comitente, cuenta
    if (!mapped.idCuenta) {
      warnings.push('Columna "idCuenta" no encontrada (esperada en archivo monthly)');
    }
    if (!mapped.accountNumber) {
      warnings.push('Columna "comitente" no encontrada (esperada en archivo monthly)');
    }
    if (!mapped.holderName) {
      errors.push('Columna "cuenta" no encontrada (requerida en archivo monthly)');
    }
    // Asesor no es requerido en archivos monthly
  } else {
    // Tipo desconocido: validar mínimo requerido
    if (!mapped.idCuenta && !mapped.accountNumber) {
      errors.push('No se encontraron columnas de identificación (idCuenta o comitente)');
    }
  }

  // Validación general: al menos un identificador debe estar presente
  if (!mapped.idCuenta && !mapped.accountNumber && !mapped.holderName) {
    errors.push('No se encontraron columnas críticas (idCuenta, comitente, o nombre del titular)');
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    fileType,
    warnings,
    errors,
    mappedColumns: {
      idCuenta: !!mapped.idCuenta,
      comitente: !!mapped.accountNumber,
      holderName: !!mapped.holderName,
      advisor: !!mapped.advisorRaw,
    },
  };
}
