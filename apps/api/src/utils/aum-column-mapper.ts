// AI_DECISION: Mapeo flexible de columnas CSV para AUM
// Justificación: Permite reconocer variaciones comunes de nombres de columnas sin romper el sistema
// Impacto: Mayor flexibilidad para aceptar CSVs con diferentes estructuras, manteniendo compatibilidad

/**
 * Normaliza un nombre de columna para comparación flexible
 * - Convierte a lowercase
 * - Elimina espacios extra y normaliza espacios/guiones
 * - Elimina caracteres especiales comunes
 */
export function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Normalizar espacios múltiples
    .replace(/[-_]/g, ' ') // Normalizar guiones y underscores
    .replace(/[°º]/g, '') // Eliminar símbolos de grado
    .trim();
}

/**
 * Busca una columna por múltiples patrones
 * Prioriza coincidencias exactas sobre parciales
 * 
 * @param availableColumns - Array de nombres de columnas disponibles (normalizados)
 * @param patterns - Array de patrones a buscar (normalizados)
 * @returns Nombre de columna original encontrado o null
 */
export function findColumnByPatterns(
  availableColumns: string[],
  patterns: string[]
): string | null {
  // Crear mapa de columnas normalizadas a originales
  const normalizedMap = new Map<string, string>();
  const normalizedColumns: string[] = [];
  
  for (const col of availableColumns) {
    const normalized = normalizeColumnName(col);
    normalizedColumns.push(normalized);
    // Mantener el primer nombre original que se normaliza a este
    if (!normalizedMap.has(normalized)) {
      normalizedMap.set(normalized, col);
    }
  }
  
  // Buscar coincidencias exactas primero
  for (const pattern of patterns) {
    const normalizedPattern = normalizeColumnName(pattern);
    if (normalizedColumns.includes(normalizedPattern)) {
      const original = normalizedMap.get(normalizedPattern);
      if (original) return original;
    }
  }
  
  // Buscar coincidencias parciales (la columna contiene el patrón o viceversa)
  // Solo si el patrón tiene al menos 3 caracteres para evitar falsos positivos
  for (const pattern of patterns) {
    const normalizedPattern = normalizeColumnName(pattern);
    // Solo buscar coincidencias parciales si el patrón es suficientemente largo
    if (normalizedPattern.length < 3) continue;
    
    for (const normalizedCol of normalizedColumns) {
      // Solo coincidencias parciales si ambos tienen al menos 3 caracteres
      if (normalizedCol.length < 3) continue;
      
      if (
        normalizedCol.includes(normalizedPattern) ||
        normalizedPattern.includes(normalizedCol)
      ) {
        const original = normalizedMap.get(normalizedCol);
        if (original) return original;
      }
    }
  }
  
  return null;
}

/**
 * Patrones de búsqueda para cada tipo de campo AUM
 */
const ACCOUNT_NUMBER_PATTERNS = [
  'cuenta comitente',
  'comitente',
  'cuenta',
  'numero cuenta',
  'numero de cuenta',
  'numero_cuenta',
  'nro cuenta',
  'nro de cuenta',
  'n cuenta',
  'account',
  'account number',
  'numero',
  'nro',
  'n°'
];

const HOLDER_NAME_PATTERNS = [
  'titular',
  'nombre titular',
  'nombre del titular',
  'descripcion',
  'descripción',
  'cliente',
  'nombre cliente',
  'nombre del cliente',
  'holder',
  'holder name',
  'nombre',
  'nombre completo',
  'razon social'
];

const ADVISOR_RAW_PATTERNS = [
  'asesor',
  'asesor asignado',
  'asesor_asignado',
  'advisor',
  'advisor name',
  'agente',
  'ejecutivo',
  'ejecutivo de cuenta',
  'representante'
];

export interface MappedAumColumns {
  accountNumber: string | null;
  holderName: string | null;
  advisorRaw: string | null;
}

/**
 * Convierte un valor de Excel/CSV a string de forma segura
 * Maneja números, fechas, null, undefined, objetos, etc.
 */
function safeToString(value: unknown): string | null {
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
 * Mapea columnas flexibles de un registro CSV/Excel a campos AUM
 * 
 * @param record - Registro con columnas del archivo
 * @returns Objeto con accountNumber, holderName, advisorRaw (pueden ser null)
 */
export function mapAumColumns(record: Record<string, unknown>): MappedAumColumns {
  const availableColumns = Object.keys(record);
  
  // Buscar columnas por patrones
  const accountNumberColumn = findColumnByPatterns(availableColumns, ACCOUNT_NUMBER_PATTERNS);
  const holderNameColumn = findColumnByPatterns(availableColumns, HOLDER_NAME_PATTERNS);
  const advisorRawColumn = findColumnByPatterns(availableColumns, ADVISOR_RAW_PATTERNS);
  
  // Extraer valores usando conversión segura
  const accountNumber = accountNumberColumn
    ? safeToString(record[accountNumberColumn])
    : null;
    
  const holderName = holderNameColumn
    ? safeToString(record[holderNameColumn])
    : null;
    
  const advisorRaw = advisorRawColumn
    ? safeToString(record[advisorRawColumn])
    : null;
  
  return {
    accountNumber,
    holderName,
    advisorRaw
  };
}

