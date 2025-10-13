/**
 * Script de prueba para cargar archivos Excel directamente
 * Prueba el sistema de comparación mensual sin depender del servidor API
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const XLSX = require('xlsx');

// Cargar variables de entorno
require('dotenv').config({ path: resolve(__dirname, 'apps/api/.env') });

async function testExcelLoading() {
  console.log('🚀 Iniciando prueba de carga de archivos Excel...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Configurado' : 'No configurado');

  try {
    // 1. Probar carga del archivo madre
    console.log('\n📄 1. Probando archivo madre: Balanz Cactus 2025 - AUM Balanz.xlsx');
    const madrePath = resolve(__dirname, 'Balanz Cactus 2025 - AUM Balanz.xlsx');
    
    if (require('fs').existsSync(madrePath)) {
      console.log('✅ Archivo madre encontrado');
      
      const madreWorkbook = XLSX.readFile(madrePath);
      const madreSheetName = madreWorkbook.SheetNames[0];
      const madreSheet = madreWorkbook.Sheets[madreSheetName];
      const madreData = XLSX.utils.sheet_to_json(madreSheet);
      
      console.log(`📊 Filas en archivo madre: ${madreData.length}`);
      console.log('🔍 Primeras 3 filas:');
      madreData.slice(0, 3).forEach((row, index) => {
        console.log(`  ${index + 1}:`, Object.keys(row).slice(0, 5).map(key => `${key}: ${row[key]}`).join(', '));
      });
    } else {
      console.log('❌ Archivo madre no encontrado');
    }

    // 2. Probar carga del archivo mensual
    console.log('\n📄 2. Probando archivo mensual: reporteClusterCuentasV2.xlsx');
    const mensualPath = resolve(__dirname, 'reporteClusterCuentasV2.xlsx');
    
    if (require('fs').existsSync(mensualPath)) {
      console.log('✅ Archivo mensual encontrado');
      
      const mensualWorkbook = XLSX.readFile(mensualPath);
      const mensualSheetName = mensualWorkbook.SheetNames[0];
      const mensualSheet = mensualWorkbook.Sheets[mensualSheetName];
      const mensualData = XLSX.utils.sheet_to_json(mensualSheet);
      
      console.log(`📊 Filas en archivo mensual: ${mensualData.length}`);
      console.log('🔍 Primeras 3 filas:');
      mensualData.slice(0, 3).forEach((row, index) => {
        console.log(`  ${index + 1}:`, Object.keys(row).slice(0, 5).map(key => `${key}: ${row[key]}`).join(', '));
      });
    } else {
      console.log('❌ Archivo mensual no encontrado');
    }

    // 3. Probar carga del archivo de comisiones
    console.log('\n📄 3. Probando archivo de comisiones: Comisiones (2).xlsx');
    const comisionesPath = resolve(__dirname, 'Comisiones (2).xlsx');
    
    if (require('fs').existsSync(comisionesPath)) {
      console.log('✅ Archivo de comisiones encontrado');
      
      const comisionesWorkbook = XLSX.readFile(comisionesPath);
      const comisionesSheetName = comisionesWorkbook.SheetNames[0];
      const comisionesSheet = comisionesWorkbook.Sheets[comisionesSheetName];
      const comisionesData = XLSX.utils.sheet_to_json(comisionesSheet);
      
      console.log(`📊 Filas en archivo de comisiones: ${comisionesData.length}`);
      console.log('🔍 Primeras 3 filas:');
      comisionesData.slice(0, 3).forEach((row, index) => {
        console.log(`  ${index + 1}:`, Object.keys(row).slice(0, 5).map(key => `${key}: ${row[key]}`).join(', '));
      });
    } else {
      console.log('❌ Archivo de comisiones no encontrado');
    }

    // 4. Probar conexión a la base de datos
    console.log('\n🗄️ 4. Probando conexión a la base de datos...');
    try {
      const { db } = require('./packages/db/dist/index.js');
      const dbInstance = db();
      
      // Verificar tablas del sistema de comparación mensual
      const tablesResult = await dbInstance.execute(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (
          'maestro_cuentas', 'staging_mensual', 'asignaciones_asesor', 
          'auditoria_cargas', 'snapshots_maestro', 'diff_detalle'
        )
        ORDER BY table_name
      `);
      
      console.log('✅ Conexión a base de datos exitosa');
      console.log('📋 Tablas del sistema de comparación mensual:');
      tablesResult.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
      
    } catch (dbError) {
      console.log('❌ Error de conexión a base de datos:', dbError.message);
    }

    console.log('\n🎉 Prueba de carga de archivos completada');

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    console.error(error.stack);
  }
}

// Ejecutar la prueba
testExcelLoading().catch(console.error);


