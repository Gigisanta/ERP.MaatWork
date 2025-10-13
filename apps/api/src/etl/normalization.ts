/**
 * Módulo de normalización de cadenas para EPIC A
 * Implementa las reglas de normalización definidas en STORY 2 (KAN-123)
 */

/**
 * Normaliza un número de cuenta según las reglas definidas:
 * - UPPER case
 * - Sin tildes ni caracteres especiales
 * - Trim
 * - Collapse multiple spaces
 * - Quitar puntuación y "...."
 * 
 * @param cuenta - Cuenta raw desde Excel
 * @returns Cuenta normalizada
 * 
 * @example
 * normalizeCuenta("Cuenta... 123.45") => "CUENTA 12345"
 */
export function normalizeCuenta(cuenta: string | null | undefined): string {
  if (!cuenta) return '';
  
  let normalized = cuenta.toString();
  
  // Quitar tildes
  normalized = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  // UPPER
  normalized = normalized.toUpperCase();
  
  // Quitar puntos suspensivos
  normalized = normalized.replace(/\.{2,}/g, ''); // "..." => ""
  
  // Puntuación => espacio (puntos, guiones, guiones bajos, dos puntos, punto y coma)
  normalized = normalized.replace(/[.\-_:;,]/g, ' ');
  
  // Collapse spaces
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Trim
  normalized = normalized.trim();
  
  return normalized;
}

/**
 * Normaliza el nombre de un asesor según las reglas definidas:
 * - Quita sufijos tipo "2 - 1"
 * - UPPER case
 * - Trim
 * - Collapse spaces
 * 
 * @param asesor - Nombre raw desde Excel
 * @returns Nombre normalizado
 * 
 * @example
 * normalizeAsesor("Juan Pérez 2 - 1") => "JUAN PEREZ"
 */
export function normalizeAsesor(asesor: string | null | undefined): string {
  if (!asesor) return '';
  
  let normalized = asesor.toString();
  
  // Quitar sufijos numéricos "X - Y"
  normalized = normalized.replace(/\s+\d+\s*-\s*\d+\s*$/g, '');
  
  // Quitar tildes
  normalized = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  // UPPER
  normalized = normalized.toUpperCase();
  
  // Collapse spaces
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Trim
  normalized = normalized.trim();
  
  return normalized;
}

/**
 * Castea comitente/cuotapartista de decimal a int (truncate)
 * 
 * @param value - Valor que puede venir como string, number o null
 * @returns Integer o null
 * 
 * @example
 * castToInt(12345.0) => 12345
 * castToInt("12345.67") => 12345
 * castToInt(null) => null
 */
export function castToInt(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return null;
  
  // Truncate (no redondeo)
  return Math.trunc(num);
}

/**
 * Convierte valor 0/1 a boolean
 * 
 * @param value - Valor que puede venir como number, boolean, string o null
 * @returns Boolean o null
 * 
 * @example
 * castToBoolean(1) => true
 * castToBoolean(0) => false
 * castToBoolean("1") => true
 * castToBoolean(null) => null
 */
export function castToBoolean(value: number | boolean | string | null | undefined): boolean | null {
  if (value === null || value === undefined || value === '') return null;
  
  if (typeof value === 'boolean') return value;
  
  if (typeof value === 'number') return value !== 0;
  
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'sí' || lower === 'si') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
  }
  
  return null;
}

/**
 * Convierte valor a Date validando formato
 * 
 * @param value - Valor que puede venir como Date, string o null
 * @returns Date o null
 */
export function castToDate(value: Date | string | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  
  return null;
}

/**
 * Convierte valor a número con validación
 * 
 * @param value - Valor que puede venir como string, number o null
 * @param precision - Número de decimales (para redondeo)
 * @returns Number o null
 */
export function castToNumber(
  value: string | number | null | undefined, 
  precision?: number
): number | null {
  if (value === null || value === undefined || value === '') return null;
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return null;
  
  if (precision !== undefined) {
    return parseFloat(num.toFixed(precision));
  }
  
  return num;
}

/**
 * Valida que la suma de breakdowns aproxime al total
 * Usa tolerancia configurable desde ETL config
 * 
 * @param total - AUM total esperado
 * @param breakdowns - Array de valores de breakdown
 * @returns true si es válido, false si excede tolerancia
 */
export function validateBreakdownSum(total: number, breakdowns: (number | null)[], config?: any): boolean {
  // Si no se pasa config, usar valores por defecto
  const toleranceAbs = config?.breakdownTolerance ?? 0.1;
  const tolerancePercent = config?.breakdownTolerancePercent ?? 1.0;
  
  const sum = breakdowns.reduce((acc: number, val) => acc + (val || 0), 0);
  const diff = Math.abs(total - sum);
  
  // Usar tolerancia absoluta o porcentual, la que sea mayor
  const toleranceAbsValue = toleranceAbs;
  const tolerancePercentValue = (total * tolerancePercent) / 100;
  const tolerance = Math.max(toleranceAbsValue, tolerancePercentValue);
  
  return diff <= tolerance;
}

/**
 * Calcula la distancia de Levenshtein entre dos strings
 * Usado para fuzzy matching en cuenta_norm
 * 
 * @param a - String 1
 * @param b - String 2
 * @returns Distancia (número de ediciones)
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  const matrix: number[][] = [];
  
  // Inicializar primera fila y columna
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  // Llenar matriz
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

