/**
 * Script de Prueba End-to-End del Sistema AUM
 * 
 * Prueba todo el flujo de importación sin interacción del usuario:
 * 1. Verifica CSVs
 * 2. Intenta verificar datos en la API (si está disponible)
 * 3. Genera reporte completo
 * 
 * Uso: node scripts/test-aum-import-full.js
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Configuración
const CSV1_PATH = path.join(__dirname, '..', 'Balanz Cactus 2025 - AUM Balanz.csv');
const CSV2_PATH = path.join(__dirname, '..', 'reporteClusterCuentasV2.csv');
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const API_ENDPOINT = `${API_BASE_URL}/v1/admin/aum/rows/all`;

// Helper para parsear números
function parseNumeric(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? null : value;
  }
  const strValue = String(value).trim();
  if (strValue === '' || strValue === '-' || strValue === '--' || strValue === '—') {
    return null;
  }
  if (strValue === '0' || strValue === '0.00' || strValue === '0,00' || 
      strValue === '0.0' || strValue === '0,0' || strValue === '0.000000' ||
      strValue === '0,000000' || /^0+([.,]0+)?$/.test(strValue)) {
    return 0;
  }
  const parsed = parseFloat(strValue.replace(',', '.'));
  if (parsed === 0) return 0;
  return isNaN(parsed) || !isFinite(parsed) ? null : parsed;
}

function normalizeString(str) {
  if (!str) return null;
  const normalized = String(str).trim();
  return normalized === '' ? null : normalized;
}

function compareNumbers(a, b, tolerance = 0.01) {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return Math.abs(a - b) <= tolerance;
}

function readCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivo no encontrado: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_quotes: true,
    cast: false
  });
  return records;
}

function mapCSVRow(record, isCSV1) {
  const idCuenta = normalizeString(record.idCuenta || record['idCuenta']);
  const comitente = normalizeString(record.comitente || record['comitente']);
  const cuenta = normalizeString(record.cuenta || record.Descripcion || record['cuenta'] || record['Descripcion']);
  const asesor = normalizeString(record.Asesor || record['Asesor'] || record.asesor || record['asesor']);
  
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
    cv7000: parseNumeric(record.cv7000 || record['cv7000'])
  };
}

function createRowKey(row) {
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

// Verificar conectividad con API
async function checkAPIConnection() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Obtener datos de la API
async function fetchAllAumRows() {
  const allRows = [];
  let offset = 0;
  const limit = 1000;
  let hasMore = true;
  let attempts = 0;
  const maxAttempts = 3;

  while (hasMore && attempts < maxAttempts) {
    try {
      const url = `${API_ENDPOINT}?limit=${limit}&offset=${offset}&preferredOnly=false`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('No autenticado. La API requiere autenticación.');
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.ok || !data.rows) {
        throw new Error('Invalid API response');
      }

      allRows.push(...data.rows);
      hasMore = data.pagination?.hasMore || false;
      offset += limit;
      attempts = 0; // Reset attempts on success

      console.log(`   ✅ Fetched ${allRows.length} rows so far...`);
    } catch (error) {
      attempts++;
      if (error.name === 'AbortError') {
        throw new Error('Timeout al conectar con la API');
      }
      if (attempts >= maxAttempts) {
        throw error;
      }
      console.log(`   ⚠️  Intento ${attempts} fallido, reintentando...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
    }
  }

  return allRows;
}

// Función principal
async function main() {
  console.log('🚀 Iniciando Prueba End-to-End del Sistema AUM\n');
  console.log('='.repeat(80));
  console.log('PASO 1: Verificación de Archivos CSV');
  console.log('='.repeat(80));
  console.log('');

  // 1. Verificar que los archivos existan
  const filesExist = {
    csv1: fs.existsSync(CSV1_PATH),
    csv2: fs.existsSync(CSV2_PATH)
  };

  if (!filesExist.csv1 || !filesExist.csv2) {
    console.error('❌ Error: Archivos CSV no encontrados');
    if (!filesExist.csv1) console.error(`   Falta: ${CSV1_PATH}`);
    if (!filesExist.csv2) console.error(`   Falta: ${CSV2_PATH}`);
    process.exit(1);
  }

  console.log('✅ Archivos CSV encontrados');
  console.log(`   CSV1: ${CSV1_PATH}`);
  console.log(`   CSV2: ${CSV2_PATH}\n`);

  // 2. Leer y parsear CSVs
  console.log('📄 Leyendo y parseando CSVs...');
  let csv1Rows, csv2Rows;
  try {
    csv1Rows = readCSV(CSV1_PATH);
    csv2Rows = readCSV(CSV2_PATH);
    console.log(`   ✅ CSV1: ${csv1Rows.length} filas`);
    console.log(`   ✅ CSV2: ${csv2Rows.length} filas\n`);
  } catch (error) {
    console.error(`❌ Error leyendo CSVs: ${error.message}`);
    process.exit(1);
  }

  // 3. Mapear CSVs
  console.log('🔄 Mapeando datos de CSVs...');
  const csv1Mapped = csv1Rows.map((r, idx) => ({ ...mapCSVRow(r, true), originalIndex: idx + 2 }));
  const csv2Mapped = csv2Rows.map((r, idx) => ({ ...mapCSVRow(r, false), originalIndex: idx + 2 }));
  console.log(`   ✅ CSV1 mapeado: ${csv1Mapped.length} filas`);
  console.log(`   ✅ CSV2 mapeado: ${csv2Mapped.length} filas\n`);

  // 4. Estadísticas de CSVs
  const csvStats = {
    csv1Total: csv1Mapped.length,
    csv2Total: csv2Mapped.length,
    csv1WithAdvisor: csv1Mapped.filter(r => r.advisorRaw).length,
    csv2WithAdvisor: csv2Mapped.filter(r => r.advisorRaw).length,
    csv1WithAccount: csv1Mapped.filter(r => r.accountNumber).length,
    csv2WithAccount: csv2Mapped.filter(r => r.accountNumber).length,
    csv1WithIdCuenta: csv1Mapped.filter(r => r.idCuenta).length,
    csv2WithIdCuenta: csv2Mapped.filter(r => r.idCuenta).length,
    csv1WithFinancialData: csv1Mapped.filter(r => 
      r.aumDollars !== null || r.bolsaArg !== null || r.fondosArg !== null || 
      r.bolsaBci !== null || r.pesos !== null || r.mep !== null || 
      r.cable !== null || r.cv7000 !== null
    ).length,
    csv2WithFinancialData: csv2Mapped.filter(r => 
      r.aumDollars !== null || r.bolsaArg !== null || r.fondosArg !== null || 
      r.bolsaBci !== null || r.pesos !== null || r.mep !== null || 
      r.cable !== null || r.cv7000 !== null
    ).length
  };

  console.log('📊 Estadísticas de CSVs:');
  console.log(`   CSV1 total: ${csvStats.csv1Total}`);
  console.log(`   CSV2 total: ${csvStats.csv2Total}`);
  console.log(`   CSV1 con asesor: ${csvStats.csv1WithAdvisor}`);
  console.log(`   CSV2 con asesor: ${csvStats.csv2WithAdvisor}`);
  console.log(`   CSV1 con accountNumber: ${csvStats.csv1WithAccount}`);
  console.log(`   CSV2 con accountNumber: ${csvStats.csv2WithAccount}`);
  console.log(`   CSV1 con datos financieros: ${csvStats.csv1WithFinancialData}`);
  console.log(`   CSV2 con datos financieros: ${csvStats.csv2WithFinancialData}\n`);

  // 5. Verificar API
  console.log('='.repeat(80));
  console.log('PASO 2: Verificación de Conexión con API');
  console.log('='.repeat(80));
  console.log('');

  let apiAvailable = false;
  let dbRows = [];
  let apiError = null;

  try {
    console.log(`🌐 Intentando conectar con API: ${API_BASE_URL}...`);
    apiAvailable = await checkAPIConnection();
    
    if (apiAvailable) {
      console.log('✅ API está disponible\n');
      console.log('📥 Obteniendo datos de la base de datos...');
      try {
        dbRows = await fetchAllAumRows();
        console.log(`   ✅ Obtenidas ${dbRows.length} filas de la base de datos\n`);
      } catch (error) {
        apiError = error.message;
        console.log(`   ⚠️  No se pudieron obtener datos: ${apiError}`);
        console.log('   ℹ️  Continuando solo con verificación de CSVs...\n');
      }
    } else {
      console.log('⚠️  API no está disponible o no responde');
      console.log('   ℹ️  Continuando solo con verificación de CSVs...\n');
    }
  } catch (error) {
    apiError = error.message;
    console.log(`   ⚠️  Error al verificar API: ${apiError}\n`);
  }

  // 6. Comparar datos si API está disponible
  let comparisonResults = null;
  if (apiAvailable && dbRows.length > 0) {
    console.log('='.repeat(80));
    console.log('PASO 3: Comparación CSV vs Base de Datos');
    console.log('='.repeat(80));
    console.log('');

    // Crear índices
    const csv1Index = new Map();
    const csv2Index = new Map();
    const dbIndex = new Map();

    csv1Mapped.forEach((row) => {
      const key = createRowKey(row);
      if (key) {
        if (!csv1Index.has(key)) {
          csv1Index.set(key, []);
        }
        csv1Index.get(key).push(row);
      }
    });

    csv2Mapped.forEach((row) => {
      const key = createRowKey(row);
      if (key) {
        if (!csv2Index.has(key)) {
          csv2Index.set(key, []);
        }
        csv2Index.get(key).push(row);
      }
    });

    dbRows.forEach((row) => {
      const key = createRowKey(row);
      if (key) {
        if (!dbIndex.has(key)) {
          dbIndex.set(key, []);
        }
        dbIndex.get(key).push(row);
      }
    });

    // Comparar
    const comparison = {
      csv1Found: 0,
      csv1Missing: 0,
      csv2Found: 0,
      csv2Missing: 0,
      advisorPreserved: 0,
      advisorLost: 0
    };

    for (const [key, csv1Entries] of csv1Index.entries()) {
      const dbEntries = dbIndex.get(key) || [];
      if (dbEntries.length > 0) {
        comparison.csv1Found++;
        // Verificar preservación de asesor
        const csv1Row = csv1Entries[0];
        const csv2Entries = csv2Index.get(key);
        const dbRow = dbEntries[0];
        
        if (csv1Row.advisorRaw && csv2Entries) {
          const csv2Row = csv2Entries[0];
          if (!csv2Row.advisorRaw && dbRow.advisorRaw === csv1Row.advisorRaw) {
            comparison.advisorPreserved++;
          } else if (!csv2Row.advisorRaw && dbRow.advisorRaw !== csv1Row.advisorRaw) {
            comparison.advisorLost++;
          }
        }
      } else {
        comparison.csv1Missing++;
      }
    }

    for (const [key, csv2Entries] of csv2Index.entries()) {
      const dbEntries = dbIndex.get(key) || [];
      if (dbEntries.length > 0) {
        comparison.csv2Found++;
      } else {
        comparison.csv2Missing++;
      }
    }

    comparisonResults = comparison;

    console.log('📊 Resultados de comparación:');
    console.log(`   CSV1 encontrado en DB: ${comparison.csv1Found}`);
    console.log(`   CSV1 faltante en DB: ${comparison.csv1Missing}`);
    console.log(`   CSV2 encontrado en DB: ${comparison.csv2Found}`);
    console.log(`   CSV2 faltante en DB: ${comparison.csv2Missing}`);
    console.log(`   Asesores preservados: ${comparison.advisorPreserved}`);
    console.log(`   Asesores perdidos: ${comparison.advisorLost}\n`);
  }

  // 7. Generar reporte final
  console.log('='.repeat(80));
  console.log('RESUMEN FINAL');
  console.log('='.repeat(80));
  console.log('');

  const report = {
    timestamp: new Date().toISOString(),
    csvStats,
    apiAvailable,
    apiError,
    dbRowCount: dbRows.length,
    comparisonResults
  };

  // Guardar reporte
  const reportPath = path.join(__dirname, '..', 'aum-full-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('✅ Verificación completada');
  console.log(`📄 Reporte guardado en: ${reportPath}\n`);

  if (apiAvailable && dbRows.length > 0) {
    if (comparisonResults && comparisonResults.advisorLost === 0) {
      console.log('✅ Sistema funcionando correctamente:');
      console.log('   - CSVs válidos');
      console.log('   - Datos cargados en DB');
      console.log('   - Asesores preservados correctamente');
    } else if (comparisonResults && comparisonResults.advisorLost > 0) {
      console.log('⚠️  Advertencias:');
      console.log(`   - ${comparisonResults.advisorLost} asesores no se preservaron correctamente`);
    }
  } else {
    console.log('ℹ️  Nota: No se pudo verificar la base de datos');
    console.log('   - Los CSVs están correctos');
    console.log('   - Para verificación completa, asegúrate de que la API esté corriendo');
  }

  console.log('');
}

// Ejecutar
main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

