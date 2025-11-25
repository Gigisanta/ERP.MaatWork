// AI_DECISION: Mapeo flexible de columnas CSV para AUM
// Justificación: Permite reconocer variaciones comunes de nombres de columnas sin romper el sistema
// Impacto: Mayor flexibilidad para aceptar CSVs con diferentes estructuras, manteniendo compatibilidad

import { logger } from './logger';

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
  // AI_DECISION: Coincidencias parciales más estrictas para evitar falsos positivos
  // Justificación: Evitar que "cuenta" coincida con "ejecutivo de cuenta" por coincidencia parcial
  // Impacto: Mapeo más preciso, especialmente para columnas como "cuenta" que pueden aparecer en múltiples contextos
  for (const pattern of patterns) {
    const normalizedPattern = normalizeColumnName(pattern);
    // Solo buscar coincidencias parciales si el patrón es suficientemente largo
    if (normalizedPattern.length < 3) continue;
    
    // Si el patrón tiene múltiples palabras, solo hacer coincidencias parciales si el patrón completo está contenido
    // Esto evita que "cuenta" coincida con "ejecutivo de cuenta" solo porque comparten una palabra
    const patternHasMultipleWords = normalizedPattern.includes(' ');
    
    for (const normalizedCol of normalizedColumns) {
      // Solo coincidencias parciales si ambos tienen al menos 3 caracteres
      if (normalizedCol.length < 3) continue;
      
      let shouldMatch = false;
      
      if (patternHasMultipleWords) {
        // Para patrones con múltiples palabras, solo coincidir si el patrón completo está contenido en la columna
        // O si la columna completa está contenida en el patrón (pero solo si la columna es suficientemente larga)
        shouldMatch = normalizedCol.includes(normalizedPattern) ||
                     (normalizedCol.length >= 5 && normalizedPattern.includes(normalizedCol));
      } else {
        // Para patrones de una sola palabra, coincidir si está contenido (más permisivo)
        shouldMatch = normalizedCol.includes(normalizedPattern) ||
                     normalizedPattern.includes(normalizedCol);
      }
      
      if (shouldMatch) {
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

const ID_CUENTA_PATTERNS = [
  'id cuenta',
  'id_cuenta',
  'idcuenta',
  'id de cuenta',
  'id de la cuenta',
  'cuenta id',
  'cuenta_id',
  'account id',
  'account_id'
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
  idCuenta: string | null;
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

export interface ColumnMappingValidation {
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
 * 
 * AI_DECISION: Detección automática de formato numérico (europeo vs US)
 * Justificación: Los archivos CSV pueden venir en formato europeo (coma decimal, punto miles) o US (punto decimal, coma miles)
 * Impacto: Conversión confiable de valores numéricos independientemente del formato de origen
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
    
    // Manejar valores vacíos y especiales
    if (trimmed === '' || trimmed === '-' || trimmed === '--' || trimmed === '—') {
      return null;
    }
    
    // AI_DECISION: Manejar explícitamente el caso de "0" para asegurar que se parsea como 0, no null
    // Justificación: Los valores cero deben distinguirse de valores vacíos/null
    // Impacto: Los valores cero se mostrarán como "0,00" en lugar de "--"
    if (trimmed === '0' || trimmed === '0,00' || trimmed === '0.00' || trimmed === '0,0' || trimmed === '0.0') {
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
  const hasDescripcion = availableColumns.some(col => 
    normalizeColumnName(col) === normalizeColumnName('descripcion') ||
    normalizeColumnName(col) === normalizeColumnName('descripción')
  );
  const hasCuenta = availableColumns.some(col => 
    normalizeColumnName(col) === normalizeColumnName('cuenta')
  );
  const hasAsesor = availableColumns.some(col => 
    normalizeColumnName(col) === normalizeColumnName('asesor')
  );
  const hasComitente = availableColumns.some(col => 
    normalizeColumnName(col) === normalizeColumnName('comitente')
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
      advisor: !!mapped.advisorRaw
    }
  };
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
    // Solo mostrar columnas clave para debugging, no todas las normalizaciones
    const keyColumns = availableColumns.slice(0, 10).join(', ');
    const moreColumns = availableColumns.length > 10 ? ` (+${availableColumns.length - 10} más)` : '';
    logger.debug({
      totalColumns: availableColumns.length,
      keyColumns: `${keyColumns}${moreColumns}`
    }, 'AUM Column Mapper: columnas detectadas');
  }
  
  // AI_DECISION: Mantener un set de columnas ya asignadas para exclusión mutua
  // Justificación: Evita que una columna se use para múltiples campos (ej: "cuenta" como accountNumber y holderName)
  // Impacto: Mapeo más preciso y evita conflictos entre "Asesor" y "Cuenta"
  const assignedColumns = new Set<string>();
  
  // Helper function para buscar columna excluyendo las ya asignadas
  const findColumnExcluding = (patterns: string[], excludeColumns: string[] = []): string | null => {
    const available = availableColumns.filter(col => 
      !assignedColumns.has(col) && !excludeColumns.includes(col)
    );
    return findColumnByPatterns(available, patterns);
  };
  
  // 1. Buscar accountNumber primero (prioriza 'comitente')
  // AI_DECISION: Si hay "comitente", excluir "cuenta" de accountNumber patterns
  // Justificación: Cuando hay "comitente", "cuenta" es el nombre del cliente (holderName), no accountNumber
  // Impacto: Mapeo correcto para formatos idCuenta,comitente,cuenta y idCuenta,comitente,Descripcion
  const hasComitenteColumn = availableColumns.some(col => 
    normalizeColumnName(col) === normalizeColumnName('comitente')
  );
  
  let accountNumberPatterns = ACCOUNT_NUMBER_PATTERNS;
  if (hasComitenteColumn) {
    // Si hay "comitente", excluir "cuenta" de los patrones de accountNumber
    // porque "cuenta" será el nombre del cliente (holderName)
    accountNumberPatterns = ACCOUNT_NUMBER_PATTERNS.filter(p => p !== 'cuenta');
  }
  
  const accountNumberColumn = findColumnExcluding(accountNumberPatterns);
  if (accountNumberColumn) {
    assignedColumns.add(accountNumberColumn);
  }
  
  // 2. Buscar idCuenta (no debería conflictuar con accountNumber normalmente)
  const idCuentaColumn = findColumnExcluding(ID_CUENTA_PATTERNS);
  if (idCuentaColumn) {
    assignedColumns.add(idCuentaColumn);
  }
  
  // 3. Buscar advisorRaw ANTES de holderName para evitar que "Asesor" se use como holderName
  // AI_DECISION: Buscar advisorRaw antes de holderName para exclusión mutua
  // Justificación: "Asesor" nunca debe mapearse a holderName, solo a advisorRaw
  // Impacto: Previene mezcla de columnas "Asesor" y "Cuenta"
  // AI_DECISION: Excluir "cuenta" de la búsqueda de advisorRaw cuando hay "comitente"
  // Justificación: Cuando hay "comitente", "cuenta" es el nombre del cliente (holderName), no asesor
  // Impacto: Evita que "cuenta" se mapee incorrectamente a advisorRaw en formatos idCuenta,comitente,cuenta
  const excludeFromAdvisorSearch: string[] = [];
  if (hasComitenteColumn) {
    // Si hay "comitente", excluir "cuenta" de la búsqueda de advisorRaw
    const cuentaCol = availableColumns.find(col => 
      normalizeColumnName(col) === normalizeColumnName('cuenta')
    );
    if (cuentaCol) {
      excludeFromAdvisorSearch.push(cuentaCol);
    }
  }
  const advisorRawColumn = findColumnExcluding(ADVISOR_RAW_PATTERNS, excludeFromAdvisorSearch);
  if (advisorRawColumn) {
    assignedColumns.add(advisorRawColumn);
  }
  
  // 4. Buscar holderName excluyendo accountNumber, idCuenta y advisorRaw ya asignados
  // AI_DECISION: Cuando hay "comitente", "cuenta" es holderName (nombre del cliente)
  // Justificación: En formatos con comitente, "cuenta" o "Descripcion" es el nombre del cliente
  // Impacto: Mapeo correcto para archivos con estructura idCuenta,comitente,cuenta o idCuenta,comitente,Descripcion,Asesor
  let holderNameColumn: string | null = null;
  const isComitenteFormat = accountNumberColumn && 
    normalizeColumnName(accountNumberColumn) === normalizeColumnName('comitente');
  
  if (isComitenteFormat) {
    // Si tenemos "comitente" como accountNumber, buscar holderName en este orden:
    // 1. "Descripcion" o "descripción" (formato Balanz completo)
    // 2. "cuenta" (formato reporteClusterCuentasV2 - nombre del cliente)
    // 3. Otros patrones de holderName
    const descripcionPatterns = ['descripcion', 'descripción'];
    holderNameColumn = findColumnExcluding(descripcionPatterns);
    
    if (!holderNameColumn) {
      // Si no hay "Descripcion", buscar "cuenta" (que es el nombre del cliente en algunos formatos)
      const cuentaColumn = findColumnExcluding(['cuenta']);
      if (cuentaColumn) {
        holderNameColumn = cuentaColumn;
      }
    }
    
    if (!holderNameColumn) {
      // Si no hay "Descripcion" ni "cuenta", buscar otros patrones excluyendo patrones de asesor
      const holderPatternsWithoutAdvisor = HOLDER_NAME_PATTERNS.filter(p => 
        p !== 'cuenta' && !ADVISOR_RAW_PATTERNS.includes(p)
      );
      holderNameColumn = findColumnExcluding(holderPatternsWithoutAdvisor);
    }
  } else {
    // Si no hay "comitente", buscar holderName normalmente pero excluyendo patrones de asesor
    const holderPatternsWithoutAdvisor = HOLDER_NAME_PATTERNS.filter(p => 
      !ADVISOR_RAW_PATTERNS.includes(p)
    );
    holderNameColumn = findColumnExcluding(holderPatternsWithoutAdvisor);
  }
  
  if (holderNameColumn) {
    assignedColumns.add(holderNameColumn);
  }
  
  // 5. Buscar columnas financieras (no deberían conflictuar con las anteriores)
  const aumDollarsColumn = findColumnExcluding(AUM_DOLLARS_PATTERNS);
  if (aumDollarsColumn) {
    assignedColumns.add(aumDollarsColumn);
  }
  
  const bolsaArgColumn = findColumnExcluding(BOLSA_ARG_PATTERNS);
  if (bolsaArgColumn) {
    assignedColumns.add(bolsaArgColumn);
  }
  
  const fondosArgColumn = findColumnExcluding(FONDOS_ARG_PATTERNS);
  if (fondosArgColumn) {
    assignedColumns.add(fondosArgColumn);
  }
  
  const bolsaBciColumn = findColumnExcluding(BOLSA_BCI_PATTERNS);
  if (bolsaBciColumn) {
    assignedColumns.add(bolsaBciColumn);
  }
  
  const pesosColumn = findColumnExcluding(PESOS_PATTERNS);
  if (pesosColumn) {
    assignedColumns.add(pesosColumn);
  }
  
  const mepColumn = findColumnExcluding(MEP_PATTERNS);
  if (mepColumn) {
    assignedColumns.add(mepColumn);
  }
  
  const cableColumn = findColumnExcluding(CABLE_PATTERNS);
  if (cableColumn) {
    assignedColumns.add(cableColumn);
  }
  
  const cv7000Column = findColumnExcluding(CV7000_PATTERNS);
  if (cv7000Column) {
    assignedColumns.add(cv7000Column);
  }
  
  // Construir objeto mapeado para validación
  // AI_DECISION: Validar que advisorRaw no sea un valor numérico antes de asignarlo
  // Justificación: Si la columna "Asesor" contiene números, es un error de mapeo y debe corregirse
  // Impacto: Previene que valores financieros se asignen incorrectamente a advisorRaw
  let advisorRawValue: string | null = null;
  if (advisorRawColumn) {
    const rawValue = record[advisorRawColumn];
    // Si el valor es null o undefined, mantener null
    if (rawValue === null || rawValue === undefined) {
      advisorRawValue = null;
    } else {
      const strValue = String(rawValue).trim();
      // Manejar valores vacíos o especiales como null (sin warning)
      if (strValue === '' || strValue === '-' || strValue === '--' || strValue === '—') {
        advisorRawValue = null;
      } else {
        // Verificar si es un número (incluyendo formato con comas/puntos)
        // Patrón: número opcionalmente negativo, con o sin decimales (coma o punto)
        const numericPattern = /^-?\d+([.,]\d+)?$/;
        if (numericPattern.test(strValue)) {
          // Si es numérico, es probablemente un error de mapeo, asignar null y loguear warning
          // Solo loguear en primera fila para evitar spam
          if (isFirstRow) {
            logger.warn({
              column: advisorRawColumn,
              value: rawValue,
              availableColumns: availableColumns.slice(0, 5).join(', ')
            }, 'AUM Column Mapper: advisorRaw contiene valor numérico, posible error de mapeo');
          }
          advisorRawValue = null;
        } else {
          // No es numérico, asignar normalmente
          advisorRawValue = safeToString(rawValue);
        }
      }
    }
  }

  const mapped: MappedAumColumns = {
    accountNumber: accountNumberColumn ? safeToString(record[accountNumberColumn]) : null,
    holderName: holderNameColumn ? safeToString(record[holderNameColumn]) : null,
    idCuenta: idCuentaColumn ? safeToString(record[idCuentaColumn]) : null,
    advisorRaw: advisorRawValue,
    aumDollars: null, // Se asignará después
    bolsaArg: null,
    fondosArg: null,
    bolsaBci: null,
    pesos: null,
    mep: null,
    cable: null,
    cv7000: null
  };
  
  // Validar mapeo de columnas (solo en primera fila)
  if (isFirstRow) {
    const validation = validateColumnMapping(availableColumns, mapped);
    
    if (validation.errors.length > 0) {
      logger.warn({
        errors: validation.errors,
        warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
        fileType: validation.fileType,
        mappedColumns: validation.mappedColumns
      }, `AUM Column Mapper: ${validation.errors.length} error(es) de validación detectados`);
    } else if (validation.warnings.length > 0) {
      logger.warn({
        warnings: validation.warnings,
        fileType: validation.fileType,
        mappedColumns: validation.mappedColumns
      }, `AUM Column Mapper: ${validation.warnings.length} advertencia(s) de mapeo`);
    }
    
    // Consolidar información de mapeo en mensaje más conciso
    const mappedFields = [
      accountNumberColumn && 'comitente',
      idCuentaColumn && 'idCuenta',
      holderNameColumn && 'holderName',
      advisorRawColumn && 'asesor',
      aumDollarsColumn && 'aumDollars',
      bolsaArgColumn && 'bolsaArg',
      fondosArgColumn && 'fondosArg',
      bolsaBciColumn && 'bolsaBci',
      pesosColumn && 'pesos',
      mepColumn && 'mep',
      cableColumn && 'cable',
      cv7000Column && 'cv7000'
    ].filter(Boolean).join(', ');
    
    logger.debug({
      fileType: validation.fileType,
      mappedFields,
      format: isComitenteFormat ? 'comitente' : 'standard'
    }, 'AUM Column Mapper: mapeo resuelto');
  }
  
  // Extraer valores financieros usando conversión segura
  mapped.aumDollars = aumDollarsColumn
    ? safeToNumber(record[aumDollarsColumn])
    : null;
    
  mapped.bolsaArg = bolsaArgColumn
    ? safeToNumber(record[bolsaArgColumn])
    : null;
    
  mapped.fondosArg = fondosArgColumn
    ? safeToNumber(record[fondosArgColumn])
    : null;
    
  mapped.bolsaBci = bolsaBciColumn
    ? safeToNumber(record[bolsaBciColumn])
    : null;
    
  mapped.pesos = pesosColumn
    ? safeToNumber(record[pesosColumn])
    : null;
    
  mapped.mep = mepColumn
    ? safeToNumber(record[mepColumn])
    : null;
    
  mapped.cable = cableColumn
    ? safeToNumber(record[cableColumn])
    : null;
    
  mapped.cv7000 = cv7000Column
    ? safeToNumber(record[cv7000Column])
    : null;
  
  return mapped;
}

