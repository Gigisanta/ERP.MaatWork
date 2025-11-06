// AI_DECISION: Mapeo flexible de columnas CSV para AUM
// Justificación: Permite reconocer variaciones comunes de nombres de columnas sin romper el sistema
// Impacto: Mayor flexibilidad para aceptar CSVs con diferentes estructuras, manteniendo compatibilidad

/**
 * Normaliza un nombre de columna para comparación flexible
 * - Convierte a lowercase
 * - Elimina espacios extra y normaliza espacios/guiones
 * - Elimina caracteres especiales comunes
 * - Normaliza acentos y caracteres diacríticos
 */
export function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD') // Descompone caracteres con acentos (é -> e + ´)
    .replace(/[\u0300-\u036f]/g, '') // Elimina marcas diacríticas (acentos)
    .trim()
    .replace(/\s+/g, ' ') // Normalizar espacios múltiples
    .replace(/[-_]/g, ' ') // Normalizar guiones y underscores
    .replace(/[°º]/g, '') // Eliminar símbolos de grado
    .replace(/[^\w\s]/g, '') // Eliminar caracteres especiales excepto letras, números y espacios
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
 * Los patrones más comunes y simples van primero para prioridad
 */
const ACCOUNT_NUMBER_PATTERNS = [
  'comitente',        // Comitente es el número de cuenta en este formato
  'cuenta comitente',
  'numero comitente',
  'nro comitente',
  'cuenta',           // También puede ser número de cuenta en algunos formatos
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
  'cuenta',          // En algunos formatos, "cuenta" es el nombre del titular
  'titular',         // Patrón más simple y común
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
  'asesor',          // Patrón más simple y común primero
  'asesor asignado',
  'asesor_asignado',
  'advisor',
  'advisor name',
  'agente',
  'ejecutivo',
  'ejecutivo de cuenta',
  'representante'
];

const AUM_DOLLARS_PATTERNS = [
  'aum en dolares',
  'aum dolares',
  'aum dollars',
  'aum usd',
  'aum en usd',
  'aum en dollars'
];

const BOLSA_ARG_PATTERNS = [
  'bolsa arg',
  'bolsa argentina',
  'bolsa ar'
];

const FONDOS_ARG_PATTERNS = [
  'fondos arg',
  'fondos argentina',
  'fondos ar'
];

const BOLSA_BCI_PATTERNS = [
  'bolsa bci',
  'bci'
];

const PESOS_PATTERNS = [
  'pesos',
  'ars',
  'pesos argentinos'
];

const MEP_PATTERNS = [
  'mep'
];

const CABLE_PATTERNS = [
  'cable'
];

const CV7000_PATTERNS = [
  'cv7000',
  'cv 7000'
];

export interface MappedAumColumns {
  accountNumber: string | null;
  holderName: string | null;
  advisorRaw: string | null;
  aumDollars: number | null;
  bolsaArg: number | null;
  fondosArg: number | null;
  bolsaBci: number | null;
  pesos: number | null;
  mep: number | null;
  cable: number | null;
  cv7000: number | null;
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
 * Convierte un valor de Excel/CSV a número de forma segura
 * Maneja strings numéricos, números, null, undefined, etc.
 */
function safeToNumber(value: unknown): number | null {
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
    if (trimmed === '' || trimmed === '-') {
      return null;
    }
    
    // Remover separadores de miles comunes (espacios, comas, puntos)
    const cleaned = trimmed
      .replace(/\s+/g, '') // Eliminar espacios
      .replace(/,/g, '') // Eliminar comas
      .replace(/\.(?=.*\.)/g, ''); // Eliminar puntos excepto el último (decimal)
    
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed) || !isFinite(parsed)) {
      return null;
    }
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

/**
 * Mapea columnas flexibles de un registro CSV/Excel a campos AUM
 * 
 * @param record - Registro con columnas del archivo
 * @returns Objeto con accountNumber, holderName, advisorRaw y columnas financieras (pueden ser null)
 */
export function mapAumColumns(record: Record<string, unknown>): MappedAumColumns {
  const availableColumns = Object.keys(record);
  
  // AI_DECISION: Logging solo en primera fila para evitar spam excesivo
  // Justificación: Necesitamos diagnóstico pero no spam en cada fila
  // Impacto: Logging útil sin saturar la consola
  const isFirstRow = !(global as any).__aumMapperLogged;
  if (isFirstRow && availableColumns.length > 0) {
    (global as any).__aumMapperLogged = true;
    console.log('[AUM Column Mapper] ==========================================');
    console.log('[AUM Column Mapper] Columnas disponibles:', availableColumns);
    console.log('[AUM Column Mapper] Total de columnas:', availableColumns.length);
    console.log('[AUM Column Mapper] Columnas normalizadas:', availableColumns.map(col => `${col} -> ${normalizeColumnName(col)}`));
  }
  
  // Buscar columnas por patrones
  const accountNumberColumn = findColumnByPatterns(availableColumns, ACCOUNT_NUMBER_PATTERNS);
  const holderNameColumn = findColumnByPatterns(availableColumns, HOLDER_NAME_PATTERNS);
  const advisorRawColumn = findColumnByPatterns(availableColumns, ADVISOR_RAW_PATTERNS);
  const aumDollarsColumn = findColumnByPatterns(availableColumns, AUM_DOLLARS_PATTERNS);
  const bolsaArgColumn = findColumnByPatterns(availableColumns, BOLSA_ARG_PATTERNS);
  const fondosArgColumn = findColumnByPatterns(availableColumns, FONDOS_ARG_PATTERNS);
  const bolsaBciColumn = findColumnByPatterns(availableColumns, BOLSA_BCI_PATTERNS);
  const pesosColumn = findColumnByPatterns(availableColumns, PESOS_PATTERNS);
  const mepColumn = findColumnByPatterns(availableColumns, MEP_PATTERNS);
  const cableColumn = findColumnByPatterns(availableColumns, CABLE_PATTERNS);
  const cv7000Column = findColumnByPatterns(availableColumns, CV7000_PATTERNS);
  
  // Logging de diagnóstico - solo primera vez
  if (isFirstRow) {
    console.log('[AUM Column Mapper] Mapeo encontrado:', {
      accountNumberColumn,
      holderNameColumn,
      advisorRawColumn,
      aumDollarsColumn,
      bolsaArgColumn,
      fondosArgColumn,
      bolsaBciColumn,
      pesosColumn,
      mepColumn,
      cableColumn,
      cv7000Column,
      totalColumns: availableColumns.length
    });
    console.log('[AUM Column Mapper] ==========================================');
  }
  
  // Resetear flag después de procesar todas las filas (se reseteará en el siguiente upload)
  // El flag se reseteará automáticamente cuando termine el proceso
  
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
  
  const aumDollars = aumDollarsColumn
    ? safeToNumber(record[aumDollarsColumn])
    : null;
    
  const bolsaArg = bolsaArgColumn
    ? safeToNumber(record[bolsaArgColumn])
    : null;
    
  const fondosArg = fondosArgColumn
    ? safeToNumber(record[fondosArgColumn])
    : null;
    
  const bolsaBci = bolsaBciColumn
    ? safeToNumber(record[bolsaBciColumn])
    : null;
    
  const pesos = pesosColumn
    ? safeToNumber(record[pesosColumn])
    : null;
    
  const mep = mepColumn
    ? safeToNumber(record[mepColumn])
    : null;
    
  const cable = cableColumn
    ? safeToNumber(record[cableColumn])
    : null;
    
  const cv7000 = cv7000Column
    ? safeToNumber(record[cv7000Column])
    : null;
  
  return {
    accountNumber,
    holderName,
    advisorRaw,
    aumDollars,
    bolsaArg,
    fondosArg,
    bolsaBci,
    pesos,
    mep,
    cable,
    cv7000
  };
}

