/**
 * Script de verificación de importación AUM (solo CSVs)
 * 
 * Compara los datos de los CSVs directamente sin necesidad de API
 * Útil para verificar la consistencia de los datos antes de importar
 * 
 * Uso: node scripts/verify-aum-csv-only.js
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Configuración
const CSV1_PATH = path.join(__dirname, '..', 'Balanz Cactus 2025 - AUM Balanz.csv');
const CSV2_PATH = path.join(__dirname, '..', 'reporteClusterCuentasV2.csv');

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
  if (strValue === '0' || strValue === '0.00' || strValue === '0,00' || 
      strValue === '0.0' || strValue === '0,0' || strValue === '0.000000' ||
      strValue === '0,000000' || /^0+([.,]0+)?$/.test(strValue)) {
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

// Mapear columnas del CSV a formato interno
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
function compareRows(csv1Row, csv2Row) {
  const discrepancies = [];

  // Comparar identificadores
  if (csv1Row.accountNumber && csv2Row.accountNumber && csv1Row.accountNumber !== csv2Row.accountNumber) {
    discrepancies.push({
      field: 'accountNumber',
      csv1: csv1Row.accountNumber,
      csv2: csv2Row.accountNumber
    });
  }

  if (csv1Row.idCuenta && csv2Row.idCuenta && csv1Row.idCuenta !== csv2Row.idCuenta) {
    discrepancies.push({
      field: 'idCuenta',
      csv1: csv1Row.idCuenta,
      csv2: csv2Row.idCuenta
    });
  }

  if (csv1Row.holderName && csv2Row.holderName && csv1Row.holderName !== csv2Row.holderName) {
    discrepancies.push({
      field: 'holderName',
      csv1: csv1Row.holderName,
      csv2: csv2Row.holderName
    });
  }

  // Comparar valores financieros
  const financialFields = ['aumDollars', 'bolsaArg', 'fondosArg', 'bolsaBci', 'pesos', 'mep', 'cable', 'cv7000'];
  for (const field of financialFields) {
    if (!compareNumbers(csv1Row[field], csv2Row[field])) {
      discrepancies.push({
        field,
        csv1: csv1Row[field],
        csv2: csv2Row[field]
      });
    }
  }

  return discrepancies;
}

// Función principal
function main() {
  console.log('🔍 Iniciando verificación de CSVs AUM...\n');

  // 1. Leer CSVs
  console.log('📄 Leyendo CSVs...');
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

  // 2. Mapear CSVs
  console.log('🔄 Mapeando datos de CSVs...');
  const csv1Mapped = csv1Rows.map((r, idx) => ({ ...mapCSVRow(r, true), originalIndex: idx + 2 }));
  const csv2Mapped = csv2Rows.map((r, idx) => ({ ...mapCSVRow(r, false), originalIndex: idx + 2 }));
  console.log(`   ✅ CSV1 mapeado: ${csv1Mapped.length} filas`);
  console.log(`   ✅ CSV2 mapeado: ${csv2Mapped.length} filas\n`);

  // 3. Crear índices para búsqueda rápida
  const csv1Index = new Map();
  const csv2Index = new Map();

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

  // 4. Estadísticas
  const stats = {
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
    ).length,
    commonRows: 0,
    csv1Only: 0,
    csv2Only: 0,
    discrepancies: 0
  };

  // 5. Comparar datos
  console.log('🔍 Comparando datos...\n');

  const discrepancies = [];
  const csv1Only = [];
  const csv2Only = [];

  // Encontrar filas comunes y únicas
  const allKeys = new Set([...csv1Index.keys(), ...csv2Index.keys()]);

  for (const key of allKeys) {
    const csv1Entries = csv1Index.get(key) || [];
    const csv2Entries = csv2Index.get(key) || [];

    if (csv1Entries.length > 0 && csv2Entries.length > 0) {
      stats.commonRows++;
      // Comparar primera entrada de cada CSV
      const csv1Row = csv1Entries[0];
      const csv2Row = csv2Entries[0];
      const rowDiscrepancies = compareRows(csv1Row, csv2Row);
      
      if (rowDiscrepancies.length > 0) {
        stats.discrepancies++;
        discrepancies.push({
          key,
          csv1Line: csv1Row.originalIndex,
          csv2Line: csv2Row.originalIndex,
          csv1Row,
          csv2Row,
          discrepancies: rowDiscrepancies
        });
      }
    } else if (csv1Entries.length > 0) {
      stats.csv1Only++;
      csv1Only.push({
        key,
        row: csv1Entries[0]
      });
    } else if (csv2Entries.length > 0) {
      stats.csv2Only++;
      csv2Only.push({
        key,
        row: csv2Entries[0]
      });
    }
  }

  // 6. Verificar preservación de asesor
  console.log('👤 Verificando preservación de asesor...');
  let advisorPreserved = 0;
  let advisorLost = 0;
  const advisorIssues = [];

  for (const [key, csv1Entries] of csv1Index.entries()) {
    const csv1Row = csv1Entries[0];
    const csv2Entries = csv2Index.get(key);

    if (csv1Row.advisorRaw && csv2Entries) {
      const csv2Row = csv2Entries[0];
      // CSV2 no tiene asesor, debería preservarse del CSV1
      if (!csv2Row.advisorRaw) {
        advisorPreserved++;
      } else if (csv2Row.advisorRaw !== csv1Row.advisorRaw) {
        advisorLost++;
        advisorIssues.push({
          key,
          csv1Advisor: csv1Row.advisorRaw,
          csv2Advisor: csv2Row.advisorRaw,
          csv1Line: csv1Row.originalIndex,
          csv2Line: csv2Row.originalIndex
        });
      }
    }
  }

  // 7. Generar reporte
  console.log('\n📋 Generando reporte...\n');
  console.log('='.repeat(80));
  console.log('RESUMEN DE VERIFICACIÓN DE CSVs');
  console.log('='.repeat(80));
  console.log(`\n📊 Estadísticas:`);
  console.log(`   CSV1 total: ${stats.csv1Total}`);
  console.log(`   CSV2 total: ${stats.csv2Total}`);
  console.log(`   Filas comunes: ${stats.commonRows}`);
  console.log(`   Solo en CSV1: ${stats.csv1Only}`);
  console.log(`   Solo en CSV2: ${stats.csv2Only}`);
  console.log(`\n📋 Datos con identificadores:`);
  console.log(`   CSV1 con accountNumber: ${stats.csv1WithAccount}`);
  console.log(`   CSV2 con accountNumber: ${stats.csv2WithAccount}`);
  console.log(`   CSV1 con idCuenta: ${stats.csv1WithIdCuenta}`);
  console.log(`   CSV2 con idCuenta: ${stats.csv2WithIdCuenta}`);
  console.log(`\n💰 Datos financieros:`);
  console.log(`   CSV1 con datos financieros: ${stats.csv1WithFinancialData}`);
  console.log(`   CSV2 con datos financieros: ${stats.csv2WithFinancialData}`);
  console.log(`\n👤 Asesores:`);
  console.log(`   CSV1 con asesor: ${stats.csv1WithAdvisor}`);
  console.log(`   CSV2 con asesor: ${stats.csv2WithAdvisor}`);
  console.log(`   Asesores que se preservarían: ${advisorPreserved}`);
  console.log(`   Asesores con diferencias: ${advisorLost}`);

  if (discrepancies.length > 0 || csv1Only.length > 0 || csv2Only.length > 0 || advisorIssues.length > 0) {
    console.log(`\n⚠️  Total de problemas encontrados: ${discrepancies.length + csv1Only.length + csv2Only.length + advisorIssues.length}`);

    if (csv1Only.length > 0) {
      console.log(`\n📄 Filas solo en CSV1 (${csv1Only.length}):`);
      csv1Only.slice(0, 10).forEach((d, idx) => {
        console.log(`   ${idx + 1}. Línea ${d.row.originalIndex} - ${d.key}`);
        console.log(`      Account: ${d.row.accountNumber || 'N/A'}, Holder: ${d.row.holderName || 'N/A'}`);
      });
      if (csv1Only.length > 10) {
        console.log(`   ... y ${csv1Only.length - 10} más`);
      }
    }

    if (csv2Only.length > 0) {
      console.log(`\n📄 Filas solo en CSV2 (${csv2Only.length}):`);
      csv2Only.slice(0, 10).forEach((d, idx) => {
        console.log(`   ${idx + 1}. Línea ${d.row.originalIndex} - ${d.key}`);
        console.log(`      Account: ${d.row.accountNumber || 'N/A'}, Holder: ${d.row.holderName || 'N/A'}`);
      });
      if (csv2Only.length > 10) {
        console.log(`   ... y ${csv2Only.length - 10} más`);
      }
    }

    if (discrepancies.length > 0) {
      console.log(`\n⚠️  Filas con diferencias (${discrepancies.length}):`);
      discrepancies.slice(0, 10).forEach((d, idx) => {
        console.log(`\n   ${idx + 1}. ${d.key}`);
        console.log(`      CSV1 Línea: ${d.csv1Line}, CSV2 Línea: ${d.csv2Line}`);
        d.discrepancies.forEach(disc => {
          console.log(`      ${disc.field}: CSV1="${disc.csv1}" CSV2="${disc.csv2}"`);
        });
      });
      if (discrepancies.length > 10) {
        console.log(`   ... y ${discrepancies.length - 10} más`);
      }
    }

    if (advisorIssues.length > 0) {
      console.log(`\n👤 Asesores con diferencias (${advisorIssues.length}):`);
      advisorIssues.slice(0, 10).forEach((d, idx) => {
        console.log(`\n   ${idx + 1}. ${d.key}`);
        console.log(`      CSV1 Asesor: ${d.csv1Advisor}`);
        console.log(`      CSV2 Asesor: ${d.csv2Advisor}`);
        console.log(`      CSV1 Línea: ${d.csv1Line}, CSV2 Línea: ${d.csv2Line}`);
      });
      if (advisorIssues.length > 10) {
        console.log(`   ... y ${advisorIssues.length - 10} más`);
      }
    }

    // Guardar reporte completo en archivo
    const reportPath = path.join(__dirname, '..', 'aum-csv-verification-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      stats,
      discrepancies,
      csv1Only,
      csv2Only,
      advisorIssues
    }, null, 2));
    console.log(`\n📄 Reporte completo guardado en: ${reportPath}`);
  } else {
    console.log('\n✅ ¡No se encontraron problemas! Los CSVs son consistentes.');
  }

  console.log('\n' + '='.repeat(80));
}

// Ejecutar
main();

