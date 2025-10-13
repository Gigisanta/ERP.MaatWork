import { z } from 'zod';

/**
 * Esquema de validación para las columnas obligatorias del Excel mensual
 */
export const excelRowSchema = z.object({
  idcuenta: z.string().min(1, 'idcuenta es obligatorio'),
  comitente: z.number().int().positive('comitente debe ser un número entero positivo'),
  cuotapartista: z.number().int().positive('cuotapartista debe ser un número entero positivo'),
  descripcion: z.string().min(1, 'descripcion es obligatorio'),
  asesor: z.string().optional() // puede estar vacío
});

export type ExcelRow = z.infer<typeof excelRowSchema>;

/**
 * Esquema para metadatos del archivo
 */
export const fileMetadataSchema = z.object({
  nombreArchivo: z.string().min(1),
  tamanoArchivo: z.number().int().positive(),
  hashArchivo: z.string().min(1),
  fechaCarga: z.date(),
  mes: z.string().regex(/^\d{4}-\d{2}$/, 'mes debe estar en formato YYYY-MM')
});

export type FileMetadata = z.infer<typeof fileMetadataSchema>;

/**
 * Resultado de la validación del esquema
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateIds: string[];
  duplicatedRows: any[];
}

/**
 * Valida el esquema de un DataFrame/array de datos del Excel
 * @param data Array de objetos con los datos del Excel
 * @param columnMapping Mapeo de columnas del Excel a las esperadas
 * @returns Resultado de la validación
 */
export function validateSchema(
  data: any[],
  columnMapping: Record<string, string> = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let validRows = 0;
  let invalidRows = 0;

  // Columnas esperadas - asesor es opcional
  const expectedColumns = ['idcuenta', 'comitente', 'cuotapartista', 'descripcion'];
  const actualColumns = data.length > 0 ? Object.keys(data[0]) : [];

  // Verificar que existen las columnas obligatorias
  for (const expectedCol of expectedColumns) {
    const mappedCol = columnMapping[expectedCol] || expectedCol;
    if (!actualColumns.includes(mappedCol)) {
      errors.push(`Columna obligatoria '${expectedCol}' no encontrada (mapeada como '${mappedCol}')`);
    }
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
      warnings,
      totalRows: data.length,
      validRows: 0,
      invalidRows: data.length,
      duplicateIds: [],
      duplicatedRows: []
    };
  }

  // Detectar duplicados ANTES de validar filas
  const { duplicateIds, duplicatedRows } = findDuplicateIdsAndRows(data, columnMapping);
  
  // Filtrar duplicados (mantener solo el primero)
  const uniqueData = data.filter((row, index) => {
    const idcuentaCol = columnMapping.idcuenta || 'idcuenta';
    const idcuenta = row[idcuentaCol];
    const firstIndex = data.findIndex(r => r[idcuentaCol] === idcuenta);
    return index === firstIndex;
  });

  // Validar cada fila (sin duplicados)
  for (let i = 0; i < uniqueData.length; i++) {
    const row = uniqueData[i];
    const rowNumber = i + 1;

    try {
      // Aplicar mapeo de columnas
      const mappedRow: any = {};
      for (const [expected, actual] of Object.entries(columnMapping)) {
        mappedRow[expected] = row[actual];
      }
      // Agregar columnas no mapeadas
      for (const col of actualColumns) {
        if (!Object.values(columnMapping).includes(col)) {
          mappedRow[col] = row[col];
        }
      }

      // Normalizar tipos antes de validar
      const normalizedRow = normalizeRowData(mappedRow);
      
      // Validar con zod
      excelRowSchema.parse(normalizedRow);
      validRows++;
    } catch (error) {
      invalidRows++;
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );
        errors.push(`Fila ${rowNumber}: ${errorMessages.join(', ')}`);
      } else {
        errors.push(`Fila ${rowNumber}: Error de validación desconocido`);
      }
    }
  }

  // Generar warnings
  if (validRows > 0 && data.length > 1000) {
    warnings.push(`Archivo grande detectado (${data.length} filas). El procesamiento puede tardar varios segundos.`);
  }

  if (duplicateIds.length > 0) {
    warnings.push(`Se encontraron ${duplicateIds.length} idcuenta duplicados. Se cargará solo la primera ocurrencia de cada duplicado.`);
  }

  // Warning si >50% registros sin asesor
  const rowsWithoutAdvisor = data.filter(row => {
    const asesorCol = columnMapping.asesor || 'asesor';
    const asesor = row[asesorCol];
    return !asesor || String(asesor).trim() === '';
  });
  
  const percentageWithoutAdvisor = (rowsWithoutAdvisor.length / data.length) * 100;
  if (percentageWithoutAdvisor > 50) {
    warnings.push(`${percentageWithoutAdvisor.toFixed(1)}% de registros sin asesor asignado (${rowsWithoutAdvisor.length}/${data.length})`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalRows: data.length,
    validRows,
    invalidRows,
    duplicateIds,
    duplicatedRows
  };
}

/**
 * Encuentra idcuenta duplicados en los datos y retorna tanto los IDs como las filas
 */
function findDuplicateIdsAndRows(data: any[], columnMapping: Record<string, string>): { duplicateIds: string[], duplicatedRows: any[] } {
  const idcuentaCol = columnMapping.idcuenta || 'idcuenta';
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  const duplicatedRows: any[] = [];

  for (const row of data) {
    const idcuenta = row[idcuentaCol];
    if (idcuenta) {
      if (seen.has(idcuenta)) {
        duplicates.add(idcuenta);
        duplicatedRows.push(row);
      } else {
        seen.add(idcuenta);
      }
    }
  }

  return {
    duplicateIds: Array.from(duplicates),
    duplicatedRows
  };
}

/**
 * Normaliza una fila individual de datos
 */
function normalizeRowData(row: any): any {
  return {
    idcuenta: String(row.idcuenta || '').trim(),
    comitente: parseInt(String(row.comitente || '0'), 10),
    cuotapartista: parseInt(String(row.cuotapartista || '0'), 10),
    descripcion: String(row.descripcion || '').trim(),
    asesor: row.asesor ? String(row.asesor).trim() : undefined
  };
}

/**
 * Normaliza los datos del Excel para el procesamiento (filtrando duplicados)
 * @param data Datos crudos del Excel
 * @param columnMapping Mapeo de columnas
 * @returns Datos normalizados y únicos por idcuenta
 */
export function normalizeData(
  data: any[],
  columnMapping: Record<string, string> = {}
): ExcelRow[] {
  // Filtrar duplicados (mantener solo el primero)
  const uniqueData = data.filter((row, index) => {
    const idcuentaCol = columnMapping.idcuenta || 'idcuenta';
    const idcuenta = row[idcuentaCol];
    const firstIndex = data.findIndex(r => r[idcuentaCol] === idcuenta);
    return index === firstIndex;
  });

  return uniqueData.map(row => {
    // Aplicar mapeo de columnas
    const mappedRow: any = {};
    for (const [expected, actual] of Object.entries(columnMapping)) {
      mappedRow[expected] = row[actual];
    }
    // Agregar columnas no mapeadas
    for (const col of Object.keys(row)) {
      if (!Object.values(columnMapping).includes(col)) {
        mappedRow[col] = row[col];
      }
    }

    // Usar la función de normalización individual
    return normalizeRowData(mappedRow);
  });
}

/**
 * Extrae el mes del nombre del archivo o fecha
 * @param fileName Nombre del archivo
 * @param defaultMonth Mes por defecto si no se puede extraer
 * @returns Mes en formato YYYY-MM
 */
export function extractMonthFromFileName(fileName: string, defaultMonth?: string): string {
  // Buscar patrón YYYY-MM en el nombre del archivo
  const monthMatch = fileName.match(/(\d{4})[-_](\d{2})/);
  if (monthMatch) {
    return `${monthMatch[1]}-${monthMatch[2]}`;
  }

  // Si no se encuentra, usar el mes actual o el proporcionado
  if (defaultMonth) {
    return defaultMonth;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Genera hash SHA-256 del contenido del archivo para idempotencia
 * @param content Contenido del archivo como buffer
 * @returns Hash SHA-256 como string hexadecimal
 */
export function generateFileHash(content: Buffer): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(content).digest('hex');
}
