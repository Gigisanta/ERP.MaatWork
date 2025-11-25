/**
 * Utilidades para actualizar reporte cluster de cuentas desde CSV AUM
 * 
 * Transforma datos de "Balanz Cactus 2025 - AUM Balanz.csv" al formato
 * de "reporteClusterCuentasV2.csv"
 */

import { promises as fs } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';

// ==========================================================
// Types
// ==========================================================

/**
 * Estructura de una fila del CSV fuente (Balanz Cactus 2025 - AUM Balanz.csv)
 */
export interface SourceAumRow {
  idCuenta: string | null;
  comitente: string | null;
  Descripcion: string | null;
  Asesor: string | null;
  'AUM en Dolares': string | null;
  'Bolsa Arg': string | null;
  'Fondos Arg': string | null;
  'Bolsa BCI': string | null;
  pesos: string | null;
  mep: string | null;
  cable: string | null;
  cv7000: string | null;
  cv10000?: string | null;
  [key: string]: string | null | undefined;
}

/**
 * Estructura de una fila del CSV destino (reporteClusterCuentasV2.csv)
 */
export interface ClusterReportRow {
  idCuenta: string | null;
  comitente: string | null;
  cuenta: string | null;
  'AUM en Dolares': string | null;
  'Bolsa Arg': string | null;
  'Fondos Arg': string | null;
  'Bolsa BCI': string | null;
  pesos: string | null;
  mep: string | null;
  cable: string | null;
  cv7000: string | null;
}

/**
 * Resultado de la validación
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalRows: number;
    validRows: number;
    skippedRows: number;
    uniqueIdCuentas: number;
    uniqueComitentes: number;
    uniqueAsesores: number;
  };
}

// ==========================================================
// Zod Schemas
// ==========================================================

const sourceRowSchema = z.object({
  idCuenta: z.string().nullable(),
  comitente: z.string().nullable(),
  Descripcion: z.string().nullable(),
  Asesor: z.string().nullable(),
  'AUM en Dolares': z.string().nullable(),
  'Bolsa Arg': z.string().nullable(),
  'Fondos Arg': z.string().nullable(),
  'Bolsa BCI': z.string().nullable(),
  pesos: z.string().nullable(),
  mep: z.string().nullable(),
  cable: z.string().nullable(),
  cv7000: z.string().nullable(),
  cv10000: z.string().nullable().optional(),
}).passthrough();

const clusterRowSchema = z.object({
  idCuenta: z.string().nullable(),
  comitente: z.string().nullable(),
  cuenta: z.string().nullable(),
  'AUM en Dolares': z.string().nullable(),
  'Bolsa Arg': z.string().nullable(),
  'Fondos Arg': z.string().nullable(),
  'Bolsa BCI': z.string().nullable(),
  pesos: z.string().nullable(),
  mep: z.string().nullable(),
  cable: z.string().nullable(),
  cv7000: z.string().nullable(),
}).passthrough();

// ==========================================================
// Load Functions
// ==========================================================

/**
 * Carga y parsea el CSV fuente
 */
export async function loadAumCsv(filePath: string): Promise<SourceAumRow[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_quotes: true,
      skip_records_with_error: true, // Saltar filas con errores (como columnas faltantes)
      escape: '"',
      quote: '"',
      cast: false
    }) as Array<Record<string, string>>;
    
    if (!records || records.length === 0) {
      throw new Error('El archivo CSV no contiene datos o está vacío');
    }
    
    // Convertir a tipo SourceAumRow y validar estructura básica
    const rows: SourceAumRow[] = [];
    for (const record of records) {
      // Verificar que la fila tenga al menos algún dato
      const hasData = Object.values(record).some(v => {
        if (v === null || v === undefined || v === '') return false;
        const str = String(v).trim();
        return str.length > 0;
      });
      
      if (!hasData) {
        continue; // Saltar filas completamente vacías
      }
      
      // Normalizar el record al tipo SourceAumRow
      const row: SourceAumRow = {
        idCuenta: record.idCuenta?.trim() || null,
        comitente: record.comitente?.trim() || null,
        Descripcion: record.Descripcion?.trim() || null,
        Asesor: record.Asesor?.trim() || null,
        'AUM en Dolares': record['AUM en Dolares']?.trim() || null,
        'Bolsa Arg': record['Bolsa Arg']?.trim() || null,
        'Fondos Arg': record['Fondos Arg']?.trim() || null,
        'Bolsa BCI': record['Bolsa BCI']?.trim() || null,
        pesos: record.pesos?.trim() || null,
        mep: record.mep?.trim() || null,
        cable: record.cable?.trim() || null,
        cv7000: record.cv7000?.trim() || null,
        cv10000: record.cv10000?.trim() || null,
      };
      
      rows.push(row);
    }
    
    return rows;
  } catch (error) {
    throw new Error(
      `Error al cargar CSV fuente "${filePath}": ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Carga y parsea el CSV del reporte cluster
 */
export async function loadClusterReport(filePath: string): Promise<ClusterReportRow[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_quotes: true,
      skip_records_with_error: true, // Saltar filas con errores (como columnas faltantes)
      escape: '"',
      quote: '"',
      cast: false
    }) as Array<Record<string, string>>;
    
    if (!records || records.length === 0) {
      return []; // Reporte vacío es válido
    }
    
    const rows: ClusterReportRow[] = [];
    for (const record of records) {
      const hasData = Object.values(record).some(v => {
        if (v === null || v === undefined || v === '') return false;
        const str = String(v).trim();
        return str.length > 0;
      });
      
      if (!hasData) {
        continue;
      }
      
      const row: ClusterReportRow = {
        idCuenta: record.idCuenta?.trim() || null,
        comitente: record.comitente?.trim() || null,
        cuenta: record.cuenta?.trim() || null,
        'AUM en Dolares': record['AUM en Dolares']?.trim() || null,
        'Bolsa Arg': record['Bolsa Arg']?.trim() || null,
        'Fondos Arg': record['Fondos Arg']?.trim() || null,
        'Bolsa BCI': record['Bolsa BCI']?.trim() || null,
        pesos: record.pesos?.trim() || null,
        mep: record.mep?.trim() || null,
        cable: record.cable?.trim() || null,
        cv7000: record.cv7000?.trim() || null,
      };
      
      rows.push(row);
    }
    
    return rows;
  } catch (error) {
    throw new Error(
      `Error al cargar reporte cluster "${filePath}": ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ==========================================================
// Transform Functions
// ==========================================================

/**
 * Transforma una fila del CSV fuente al formato del reporte cluster
 */
export function transformSourceToCluster(sourceRow: SourceAumRow): ClusterReportRow {
  return {
    idCuenta: sourceRow.idCuenta,
    comitente: sourceRow.comitente,
    cuenta: sourceRow.Descripcion, // Descripcion → cuenta
    'AUM en Dolares': sourceRow['AUM en Dolares'],
    'Bolsa Arg': sourceRow['Bolsa Arg'],
    'Fondos Arg': sourceRow['Fondos Arg'],
    'Bolsa BCI': sourceRow['Bolsa BCI'],
    pesos: sourceRow.pesos,
    mep: sourceRow.mep,
    cable: sourceRow.cable,
    cv7000: sourceRow.cv7000,
    // Asesor y cv10000 se eliminan (no están en el formato destino)
  };
}

/**
 * Actualiza el reporte cluster con datos del CSV fuente
 * Si una fila ya existe (por idCuenta/comitente), se actualiza; si no, se agrega
 */
export function updateClusterReport(
  sourceData: SourceAumRow[],
  existingClusterData: ClusterReportRow[]
): ClusterReportRow[] {
  // Crear mapa de datos existentes por idCuenta y comitente
  const existingMap = new Map<string, ClusterReportRow>();
  for (const row of existingClusterData) {
    const key = `${row.idCuenta || ''}_${row.comitente || ''}`;
    if (key !== '_') {
      existingMap.set(key, row);
    }
  }
  
  // Transformar datos fuente y actualizar/agregar
  const updatedRows: ClusterReportRow[] = [];
  const processedKeys = new Set<string>();
  
  // Primero, agregar/actualizar filas del CSV fuente
  for (const sourceRow of sourceData) {
    const key = `${sourceRow.idCuenta || ''}_${sourceRow.comitente || ''}`;
    
    if (key === '_') {
      // Saltar filas sin idCuenta ni comitente
      continue;
    }
    
    const transformed = transformSourceToCluster(sourceRow);
    updatedRows.push(transformed);
    processedKeys.add(key);
  }
  
  // Luego, agregar filas existentes que no fueron actualizadas
  for (const [key, existingRow] of existingMap.entries()) {
    if (!processedKeys.has(key)) {
      updatedRows.push(existingRow);
    }
  }
  
  return updatedRows;
}

/**
 * Escapa un valor para CSV (maneja comillas, comas, saltos de línea)
 */
function escapeCsvValue(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const str = String(value);
  
  // Si contiene comas, comillas o saltos de línea, necesita comillas
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    // Escapar comillas dobles duplicándolas
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Escribe el reporte cluster actualizado a un archivo CSV
 */
export async function writeClusterReport(
  data: ClusterReportRow[],
  filePath: string
): Promise<void> {
  try {
    // Ordenar por idCuenta para consistencia
    const sortedData = [...data].sort((a, b) => {
      const aId = a.idCuenta || '';
      const bId = b.idCuenta || '';
      return aId.localeCompare(bId);
    });
    
    // Headers del CSV destino
    const headers: (keyof ClusterReportRow)[] = [
      'idCuenta',
      'comitente',
      'cuenta',
      'AUM en Dolares',
      'Bolsa Arg',
      'Fondos Arg',
      'Bolsa BCI',
      'pesos',
      'mep',
      'cable',
      'cv7000',
    ];
    
    // Generar CSV manualmente
    const lines: string[] = [];
    
    // Header
    lines.push(headers.map(h => escapeCsvValue(h)).join(','));
    
    // Rows
    for (const row of sortedData) {
      const values = headers.map(header => {
        const value = row[header];
        return escapeCsvValue(value);
      });
      lines.push(values.join(','));
    }
    
    const csvContent = lines.join('\n');
    
    await fs.writeFile(filePath, csvContent, 'utf-8');
  } catch (error) {
    throw new Error(
      `Error al escribir reporte cluster "${filePath}": ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ==========================================================
// Validation Functions
// ==========================================================

/**
 * Valida que la actualización sea correcta
 */
export function validateUpdate(
  sourceData: SourceAumRow[],
  updatedData: ClusterReportRow[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Estadísticas
  const sourceIdCuentas = new Set<string>();
  const sourceComitentes = new Set<string>();
  const sourceAsesores = new Set<string>();
  let sourceValidRows = 0;
  
  const updatedIdCuentas = new Set<string>();
  const updatedComitentes = new Set<string>();
  let updatedValidRows = 0;
  
  // Procesar datos fuente
  for (const row of sourceData) {
    const hasIdCuenta = row.idCuenta && row.idCuenta.trim() !== '';
    const hasComitente = row.comitente && row.comitente.trim() !== '';
    const hasDescripcion = row.Descripcion && row.Descripcion.trim() !== '';
    
    if (hasIdCuenta || hasComitente || hasDescripcion) {
      sourceValidRows++;
      
      if (hasIdCuenta) {
        sourceIdCuentas.add(row.idCuenta.trim());
      }
      if (hasComitente) {
        sourceComitentes.add(row.comitente.trim());
      }
      if (row.Asesor && row.Asesor.trim() !== '') {
        sourceAsesores.add(row.Asesor.trim());
      }
    }
  }
  
  // Procesar datos actualizados
  for (const row of updatedData) {
    const hasIdCuenta = row.idCuenta && row.idCuenta.trim() !== '';
    const hasComitente = row.comitente && row.comitente.trim() !== '';
    const hasCuenta = row.cuenta && row.cuenta.trim() !== '';
    
    if (hasIdCuenta || hasComitente || hasCuenta) {
      updatedValidRows++;
      
      if (hasIdCuenta) {
        updatedIdCuentas.add(row.idCuenta.trim());
      }
      if (hasComitente) {
        updatedComitentes.add(row.comitente.trim());
      }
    }
  }
  
  // Validaciones
  
  // 1. Verificar que todas las filas del CSV fuente estén en el reporte actualizado
  const sourceKeys = new Set<string>();
  for (const row of sourceData) {
    const key = `${row.idCuenta || ''}_${row.comitente || ''}`;
    if (key !== '_') {
      sourceKeys.add(key);
    }
  }
  
  const updatedKeys = new Set<string>();
  for (const row of updatedData) {
    const key = `${row.idCuenta || ''}_${row.comitente || ''}`;
    if (key !== '_') {
      updatedKeys.add(key);
    }
  }
  
  for (const key of sourceKeys) {
    if (!updatedKeys.has(key)) {
      errors.push(`Fila del CSV fuente no encontrada en reporte actualizado: ${key}`);
    }
  }
  
  // 2. Verificar que no haya filas fantasma (filas en updated que no están en source)
  // Esto es solo una advertencia, no un error, porque el reporte puede tener filas adicionales
  const extraKeys = new Set<string>();
  for (const key of updatedKeys) {
    if (!sourceKeys.has(key)) {
      extraKeys.add(key);
    }
  }
  
  if (extraKeys.size > 0) {
    warnings.push(
      `El reporte actualizado contiene ${extraKeys.size} fila(s) que no están en el CSV fuente (puede ser esperado si hay datos adicionales)`
    );
  }
  
  // 3. Verificar que la transformación de Descripcion → cuenta sea correcta
  for (const sourceRow of sourceData) {
    if (sourceRow.Descripcion && sourceRow.idCuenta) {
      const matchingUpdated = updatedData.find(
        (r) => r.idCuenta === sourceRow.idCuenta && r.comitente === sourceRow.comitente
      );
      
      if (matchingUpdated) {
        if (matchingUpdated.cuenta !== sourceRow.Descripcion) {
          errors.push(
            `Transformación incorrecta: Descripcion "${sourceRow.Descripcion}" no coincide con cuenta "${matchingUpdated.cuenta}" para idCuenta ${sourceRow.idCuenta}`
          );
        }
      }
    }
  }
  
  // 4. Verificar que los datos financieros se preserven correctamente
  for (const sourceRow of sourceData) {
    if (sourceRow.idCuenta) {
      const matchingUpdated = updatedData.find(
        (r) => r.idCuenta === sourceRow.idCuenta && r.comitente === sourceRow.comitente
      );
      
      if (matchingUpdated) {
        const financialFields: (keyof SourceAumRow)[] = [
          'AUM en Dolares',
          'Bolsa Arg',
          'Fondos Arg',
          'Bolsa BCI',
          'pesos',
          'mep',
          'cable',
          'cv7000',
        ];
        
        for (const field of financialFields) {
          const sourceValue = sourceRow[field]?.trim() || '';
          const updatedValue = matchingUpdated[field as keyof ClusterReportRow]?.trim() || '';
          
          if (sourceValue !== updatedValue) {
            errors.push(
              `Valor financiero no coincide para ${field} en idCuenta ${sourceRow.idCuenta}: fuente="${sourceValue}", actualizado="${updatedValue}"`
            );
          }
        }
      }
    }
  }
  
  // 5. Verificar que Asesor y cv10000 se hayan eliminado (no deben estar en updated)
  // Esto se verifica implícitamente por la estructura de ClusterReportRow
  
  const stats = {
    totalRows: sourceData.length,
    validRows: sourceValidRows,
    skippedRows: sourceData.length - sourceValidRows,
    uniqueIdCuentas: sourceIdCuentas.size,
    uniqueComitentes: sourceComitentes.size,
    uniqueAsesores: sourceAsesores.size,
  };
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats,
  };
}

/**
 * Función principal que ejecuta el flujo completo: cargar, actualizar y validar
 */
export async function updateClusterReportFromSource(
  sourceFilePath: string,
  targetFilePath: string
): Promise<ValidationResult> {
  // 1. Cargar CSV fuente
  const sourceData = await loadAumCsv(sourceFilePath);
  
  // 2. Cargar reporte cluster existente (si existe)
  let existingData: ClusterReportRow[] = [];
  try {
    existingData = await loadClusterReport(targetFilePath);
  } catch (error) {
    // Si el archivo no existe, empezamos con un reporte vacío
    if (!(error instanceof Error && error.message.includes('ENOENT'))) {
      throw error;
    }
  }
  
  // 3. Actualizar reporte cluster
  const updatedData = updateClusterReport(sourceData, existingData);
  
  // 4. Validar actualización
  const validation = validateUpdate(sourceData, updatedData);
  
  // 5. Escribir reporte actualizado (solo si la validación es exitosa)
  if (validation.isValid) {
    await writeClusterReport(updatedData, targetFilePath);
  }
  
  return validation;
}

