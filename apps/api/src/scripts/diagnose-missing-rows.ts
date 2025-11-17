/**
 * Script de diagnóstico para investigar por qué las 36 filas con solo "Descripcion" no se insertan
 * 
 * Uso: pnpm -F @cactus/api tsx src/scripts/diagnose-missing-rows.ts
 */

import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { join } from 'path';
import { config } from 'dotenv';
import { mapAumColumns, normalizeColumnName } from '../utils/aum-column-mapper';

// Cargar .env
const projectRoot = join(__dirname, '..', '..', '..', '..');
config({ path: join(projectRoot, 'apps', 'api', '.env') });

const CSV_FILE = 'Balanz Cactus 2025 - AUM Balanz.csv';

interface CsvRow {
  idCuenta?: string;
  comitente?: string;
  Descripcion?: string;
  Asesor?: string;
  [key: string]: string | undefined;
}

function hasOnlyDescripcion(row: CsvRow): boolean {
  const hasIdCuenta = !!(row.idCuenta && row.idCuenta.trim().length > 0);
  const hasComitente = !!(row.comitente && row.comitente.trim().length > 0);
  const hasDescripcion = !!(row.Descripcion && row.Descripcion.trim().length > 0);
  return !hasIdCuenta && !hasComitente && hasDescripcion;
}

function hasAnyData(row: CsvRow): boolean {
  return Object.values(row).some(v => v && String(v).trim().length > 0);
}

function hasUsefulData(mapped: ReturnType<typeof mapAumColumns>): boolean {
  const hasValidHolderName = mapped.holderName && 
                             typeof mapped.holderName === 'string' && 
                             mapped.holderName.trim().length > 0;
  const hasValidIdCuenta = mapped.idCuenta && 
                           typeof mapped.idCuenta === 'string' && 
                           mapped.idCuenta.trim().length > 0;
  const hasValidAccountNumber = mapped.accountNumber && 
                                typeof mapped.accountNumber === 'string' && 
                                mapped.accountNumber.trim().length > 0;
  const hasFinancialData = mapped.aumDollars !== null || 
                           mapped.bolsaArg !== null || 
                           mapped.fondosArg !== null || 
                           mapped.bolsaBci !== null || 
                           mapped.pesos !== null || 
                           mapped.mep !== null || 
                           mapped.cable !== null || 
                           mapped.cv7000 !== null;
  
  return hasValidIdCuenta || 
         hasValidAccountNumber || 
         hasValidHolderName || 
         hasFinancialData;
}

async function diagnose() {
  console.log('='.repeat(80));
  console.log('DIAGNÓSTICO: Filas con solo Descripcion');
  console.log('='.repeat(80));
  console.log(`\nArchivo CSV: ${CSV_FILE}\n`);

  // 1. Parsear CSV
  console.log('1. Parseando CSV...');
  const csvPath = join(projectRoot, CSV_FILE);
  const csvContent = readFileSync(csvPath, 'utf-8');
  const csvRecords: CsvRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: false,
    trim: true
  });

  const csvValidRows = csvRecords.filter(hasAnyData);
  const csvOnlyDescripcionRows = csvValidRows.filter(hasOnlyDescripcion);

  console.log(`   Total filas CSV: ${csvRecords.length}`);
  console.log(`   Filas válidas: ${csvValidRows.length}`);
  console.log(`   Filas con solo Descripcion: ${csvOnlyDescripcionRows.length}\n`);

  // 2. Analizar cada fila con solo Descripcion
  console.log('2. Analizando mapeo de filas con solo Descripcion...\n');
  
  let passedHasAnyData = 0;
  let passedHasUsefulData = 0;
  let failedHasAnyData = 0;
  let failedHasUsefulData = 0;
  const failedRows: Array<{
    row: CsvRow;
    reason: string;
    mapped: ReturnType<typeof mapAumColumns>;
  }> = [];

  for (const row of csvOnlyDescripcionRows) {
    // Verificar hasAnyData
    const hasDescripcionColumn = row && typeof row === 'object' && Object.keys(row).some(k => {
      const normalized = normalizeColumnName(k);
      return normalized.includes('descripcion');
    });
    
    const descripcionValue = hasDescripcionColumn ? Object.entries(row).find(([k]) => {
      const normalized = normalizeColumnName(k);
      return normalized.includes('descripcion');
    })?.[1] : null;
    
    const hasValidDescripcion = descripcionValue !== null && 
                               descripcionValue !== undefined && 
                               descripcionValue !== '' &&
                               String(descripcionValue).trim().length > 0;
    
    const hasAnyDataResult = row && typeof row === 'object' && Object.keys(row).length > 0 && (
      hasValidDescripcion ||
      Object.values(row).some(v => {
        if (v === null || v === undefined || v === '') return false;
        const str = String(v).trim();
        return str.length > 0;
      })
    );

    if (!hasAnyDataResult) {
      failedHasAnyData++;
      failedRows.push({
        row,
        reason: 'Falla hasAnyData',
        mapped: mapAumColumns(row as Record<string, unknown>)
      });
      continue;
    }
    passedHasAnyData++;

    // Mapear columnas
    const mapped = mapAumColumns(row as Record<string, unknown>);
    
    // Verificar si Descripcion se mapeó manualmente
    if (!mapped.holderName || (mapped.holderName && mapped.holderName.trim().length === 0)) {
      const descripcionKey = Object.keys(row).find(k => {
        const normalized = normalizeColumnName(k);
        return normalized.includes('descripcion') || normalized === 'descripcion';
      });
      
      if (descripcionKey) {
        const descripcionValue = row[descripcionKey];
        if (descripcionValue !== null && descripcionValue !== undefined && descripcionValue !== '') {
          const descripcionStr = String(descripcionValue).trim();
          if (descripcionStr.length > 0) {
            mapped.holderName = descripcionStr;
          }
        }
      }
    }

    // Verificar hasUsefulData
    const hasUsefulDataResult = hasUsefulData(mapped);
    
    if (!hasUsefulDataResult) {
      failedHasUsefulData++;
      failedRows.push({
        row,
        reason: 'Falla hasUsefulData',
        mapped
      });
      continue;
    }
    passedHasUsefulData++;
  }

  // 3. Reporte
  console.log('3. RESULTADOS DEL DIAGNÓSTICO:\n');
  console.log(`   Filas que pasan hasAnyData: ${passedHasAnyData}/${csvOnlyDescripcionRows.length}`);
  console.log(`   Filas que pasan hasUsefulData: ${passedHasUsefulData}/${csvOnlyDescripcionRows.length}`);
  console.log(`   Filas que fallan hasAnyData: ${failedHasAnyData}`);
  console.log(`   Filas que fallan hasUsefulData: ${failedHasUsefulData}\n`);

  if (failedRows.length > 0) {
    console.log('4. FILAS QUE FALLAN:\n');
    failedRows.slice(0, 10).forEach((failed, i) => {
      console.log(`   ${i + 1}. "${failed.row.Descripcion?.trim()}"`);
      console.log(`      Razón: ${failed.reason}`);
      console.log(`      Mapeado:`);
      console.log(`        - holderName: "${failed.mapped.holderName || 'null'}"`);
      console.log(`        - idCuenta: "${failed.mapped.idCuenta || 'null'}"`);
      console.log(`        - accountNumber: "${failed.mapped.accountNumber || 'null'}"`);
      console.log(`        - advisorRaw: "${failed.mapped.advisorRaw || 'null'}"`);
      console.log(`        - aumDollars: ${failed.mapped.aumDollars ?? 'null'}`);
      console.log('');
    });
    if (failedRows.length > 10) {
      console.log(`   ... y ${failedRows.length - 10} más\n`);
    }
  }

  // 5. Verificar mapeo de "Descripcion"
  console.log('5. VERIFICACIÓN DE MAPEO DE "Descripcion":\n');
  const sampleRow = csvOnlyDescripcionRows[0];
  if (sampleRow) {
    console.log(`   Ejemplo de fila: "${sampleRow.Descripcion?.trim()}"`);
    console.log(`   Columnas disponibles: ${Object.keys(sampleRow).join(', ')}`);
    const mapped = mapAumColumns(sampleRow as Record<string, unknown>);
    console.log(`   Mapeo automático:`);
    console.log(`     - holderName: "${mapped.holderName || 'null'}"`);
    
    // Verificar mapeo manual
    if (!mapped.holderName || (mapped.holderName && mapped.holderName.trim().length === 0)) {
      const descripcionKey = Object.keys(sampleRow).find(k => {
        const normalized = normalizeColumnName(k);
        return normalized.includes('descripcion') || normalized === 'descripcion';
      });
      console.log(`   Mapeo manual necesario:`);
      console.log(`     - Columna encontrada: "${descripcionKey || 'null'}"`);
      if (descripcionKey) {
        const descripcionValue = sampleRow[descripcionKey];
        console.log(`     - Valor: "${descripcionValue || 'null'}"`);
        if (descripcionValue) {
          mapped.holderName = String(descripcionValue).trim();
          console.log(`     - Mapeado a holderName: "${mapped.holderName}"`);
        }
      }
    }
    console.log(`   Resultado final:`);
    console.log(`     - holderName: "${mapped.holderName || 'null'}"`);
    console.log(`     - hasUsefulData: ${hasUsefulData(mapped)}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('CONCLUSIÓN');
  console.log('='.repeat(80));
  
  if (failedRows.length === 0 && passedHasUsefulData === csvOnlyDescripcionRows.length) {
    console.log('\n✅ Todas las filas pasan las validaciones.');
    console.log('   El problema debe estar en la inserción/actualización en la base de datos.');
  } else {
    console.log(`\n⚠️  ${failedRows.length} filas fallan las validaciones.`);
    console.log('   Revisar la lógica de validación y mapeo.');
  }
  
  console.log('\n');
}

diagnose().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});










