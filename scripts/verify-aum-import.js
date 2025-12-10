/**
 * Script de verificación de importación AUM
 *
 * Compara los datos de los CSVs con los datos cargados en la base de datos
 * para asegurar que la importación fue correcta.
 *
 * Uso: node scripts/verify-aum-import.js
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Configuración
const CSV1_PATH = path.join(__dirname, '..', 'Balanz Cactus 2025 - AUM Balanz.csv');
const CSV2_PATH = path.join(__dirname, '..', 'reporteClusterCuentasV2.csv');
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const API_ENDPOINT = `${API_BASE_URL}/v1/admin/aum/rows/all`;

// Helper para parsear números (igual que en el backend)
function parseNumeric(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? null : value;
  }
  const strValue = String(value).trim();
  if (strValue === '' || strValue === '-' || strValue === '--' || strValue === '—') {
    return null;
  }
  if (
    strValue === '0' ||
    strValue === '0.00' ||
    strValue === '0,00' ||
    strValue === '0.0' ||
    strValue === '0,0' ||
    strValue === '0.000000' ||
    strValue === '0,000000' ||
    /^0+([.,]0+)?$/.test(strValue)
  ) {
    return 0;
  }
  const parsed = parseFloat(strValue.replace(',', '.'));
  if (parsed === 0) return 0;
  return isNaN(parsed) || !isFinite(parsed) ? null : parsed;
}

// Helper para normalizar strings
function normalizeString(str) {
  if (!str) return null;
  const normalized = String(str).trim();
  return normalized === '' ? null : normalized;
}

// Helper para comparar números (con tolerancia para redondeo)
function compareNumbers(a, b, tolerance = 0.01) {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return Math.abs(a - b) <= tolerance;
}

// Leer y parsear CSV
function readCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_quotes: true,
    cast: false,
  });
  return records;
}

// Mapear columnas del CSV a formato interno
function mapCSVRow(record, isCSV1) {
  const idCuenta = normalizeString(record.idCuenta || record['idCuenta']);
  const comitente = normalizeString(record.comitente || record['comitente']);
  const cuenta = normalizeString(
    record.cuenta || record.Descripcion || record['cuenta'] || record['Descripcion']
  );
  const asesor = normalizeString(
    record.Asesor || record['Asesor'] || record.asesor || record['asesor']
  );

  return {
    idCuenta,
    accountNumber: comitente,
    holderName: cuenta,
    advisorRaw: asesor,
    aumDollars: parseNumeric(record['AUM en Dolares'] || record['AUM en Dolares']),
    bolsaArg: parseNumeric(record['Bolsa Arg'] || record['Bolsa Arg']),
    fondosArg: parseNumeric(record['Fondos Arg'] || record['Fondos Arg']),
    bolsaBci: parseNumeric(record['Bolsa BCI'] || record['Bolsa BCI']),
    pesos: parseNumeric(record.pesos || record['pesos']),
    mep: parseNumeric(record.mep || record['mep']),
    cable: parseNumeric(record.cable || record['cable']),
    cv7000: parseNumeric(record.cv7000 || record['cv7000']),
  };
}

// Obtener todos los datos de la API
async function fetchAllAumRows() {
  const allRows = [];
  let offset = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    try {
      const url = `${API_ENDPOINT}?limit=${limit}&offset=${offset}&preferredOnly=false`;
      const response = await fetch(url, {
        headers: {
          Cookie: process.env.AUTH_COOKIE || '', // Necesitarás autenticación
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.ok || !data.rows) {
        throw new Error('Invalid API response');
      }

      allRows.push(...data.rows);
      hasMore = data.pagination?.hasMore || false;
      offset += limit;

      console.log(`Fetched ${allRows.length} rows so far...`);
    } catch (error) {
      console.error('Error fetching from API:', error.message);
      throw error;
    }
  }

  return allRows;
}

// Crear clave única para identificar filas
function createRowKey(row) {
  // Priorizar accountNumber, luego idCuenta, luego holderName
  if (row.accountNumber) {
    return `account:${row.accountNumber}`;
  }
  if (row.idCuenta) {
    return `idcuenta:${row.idCuenta}`;
  }
  if (row.holderName) {
    return `holder:${row.holderName}`;
  }
  return null;
}

// Comparar dos filas
function compareRows(csvRow, dbRow, source) {
  const discrepancies = [];

  // Comparar identificadores
  if (csvRow.accountNumber && dbRow.accountNumber && csvRow.accountNumber !== dbRow.accountNumber) {
    discrepancies.push({
      field: 'accountNumber',
      csv: csvRow.accountNumber,
      db: dbRow.accountNumber,
      source,
    });
  }

  if (csvRow.idCuenta && dbRow.idCuenta && csvRow.idCuenta !== dbRow.idCuenta) {
    discrepancies.push({
      field: 'idCuenta',
      csv: csvRow.idCuenta,
      db: dbRow.idCuenta,
      source,
    });
  }

  if (csvRow.holderName && dbRow.holderName && csvRow.holderName !== dbRow.holderName) {
    discrepancies.push({
      field: 'holderName',
      csv: csvRow.holderName,
      db: dbRow.holderName,
      source,
    });
  }

  // Comparar valores financieros
  const financialFields = [
    'aumDollars',
    'bolsaArg',
    'fondosArg',
    'bolsaBci',
    'pesos',
    'mep',
    'cable',
    'cv7000',
  ];
  for (const field of financialFields) {
    if (!compareNumbers(csvRow[field], dbRow[field])) {
      discrepancies.push({
        field,
        csv: csvRow[field],
        db: dbRow[field],
        source,
      });
    }
  }

  // Comparar asesor (solo si CSV1 tiene asesor, CSV2 no lo tiene)
  if (
    source === 'CSV1' &&
    csvRow.advisorRaw &&
    dbRow.advisorRaw &&
    csvRow.advisorRaw !== dbRow.advisorRaw
  ) {
    discrepancies.push({
      field: 'advisorRaw',
      csv: csvRow.advisorRaw,
      db: dbRow.advisorRaw,
      source,
      note: 'Asesor debería preservarse del CSV1',
    });
  }

  return discrepancies;
}

// Función principal
async function main() {
  console.log('🔍 Iniciando verificación de importación AUM...\n');

  // 1. Leer CSVs
  console.log('📄 Leyendo CSVs...');
  const csv1Rows = readCSV(CSV1_PATH);
  const csv2Rows = readCSV(CSV2_PATH);
  console.log(`   CSV1: ${csv1Rows.length} filas`);
  console.log(`   CSV2: ${csv2Rows.length} filas\n`);

  // 2. Mapear CSVs
  console.log('🔄 Mapeando datos de CSVs...');
  const csv1Mapped = csv1Rows.map((r) => mapCSVRow(r, true));
  const csv2Mapped = csv2Rows.map((r) => mapCSVRow(r, false));
  console.log(`   CSV1 mapeado: ${csv1Mapped.length} filas`);
  console.log(`   CSV2 mapeado: ${csv2Mapped.length} filas\n`);

  // 3. Obtener datos de la API
  console.log('🌐 Obteniendo datos de la API...');
  let dbRows;
  try {
    dbRows = await fetchAllAumRows();
    console.log(`   API: ${dbRows.length} filas obtenidas\n`);
  } catch (error) {
    console.error('❌ Error al obtener datos de la API:', error.message);
    console.log('\n⚠️  Continuando solo con comparación de CSVs...\n');
    dbRows = [];
  }

  // 4. Crear índices para búsqueda rápida
  const csv1Index = new Map();
  const csv2Index = new Map();
  const dbIndex = new Map();

  csv1Mapped.forEach((row, idx) => {
    const key = createRowKey(row);
    if (key) {
      if (!csv1Index.has(key)) {
        csv1Index.set(key, []);
      }
      csv1Index.get(key).push({ row, originalIndex: idx + 2 }); // +2 porque CSV tiene header y empieza en 1
    }
  });

  csv2Mapped.forEach((row, idx) => {
    const key = createRowKey(row);
    if (key) {
      if (!csv2Index.has(key)) {
        csv2Index.set(key, []);
      }
      csv2Index.get(key).push({ row, originalIndex: idx + 2 });
    }
  });

  dbRows.forEach((row, idx) => {
    const key = createRowKey(row);
    if (key) {
      if (!dbIndex.has(key)) {
        dbIndex.set(key, []);
      }
      dbIndex.get(key).push({ row, originalIndex: idx });
    }
  });

  // 5. Comparar datos
  console.log('🔍 Comparando datos...\n');

  const discrepancies = [];
  const stats = {
    csv1Total: csv1Mapped.length,
    csv2Total: csv2Mapped.length,
    dbTotal: dbRows.length,
    csv1Found: 0,
    csv2Found: 0,
    csv1Missing: 0,
    csv2Missing: 0,
    csv1Discrepancies: 0,
    csv2Discrepancies: 0,
  };

  // Comparar CSV1 con DB
  console.log('📊 Comparando CSV1 con DB...');
  for (const [key, csv1Entries] of csv1Index.entries()) {
    const dbEntries = dbIndex.get(key) || [];

    if (dbEntries.length === 0) {
      stats.csv1Missing++;
      discrepancies.push({
        type: 'missing',
        source: 'CSV1',
        key,
        csvRow: csv1Entries[0].row,
        csvLine: csv1Entries[0].originalIndex,
      });
    } else {
      stats.csv1Found++;
      // Comparar con la primera entrada de DB (puede haber duplicados)
      const csvRow = csv1Entries[0].row;
      const dbRow = dbEntries[0].row;
      const rowDiscrepancies = compareRows(csvRow, dbRow, 'CSV1');

      if (rowDiscrepancies.length > 0) {
        stats.csv1Discrepancies++;
        discrepancies.push({
          type: 'mismatch',
          source: 'CSV1',
          key,
          csvRow,
          dbRow,
          csvLine: csv1Entries[0].originalIndex,
          discrepancies: rowDiscrepancies,
        });
      }
    }
  }

  // Comparar CSV2 con DB
  console.log('📊 Comparando CSV2 con DB...');
  for (const [key, csv2Entries] of csv2Index.entries()) {
    const dbEntries = dbIndex.get(key) || [];

    if (dbEntries.length === 0) {
      stats.csv2Missing++;
      discrepancies.push({
        type: 'missing',
        source: 'CSV2',
        key,
        csvRow: csv2Entries[0].row,
        csvLine: csv2Entries[0].originalIndex,
      });
    } else {
      stats.csv2Found++;
      const csvRow = csv2Entries[0].row;
      const dbRow = dbEntries[0].row;
      const rowDiscrepancies = compareRows(csvRow, dbRow, 'CSV2');

      if (rowDiscrepancies.length > 0) {
        stats.csv2Discrepancies++;
        discrepancies.push({
          type: 'mismatch',
          source: 'CSV2',
          key,
          csvRow,
          dbRow,
          csvLine: csv2Entries[0].originalIndex,
          discrepancies: rowDiscrepancies,
        });
      }
    }
  }

  // 6. Verificar preservación de asesor
  console.log('👤 Verificando preservación de asesor...');
  let advisorPreserved = 0;
  let advisorLost = 0;

  for (const [key, csv1Entries] of csv1Index.entries()) {
    const csv1Row = csv1Entries[0].row;
    const csv2Entries = csv2Index.get(key);
    const dbEntries = dbIndex.get(key);

    if (csv1Row.advisorRaw && csv2Entries && dbEntries) {
      const csv2Row = csv2Entries[0].row;
      const dbRow = dbEntries[0].row;

      // CSV2 no tiene asesor, debería preservarse del CSV1
      if (!csv2Row.advisorRaw && dbRow.advisorRaw === csv1Row.advisorRaw) {
        advisorPreserved++;
      } else if (!csv2Row.advisorRaw && dbRow.advisorRaw !== csv1Row.advisorRaw) {
        advisorLost++;
        discrepancies.push({
          type: 'advisor_lost',
          source: 'CSV1->CSV2',
          key,
          csv1Advisor: csv1Row.advisorRaw,
          csv2Advisor: csv2Row.advisorRaw,
          dbAdvisor: dbRow.advisorRaw,
          csv1Line: csv1Entries[0].originalIndex,
          csv2Line: csv2Entries[0].originalIndex,
        });
      }
    }
  }

  // 7. Generar reporte
  console.log('\n📋 Generando reporte...\n');
  console.log('='.repeat(80));
  console.log('RESUMEN DE VERIFICACIÓN');
  console.log('='.repeat(80));
  console.log(`\n📊 Estadísticas:`);
  console.log(`   CSV1 total: ${stats.csv1Total}`);
  console.log(`   CSV2 total: ${stats.csv2Total}`);
  console.log(`   DB total: ${stats.dbTotal}`);
  console.log(`\n✅ Coincidencias:`);
  console.log(`   CSV1 encontrado en DB: ${stats.csv1Found}`);
  console.log(`   CSV2 encontrado en DB: ${stats.csv2Found}`);
  console.log(`\n❌ Discrepancias:`);
  console.log(`   CSV1 faltantes en DB: ${stats.csv1Missing}`);
  console.log(`   CSV2 faltantes en DB: ${stats.csv2Missing}`);
  console.log(`   CSV1 con diferencias: ${stats.csv1Discrepancies}`);
  console.log(`   CSV2 con diferencias: ${stats.csv2Discrepancies}`);
  console.log(`\n👤 Preservación de asesor:`);
  console.log(`   Asesores preservados: ${advisorPreserved}`);
  console.log(`   Asesores perdidos: ${advisorLost}`);

  if (discrepancies.length > 0) {
    console.log(`\n⚠️  Total de discrepancias encontradas: ${discrepancies.length}`);
    console.log('\n' + '='.repeat(80));
    console.log('DETALLE DE DISCREPANCIAS');
    console.log('='.repeat(80));

    // Agrupar por tipo
    const missing = discrepancies.filter((d) => d.type === 'missing');
    const mismatches = discrepancies.filter((d) => d.type === 'mismatch');
    const advisorLost = discrepancies.filter((d) => d.type === 'advisor_lost');

    if (missing.length > 0) {
      console.log(`\n❌ Filas faltantes (${missing.length}):`);
      missing.slice(0, 10).forEach((d, idx) => {
        console.log(`\n   ${idx + 1}. ${d.source} - Línea ${d.csvLine}`);
        console.log(`      Key: ${d.key}`);
        console.log(`      Account: ${d.csvRow.accountNumber || 'N/A'}`);
        console.log(`      ID Cuenta: ${d.csvRow.idCuenta || 'N/A'}`);
        console.log(`      Holder: ${d.csvRow.holderName || 'N/A'}`);
      });
      if (missing.length > 10) {
        console.log(`   ... y ${missing.length - 10} más`);
      }
    }

    if (mismatches.length > 0) {
      console.log(`\n⚠️  Filas con diferencias (${mismatches.length}):`);
      mismatches.slice(0, 10).forEach((d, idx) => {
        console.log(`\n   ${idx + 1}. ${d.source} - Línea ${d.csvLine}`);
        console.log(`      Key: ${d.key}`);
        d.discrepancies.forEach((disc) => {
          console.log(`      ${disc.field}: CSV="${disc.csv}" DB="${disc.db}"`);
        });
      });
      if (mismatches.length > 10) {
        console.log(`   ... y ${mismatches.length - 10} más`);
      }
    }

    if (advisorLost.length > 0) {
      console.log(`\n👤 Asesores perdidos (${advisorLost.length}):`);
      advisorLost.slice(0, 10).forEach((d, idx) => {
        console.log(`\n   ${idx + 1}. Key: ${d.key}`);
        console.log(`      CSV1 Asesor: ${d.csv1Advisor}`);
        console.log(`      CSV2 Asesor: ${d.csv2Advisor || 'N/A'}`);
        console.log(`      DB Asesor: ${d.dbAdvisor || 'N/A'}`);
        console.log(`      CSV1 Línea: ${d.csv1Line}, CSV2 Línea: ${d.csv2Line}`);
      });
      if (advisorLost.length > 10) {
        console.log(`   ... y ${advisorLost.length - 10} más`);
      }
    }

    // Guardar reporte completo en archivo
    const reportPath = path.join(__dirname, '..', 'aum-verification-report.json');
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          stats,
          discrepancies,
        },
        null,
        2
      )
    );
    console.log(`\n📄 Reporte completo guardado en: ${reportPath}`);
  } else {
    console.log('\n✅ ¡No se encontraron discrepancias! Todos los datos coinciden correctamente.');
  }

  console.log('\n' + '='.repeat(80));
}

// Ejecutar
main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
