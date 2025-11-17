#!/usr/bin/env tsx
/**
 * Script de verificación completa de importación AUM
 * 
 * Compara el CSV original con la base de datos para verificar:
 * - ✅ Conteo de filas (CSV vs DB)
 * - ✅ Filas faltantes en la base de datos
 * - ✅ Filas en DB que no están en CSV
 * - ✅ Discrepancias en campos básicos (idCuenta, comitente, Descripcion, Asesor)
 * - ✅ Discrepancias en campos financieros (AUM USD, Bolsa Arg, Fondos Arg, Bolsa BCI, Pesos, MEP, Cable, CV7000)
 * - ✅ Filas con solo Descripcion (sin idCuenta ni comitente)
 * 
 * Uso:
 *   pnpm -F @cactus/api verify-aum-import
 *   pnpm -F @cactus/api verify-aum-import --file "nombre-archivo.csv"
 *   pnpm -F @cactus/api verify-aum-import --file-id "uuid-del-archivo"
 * 
 * Configuración:
 *   Edita las constantes CSV_FILE y BROKER al inicio del archivo, o usa argumentos de línea de comandos.
 */

import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { join } from 'path';
import { config } from 'dotenv';
import { db } from '@cactus/db';
import { sql, eq, desc } from 'drizzle-orm';
import { aumImportFiles, aumImportRows } from '@cactus/db/schema';
import { mapAumColumns } from '../utils/aum-column-mapper';

// Cargar .env
const projectRoot = join(__dirname, '..', '..', '..', '..');
config({ path: join(projectRoot, 'apps', 'api', '.env') });

// ==========================================================
// CONFIGURACIÓN
// ==========================================================

// Valores por defecto (pueden ser sobrescritos por argumentos de línea de comandos)
const DEFAULT_CSV_FILE = 'Balanz Cactus 2025 - AUM Balanz.csv';
const DEFAULT_BROKER = 'balanz';

// Parsear argumentos de línea de comandos
function parseArgs(): { csvFile?: string; fileId?: string; broker?: string } {
  const args = process.argv.slice(2);
  const result: { csvFile?: string; fileId?: string; broker?: string } = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      result.csvFile = args[i + 1];
      i++;
    } else if (args[i] === '--file-id' && args[i + 1]) {
      result.fileId = args[i + 1];
      i++;
    } else if (args[i] === '--broker' && args[i + 1]) {
      result.broker = args[i + 1];
      i++;
    }
  }
  
  return result;
}

// ==========================================================
// TIPOS
// ==========================================================

interface CsvRow {
  idCuenta?: string;
  comitente?: string;
  Descripcion?: string;
  Asesor?: string;
  aumDollars?: number | null;
  bolsaArg?: number | null;
  fondosArg?: number | null;
  bolsaBci?: number | null;
  pesos?: number | null;
  mep?: number | null;
  cable?: number | null;
  cv7000?: number | null;
  [key: string]: string | number | null | undefined;
}

interface DbRow {
  id: string;
  holder_name: string | null;
  account_number: string | null;
  id_cuenta: string | null;
  advisor_raw: string | null;
  aum_dollars: string | null;
  bolsa_arg: string | null;
  fondos_arg: string | null;
  bolsa_bci: string | null;
  pesos: string | null;
  mep: string | null;
  cable: string | null;
  cv7000: string | null;
  [key: string]: string | null | undefined;
}

interface VerificationResult {
  csvTotalRows: number;
  csvValidRows: number;
  dbTotalRows: number;
  discrepancy: number;
  missingInDb: CsvRow[];
  missingInCsv: DbRow[];
  mappingErrors: Array<{
    csvRow: CsvRow;
    dbRow: DbRow | null;
    error: string;
  }>;
  valueMismatches: Array<{
    csvRow: CsvRow;
    dbRow: DbRow;
    field: string;
    csvValue: string | null;
    dbValue: string | null;
  }>;
  onlyDescripcionRows: {
    csv: number;
    db: number;
    missing: CsvRow[];
  };
  financialFieldsStats: {
    field: string;
    name: string;
    discrepancies: number;
  }[];
}

// ==========================================================
// FUNCIONES DE UTILIDAD
// ==========================================================

function normalizeValue(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).trim().toLowerCase();
}

function valuesMatch(val1: string | null | undefined, val2: string | null | undefined): boolean {
  return normalizeValue(val1) === normalizeValue(val2);
}

/**
 * Compara valores numéricos con tolerancia a diferencias de precisión
 * Maneja null/undefined, strings numéricos y números
 */
function numericValuesMatch(
  csvValue: number | null | undefined,
  dbValue: string | null | undefined,
  tolerance: number = 0.01
): boolean {
  // Ambos null/undefined = match
  if ((csvValue === null || csvValue === undefined) && (dbValue === null || dbValue === undefined || dbValue === '')) {
    return true;
  }
  
  // Uno null y el otro no = mismatch
  if ((csvValue === null || csvValue === undefined) !== (dbValue === null || dbValue === undefined || dbValue === '')) {
    return false;
  }
  
  // Convertir DB value (string) a número
  let dbNum: number | null = null;
  if (dbValue !== null && dbValue !== undefined && dbValue.trim() !== '') {
    const parsed = parseFloat(dbValue.trim());
    if (!isNaN(parsed) && isFinite(parsed)) {
      dbNum = parsed;
    }
  }
  
  // Si CSV es null pero DB tiene número (o viceversa) = mismatch
  if ((csvValue === null || csvValue === undefined) !== (dbNum === null)) {
    return false;
  }
  
  // Ambos tienen valores, comparar con tolerancia
  if (csvValue !== null && csvValue !== undefined && dbNum !== null) {
    const diff = Math.abs(csvValue - dbNum);
    return diff <= tolerance;
  }
  
  // Ambos son null = match (ya manejado arriba, pero por seguridad)
  return true;
}

function hasAnyData(row: CsvRow): boolean {
  return Object.values(row).some(v => v && String(v).trim().length > 0);
}

function hasOnlyDescripcion(row: CsvRow): boolean {
  const hasIdCuenta = !!(row.idCuenta && row.idCuenta.trim().length > 0);
  const hasComitente = !!(row.comitente && row.comitente.trim().length > 0);
  const hasDescripcion = !!(row.Descripcion && row.Descripcion.trim().length > 0);
  return !hasIdCuenta && !hasComitente && hasDescripcion;
}

function findMatchingDbRow(
  csvRow: CsvRow,
  dbRows: DbRow[]
): DbRow | null {
  const idCuenta = csvRow.idCuenta?.trim();
  const comitente = csvRow.comitente?.trim();
  const descripcion = csvRow.Descripcion?.trim();

  // Prioridad 1: Buscar por idCuenta
  if (idCuenta) {
    const match = dbRows.find(r => valuesMatch(r.id_cuenta, idCuenta));
    if (match) return match;
  }

  // Prioridad 2: Buscar por account_number (comitente)
  if (comitente) {
    const match = dbRows.find(r => valuesMatch(r.account_number, comitente));
    if (match) return match;
  }

  // Prioridad 3: Buscar por holderName + advisorRaw
  if (descripcion && csvRow.Asesor?.trim()) {
    const advisor = csvRow.Asesor.trim();
    const match = dbRows.find(r => 
      valuesMatch(r.holder_name, descripcion) &&
      valuesMatch(r.advisor_raw, advisor)
    );
    if (match) return match;
  }

  // Prioridad 4: Buscar solo por holderName (para filas con solo Descripcion)
  if (descripcion && !idCuenta && !comitente) {
    const match = dbRows.find(r => 
      valuesMatch(r.holder_name, descripcion) &&
      (!r.id_cuenta || r.id_cuenta.trim() === '') &&
      (!r.account_number || r.account_number.trim() === '')
    );
    if (match) return match;
  }

  return null;
}

// ==========================================================
// FUNCIÓN PRINCIPAL DE VERIFICACIÓN
// ==========================================================

async function verifyImport(
  csvFile: string,
  broker: string,
  fileId?: string
): Promise<VerificationResult> {
  console.log('='.repeat(80));
  console.log('VERIFICACIÓN COMPLETA DE IMPORTACIÓN AUM');
  console.log('='.repeat(80));
  console.log(`\nArchivo CSV: ${csvFile}`);
  console.log(`Broker: ${broker}`);
  if (fileId) {
    console.log(`File ID: ${fileId}`);
  }
  console.log('');

  // 1. Parsear CSV
  console.log('1. Parseando CSV...');
  const csvPath = join(projectRoot, csvFile);
  console.log(`   Buscando CSV en: ${csvPath}`);
  
  let csvContent: string;
  try {
    csvContent = readFileSync(csvPath, 'utf-8');
  } catch (error) {
    throw new Error(`No se pudo leer el archivo CSV: ${csvPath}\nError: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  const csvRecordsRaw = parse(csvContent, {
    columns: true,
    skip_empty_lines: false,
    trim: true,
    relax_column_count: true
  }) as Record<string, unknown>[];

  // Mapear columnas del CSV usando mapAumColumns para obtener valores financieros
  const csvRecords: CsvRow[] = csvRecordsRaw.map((record: Record<string, unknown>) => {
    const mapped = mapAumColumns(record);
    const result: CsvRow = {
      ...(record as Record<string, string | number | null | undefined>)
    };
    
    // Asignar valores solo si no son null/undefined (para exactOptionalPropertyTypes)
    if (mapped.idCuenta) result.idCuenta = mapped.idCuenta;
    if (mapped.accountNumber) result.comitente = mapped.accountNumber;
    if (mapped.holderName) result.Descripcion = mapped.holderName;
    if (mapped.advisorRaw) result.Asesor = mapped.advisorRaw;
    
    // Campos financieros pueden ser null, así que siempre asignarlos
    result.aumDollars = mapped.aumDollars;
    result.bolsaArg = mapped.bolsaArg;
    result.fondosArg = mapped.fondosArg;
    result.bolsaBci = mapped.bolsaBci;
    result.pesos = mapped.pesos;
    result.mep = mapped.mep;
    result.cable = mapped.cable;
    result.cv7000 = mapped.cv7000;
    
    return result;
  });

  const csvValidRows = csvRecords.filter(hasAnyData);
  const csvOnlyDescripcionRows = csvValidRows.filter(hasOnlyDescripcion);

  console.log(`   Total filas CSV: ${csvRecords.length}`);
  console.log(`   Filas válidas: ${csvValidRows.length}`);
  console.log(`   Filas con solo Descripcion: ${csvOnlyDescripcionRows.length}`);

  // 2. Buscar archivo en base de datos
  console.log('\n2. Buscando archivo en base de datos...');
  const dbi = db();
  
  let file;
  if (fileId) {
    const files = await dbi
      .select()
      .from(aumImportFiles)
      .where(eq(aumImportFiles.id, fileId))
      .limit(1);
    
    if (files.length === 0) {
      throw new Error(`No se encontró el archivo con ID "${fileId}" en la base de datos`);
    }
    file = files[0];
  } else {
    const files = await dbi
      .select()
      .from(aumImportFiles)
      .where(eq(aumImportFiles.originalFilename, csvFile))
      .orderBy(desc(aumImportFiles.createdAt))
      .limit(5);
    
    if (files.length === 0) {
      throw new Error(`No se encontró el archivo "${csvFile}" en la base de datos`);
    }
    
    file = files[0];
    if (files.length > 1) {
      console.log(`\n   ℹ️  Se encontraron ${files.length} importaciones de este archivo.`);
      console.log(`      Verificando la más reciente (${file.createdAt}).`);
      console.log(`      Si quieres verificar otra, usa: --file-id "${files[1]?.id}"`);
    }
  }
  
  console.log(`   ✅ Archivo encontrado:`);
  console.log(`      ID: ${file.id}`);
  console.log(`      Status: ${file.status}`);
  console.log(`      total_parsed: ${file.totalParsed}`);
  console.log(`      Creado: ${file.createdAt}`);

  // 3. Obtener todas las filas de la base de datos
  console.log('\n3. Obteniendo filas de la base de datos...');
  const dbRowsResult = await dbi.execute(sql`
    SELECT 
      id,
      holder_name,
      account_number,
      id_cuenta,
      advisor_raw,
      aum_dollars,
      bolsa_arg,
      fondos_arg,
      bolsa_bci,
      pesos,
      mep,
      cable,
      cv7000,
      match_status
    FROM aum_import_rows
    WHERE file_id = ${file.id}
    ORDER BY 
      COALESCE(id_cuenta, ''),
      COALESCE(account_number, ''),
      COALESCE(holder_name, '')
  `);

  const dbRows: DbRow[] = (dbRowsResult.rows || []) as DbRow[];
  const dbOnlyHolderNameRows = dbRows.filter(r => 
    (!r.id_cuenta || r.id_cuenta.trim() === '') &&
    (!r.account_number || r.account_number.trim() === '') &&
    r.holder_name && r.holder_name.trim().length > 0
  );

  console.log(`   Total filas en DB: ${dbRows.length}`);
  console.log(`   Filas con solo holderName: ${dbOnlyHolderNameRows.length}`);

  // 4. Comparar y encontrar discrepancias
  console.log('\n4. Comparando CSV con base de datos...');
  
  const missingInDb: CsvRow[] = [];
  const mappingErrors: Array<{ csvRow: CsvRow; dbRow: DbRow | null; error: string }> = [];
  const valueMismatches: Array<{ csvRow: CsvRow; dbRow: DbRow; field: string; csvValue: string | null; dbValue: string | null }> = [];
  const matchedDbRowIds = new Set<string>();
  
  // Estadísticas de campos financieros
  const financialFieldsStats = new Map<string, number>();
  const fieldNames: Record<string, string> = {
    'aum_dollars': 'AUM USD',
    'bolsa_arg': 'Bolsa Arg',
    'fondos_arg': 'Fondos Arg',
    'bolsa_bci': 'Bolsa BCI',
    'pesos': 'Pesos',
    'mep': 'MEP',
    'cable': 'Cable',
    'cv7000': 'CV7000'
  };

  for (const csvRow of csvValidRows) {
    const dbRow = findMatchingDbRow(csvRow, dbRows);
    
    if (!dbRow) {
      missingInDb.push(csvRow);
      mappingErrors.push({
        csvRow,
        dbRow: null,
        error: 'No se encontró fila correspondiente en la base de datos'
      });
      continue;
    }

    matchedDbRowIds.add(dbRow.id);

    // Verificar mapeo de campos clave
    const idCuenta = csvRow.idCuenta?.trim();
    const comitente = csvRow.comitente?.trim();
    const descripcion = csvRow.Descripcion?.trim();
    const asesor = csvRow.Asesor?.trim();

    // Verificar idCuenta
    if (idCuenta && !valuesMatch(dbRow.id_cuenta, idCuenta)) {
      valueMismatches.push({
        csvRow,
        dbRow,
        field: 'idCuenta',
        csvValue: idCuenta,
        dbValue: dbRow.id_cuenta
      });
    }

    // Verificar account_number (comitente)
    if (comitente && !valuesMatch(dbRow.account_number, comitente)) {
      valueMismatches.push({
        csvRow,
        dbRow,
        field: 'account_number',
        csvValue: comitente,
        dbValue: dbRow.account_number
      });
    }

    // Verificar holderName (Descripcion)
    if (descripcion && !valuesMatch(dbRow.holder_name, descripcion)) {
      valueMismatches.push({
        csvRow,
        dbRow,
        field: 'holder_name',
        csvValue: descripcion,
        dbValue: dbRow.holder_name
      });
    }

    // Verificar advisorRaw (Asesor) - puede ser null en algunos CSVs
    if (asesor && !valuesMatch(dbRow.advisor_raw, asesor)) {
      valueMismatches.push({
        csvRow,
        dbRow,
        field: 'advisor_raw',
        csvValue: asesor,
        dbValue: dbRow.advisor_raw
      });
    }

    // Verificar campos financieros
    const financialFields = [
      { csvKey: 'aumDollars', dbKey: 'aum_dollars', name: 'AUM USD' },
      { csvKey: 'bolsaArg', dbKey: 'bolsa_arg', name: 'Bolsa Arg' },
      { csvKey: 'fondosArg', dbKey: 'fondos_arg', name: 'Fondos Arg' },
      { csvKey: 'bolsaBci', dbKey: 'bolsa_bci', name: 'Bolsa BCI' },
      { csvKey: 'pesos', dbKey: 'pesos', name: 'Pesos' },
      { csvKey: 'mep', dbKey: 'mep', name: 'MEP' },
      { csvKey: 'cable', dbKey: 'cable', name: 'Cable' },
      { csvKey: 'cv7000', dbKey: 'cv7000', name: 'CV7000' }
    ];

    for (const field of financialFields) {
      const csvValue = csvRow[field.csvKey] as number | null | undefined;
      const dbValue = dbRow[field.dbKey];
      
      if (!numericValuesMatch(csvValue, dbValue)) {
        const csvValueStr: string | null = csvValue !== null && csvValue !== undefined ? String(csvValue) : null;
        valueMismatches.push({
          csvRow,
          dbRow,
          field: field.dbKey,
          csvValue: csvValueStr,
          dbValue: dbValue ?? null
        });
        
        // Actualizar estadísticas
        const current = financialFieldsStats.get(field.dbKey) || 0;
        financialFieldsStats.set(field.dbKey, current + 1);
      }
    }
  }

  // 5. Encontrar filas en DB que no están en CSV
  const missingInCsv: DbRow[] = dbRows.filter(r => !matchedDbRowIds.has(r.id));

  // 6. Verificar filas con solo Descripcion
  const missingOnlyDescripcion: CsvRow[] = [];
  for (const csvRow of csvOnlyDescripcionRows) {
    const dbRow = findMatchingDbRow(csvRow, dbRows);
    if (!dbRow) {
      missingOnlyDescripcion.push(csvRow);
    }
  }

  // Construir estadísticas de campos financieros
  const financialFieldsStatsArray = Array.from(financialFieldsStats.entries()).map(([field, count]) => ({
    field,
    name: fieldNames[field] || field,
    discrepancies: count
  }));

  const result: VerificationResult = {
    csvTotalRows: csvRecords.length,
    csvValidRows: csvValidRows.length,
    dbTotalRows: dbRows.length,
    discrepancy: csvValidRows.length - dbRows.length,
    missingInDb,
    missingInCsv,
    mappingErrors,
    valueMismatches,
    onlyDescripcionRows: {
      csv: csvOnlyDescripcionRows.length,
      db: dbOnlyHolderNameRows.length,
      missing: missingOnlyDescripcion
    },
    financialFieldsStats: financialFieldsStatsArray
  };

  return result;
}

// ==========================================================
// FUNCIÓN DE REPORTE
// ==========================================================

function printReport(result: VerificationResult): void {
  const fieldNames: Record<string, string> = {
    'aum_dollars': 'AUM USD',
    'bolsa_arg': 'Bolsa Arg',
    'fondos_arg': 'Fondos Arg',
    'bolsa_bci': 'Bolsa BCI',
    'pesos': 'Pesos',
    'mep': 'MEP',
    'cable': 'Cable',
    'cv7000': 'CV7000'
  };

  console.log('\n' + '='.repeat(80));
  console.log('REPORTE DE VERIFICACIÓN');
  console.log('='.repeat(80));

  // Resumen general
  console.log('\n📊 RESUMEN GENERAL:');
  console.log(`   CSV filas válidas: ${result.csvValidRows}`);
  console.log(`   DB filas cargadas: ${result.dbTotalRows}`);
  console.log(`   Diferencia: ${result.discrepancy}`);
  
  if (result.discrepancy === 0) {
    console.log('   ✅ Los conteos coinciden');
  } else if (result.discrepancy > 0) {
    console.log(`   ⚠️  Faltan ${result.discrepancy} filas en la base de datos`);
  } else {
    console.log(`   ⚠️  Hay ${Math.abs(result.discrepancy)} filas más en la base de datos`);
  }

  // Filas con solo Descripcion
  console.log('\n📋 FILAS CON SOLO DESCRIPCION:');
  console.log(`   CSV: ${result.onlyDescripcionRows.csv}`);
  console.log(`   DB: ${result.onlyDescripcionRows.db}`);
  console.log(`   Faltantes: ${result.onlyDescripcionRows.missing.length}`);
  
  if (result.onlyDescripcionRows.missing.length > 0) {
    console.log('\n   Filas faltantes:');
    result.onlyDescripcionRows.missing.slice(0, 10).forEach((row, i) => {
      console.log(`   ${i + 1}. "${row.Descripcion?.trim()}"`);
    });
    if (result.onlyDescripcionRows.missing.length > 10) {
      console.log(`   ... y ${result.onlyDescripcionRows.missing.length - 10} más`);
    }
  }

  // Filas faltantes en DB
  if (result.missingInDb.length > 0) {
    console.log('\n❌ FILAS FALTANTES EN BASE DE DATOS:');
    console.log(`   Total: ${result.missingInDb.length}`);
    result.missingInDb.slice(0, 10).forEach((row, i) => {
      const idCuenta = row.idCuenta?.trim() || 'N/A';
      const comitente = row.comitente?.trim() || 'N/A';
      const descripcion = row.Descripcion?.trim() || 'N/A';
      console.log(`   ${i + 1}. idCuenta: ${idCuenta}, comitente: ${comitente}, Descripcion: "${descripcion}"`);
    });
    if (result.missingInDb.length > 10) {
      console.log(`   ... y ${result.missingInDb.length - 10} más`);
    }
  }

  // Filas en DB que no están en CSV
  if (result.missingInCsv.length > 0) {
    console.log('\n⚠️  FILAS EN BASE DE DATOS QUE NO ESTÁN EN CSV:');
    console.log(`   Total: ${result.missingInCsv.length}`);
    result.missingInCsv.slice(0, 10).forEach((row, i) => {
      const idCuenta = row.id_cuenta || 'N/A';
      const accountNumber = row.account_number || 'N/A';
      const holderName = row.holder_name || 'N/A';
      console.log(`   ${i + 1}. idCuenta: ${idCuenta}, account_number: ${accountNumber}, holder_name: "${holderName}"`);
    });
    if (result.missingInCsv.length > 10) {
      console.log(`   ... y ${result.missingInCsv.length - 10} más`);
    }
  }

  // Errores de mapeo
  if (result.mappingErrors.length > 0) {
    console.log('\n🔍 ERRORES DE MAPEO:');
    console.log(`   Total: ${result.mappingErrors.length}`);
    result.mappingErrors.slice(0, 10).forEach((error, i) => {
      const descripcion = error.csvRow.Descripcion?.trim() || 'N/A';
      console.log(`   ${i + 1}. "${descripcion}": ${error.error}`);
    });
    if (result.mappingErrors.length > 10) {
      console.log(`   ... y ${result.mappingErrors.length - 10} más`);
    }
  }

  // Discrepancias de valores
  if (result.valueMismatches.length > 0) {
    console.log('\n⚠️  DISCREPANCIAS DE VALORES:');
    console.log(`   Total: ${result.valueMismatches.length}`);
    
    // Separar discrepancias de campos básicos y financieros
    const basicFields = ['idCuenta', 'account_number', 'holder_name', 'advisor_raw'];
    const basicMismatches = result.valueMismatches.filter(m => basicFields.includes(m.field));
    const financialMismatches = result.valueMismatches.filter(m => !basicFields.includes(m.field));
    
    // Mostrar discrepancias de campos básicos
    if (basicMismatches.length > 0) {
      console.log(`\n   📋 Campos básicos (${basicMismatches.length}):`);
      basicMismatches.slice(0, 10).forEach((mismatch, i) => {
        const descripcion = mismatch.csvRow.Descripcion?.trim() || 'N/A';
        const idCuenta = mismatch.csvRow.idCuenta?.trim() || 'N/A';
        const comitente = mismatch.csvRow.comitente?.trim() || 'N/A';
        console.log(`   ${i + 1}. "${descripcion}" (idCuenta: ${idCuenta}, comitente: ${comitente}) - Campo: ${mismatch.field}`);
        console.log(`      CSV: "${mismatch.csvValue}"`);
        console.log(`      DB:  "${mismatch.dbValue}"`);
      });
      if (basicMismatches.length > 10) {
        console.log(`   ... y ${basicMismatches.length - 10} más`);
      }
    }
    
    // Mostrar discrepancias de campos financieros
    if (financialMismatches.length > 0) {
      console.log(`\n   💰 Campos financieros (${financialMismatches.length}):`);
      
      // Estadísticas por campo financiero
      if (result.financialFieldsStats.length > 0) {
        console.log(`   Estadísticas por campo:`);
        result.financialFieldsStats.forEach(stat => {
          console.log(`      - ${stat.name}: ${stat.discrepancies} discrepancias`);
        });
      }
      
      console.log(`\n   Ejemplos de discrepancias:`);
      financialMismatches.slice(0, 15).forEach((mismatch, i) => {
        const descripcion = mismatch.csvRow.Descripcion?.trim() || 'N/A';
        const idCuenta = mismatch.csvRow.idCuenta?.trim() || 'N/A';
        const comitente = mismatch.csvRow.comitente?.trim() || 'N/A';
        const fieldName = fieldNames[mismatch.field] || mismatch.field;
        console.log(`   ${i + 1}. "${descripcion}" (idCuenta: ${idCuenta}, comitente: ${comitente}) - Campo: ${fieldName}`);
        console.log(`      CSV: ${mismatch.csvValue !== null ? mismatch.csvValue : 'null'}`);
        console.log(`      DB:  ${mismatch.dbValue !== null ? mismatch.dbValue : 'null'}`);
      });
      if (financialMismatches.length > 15) {
        console.log(`   ... y ${financialMismatches.length - 15} más`);
      }
    }
  }

  // Resumen final
  console.log('\n' + '='.repeat(80));
  console.log('RESUMEN FINAL');
  console.log('='.repeat(80));
  
  const totalIssues = 
    result.missingInDb.length +
    result.missingInCsv.length +
    result.valueMismatches.length;

  if (totalIssues === 0 && result.discrepancy === 0) {
    console.log('\n✅ VERIFICACIÓN EXITOSA');
    console.log('   Todos los datos están correctamente cargados y mapeados.');
    console.log('   Puedes confiar en que la información está correcta.');
  } else {
    console.log('\n⚠️  VERIFICACIÓN CON DISCREPANCIAS');
    console.log(`   Total de problemas encontrados: ${totalIssues}`);
    console.log(`   - Filas faltantes en DB: ${result.missingInDb.length}`);
    console.log(`   - Filas en DB no en CSV: ${result.missingInCsv.length}`);
    console.log(`   - Discrepancias de valores: ${result.valueMismatches.length}`);
  }
  
  console.log('');
}

// ==========================================================
// MAIN
// ==========================================================

async function main() {
  try {
    const args = parseArgs();
    const csvFile = args.csvFile || DEFAULT_CSV_FILE;
    const broker = args.broker || DEFAULT_BROKER;
    const fileId = args.fileId;

    const result = await verifyImport(csvFile, broker, fileId);
    printReport(result);
    
    // Exit code basado en resultados
    const totalIssues = 
      result.missingInDb.length +
      result.missingInCsv.length +
      result.valueMismatches.length;
    
    if (totalIssues === 0 && result.discrepancy === 0) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error durante la verificación:');
    console.error(error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    console.error('\n💡 Ayuda:');
    console.error('   - Verifica que el archivo CSV existe en la raíz del proyecto');
    console.error('   - Verifica que el archivo haya sido importado en el sistema');
    console.error('   - Usa --file-id para verificar una importación específica');
    console.error('   - Usa --file para especificar un archivo diferente');
    process.exit(1);
  }
}

main();
