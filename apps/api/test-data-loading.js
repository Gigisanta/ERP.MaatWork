/**
 * Script de prueba para cargar datos reales del sistema de comparación mensual
 * Prueba el sistema completo: archivo madre -> mensual -> comisiones
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const XLSX = require('xlsx');

// Cargar variables de entorno
require('dotenv').config();

async function testDataLoading() {
  console.log('🚀 Iniciando prueba de carga de datos reales...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Configurado' : 'No configurado');

  try {
    // Importar servicios del sistema desde los archivos compilados
    const { ingestAumMadre } = require('./dist/etl/loaders/aum-madre-loader');
    const { ingestClusterCuentas } = require('./dist/etl/loaders/cluster-cuentas-loader');
    const { ingestComisiones } = require('./dist/etl/loaders/comisiones-loader');
    
    console.log('✅ Servicios importados correctamente');

    // 1. Cargar archivo madre
    console.log('\n📄 1. Cargando archivo madre: Balanz Cactus 2025 - AUM Balanz.xlsx');
    const madrePath = resolve(__dirname, '../../Balanz Cactus 2025 - AUM Balanz.xlsx');
    
    if (require('fs').existsSync(madrePath)) {
      const madreWorkbook = XLSX.readFile(madrePath);
      const madreSheetName = madreWorkbook.SheetNames[0];
      const madreSheet = madreWorkbook.Sheets[madreSheetName];
      const madreData = XLSX.utils.sheet_to_json(madreSheet);
      
      console.log(`📊 Filas en archivo madre: ${madreData.length}`);
      
      // Probar ingesta del archivo madre
      try {
        const madreResult = await ingestAumMadre(madreData, new Date());
        console.log('✅ Archivo madre cargado exitosamente:');
        console.log(`  - Filas válidas: ${madreResult.parseMetrics?.filasValidas || 0}`);
        console.log(`  - Filas rechazadas: ${madreResult.parseMetrics?.filasRechazadas || 0}`);
        console.log(`  - Clientes creados: ${madreResult.loadResult?.clientesCreados || 0}`);
        console.log(`  - Snapshots creados: ${madreResult.loadResult?.snapshotsCreados || 0}`);
        console.log(`  - Errores: ${madreResult.loadResult?.errors?.length || 0}`);
      } catch (error) {
        console.log('❌ Error cargando archivo madre:', error.message);
      }
    } else {
      console.log('❌ Archivo madre no encontrado');
    }

    // 2. Cargar archivo mensual
    console.log('\n📄 2. Cargando archivo mensual: reporteClusterCuentasV2.xlsx');
    const mensualPath = resolve(__dirname, '../../reporteClusterCuentasV2.xlsx');
    
    if (require('fs').existsSync(mensualPath)) {
      const mensualWorkbook = XLSX.readFile(mensualPath);
      const mensualSheetName = mensualWorkbook.SheetNames[0];
      const mensualSheet = mensualWorkbook.Sheets[mensualSheetName];
      const mensualData = XLSX.utils.sheet_to_json(mensualSheet);
      
      console.log(`📊 Filas en archivo mensual: ${mensualData.length}`);
      
      // Probar ingesta del archivo mensual
      try {
        const mensualResult = await ingestClusterCuentas(mensualData, new Date());
        console.log('✅ Archivo mensual cargado exitosamente:');
        console.log(`  - Filas válidas: ${mensualResult.parseMetrics?.filasValidas || 0}`);
        console.log(`  - Filas rechazadas: ${mensualResult.parseMetrics?.filasRechazadas || 0}`);
        console.log(`  - Clientes nuevos: ${mensualResult.loadResult?.clientesNuevos || 0}`);
        console.log(`  - Clientes actualizados: ${mensualResult.loadResult?.clientesActualizados || 0}`);
        console.log(`  - Errores: ${mensualResult.loadResult?.errors?.length || 0}`);
      } catch (error) {
        console.log('❌ Error cargando archivo mensual:', error.message);
      }
    } else {
      console.log('❌ Archivo mensual no encontrado');
    }

    // 3. Cargar archivo de comisiones
    console.log('\n📄 3. Cargando archivo de comisiones: Comisiones (2).xlsx');
    const comisionesPath = resolve(__dirname, '../../Comisiones (2).xlsx');
    
    if (require('fs').existsSync(comisionesPath)) {
      const comisionesWorkbook = XLSX.readFile(comisionesPath);
      const comisionesSheetName = comisionesWorkbook.SheetNames[0];
      const comisionesSheet = comisionesWorkbook.Sheets[comisionesSheetName];
      const comisionesData = XLSX.utils.sheet_to_json(comisionesSheet);
      
      console.log(`📊 Filas en archivo de comisiones: ${comisionesData.length}`);
      
      // Probar ingesta del archivo de comisiones
      try {
        const comisionesResult = await ingestComisiones(comisionesData);
        console.log('✅ Archivo de comisiones cargado exitosamente:');
        console.log(`  - Filas válidas: ${comisionesResult.parseMetrics?.filasValidas || 0}`);
        console.log(`  - Filas rechazadas: ${comisionesResult.parseMetrics?.filasRechazadas || 0}`);
        console.log(`  - Comisiones cargadas: ${comisionesResult.loadResult?.comisionesCargadas || 0}`);
        console.log(`  - Errores: ${comisionesResult.loadResult?.errors?.length || 0}`);
      } catch (error) {
        console.log('❌ Error cargando archivo de comisiones:', error.message);
      }
    } else {
      console.log('❌ Archivo de comisiones no encontrado');
    }

    // 4. Verificar datos en la base de datos
    console.log('\n🗄️ 4. Verificando datos en la base de datos...');
    try {
      const { db, maestroCuentas, stagingMensual, stgComisiones } = require('../../packages/db/dist/index.js');
      const dbInstance = db();
      
      // Contar registros en cada tabla
      const maestroCount = await dbInstance.select().from(maestroCuentas);
      const stagingCount = await dbInstance.select().from(stagingMensual);
      const comisionesCount = await dbInstance.select().from(stgComisiones);
      
      console.log('✅ Datos verificados en la base de datos:');
      console.log(`  - Registros en maestro_cuentas: ${maestroCount.length}`);
      console.log(`  - Registros en staging_mensual: ${stagingCount.length}`);
      console.log(`  - Registros en stg_comisiones: ${comisionesCount.length}`);
      
    } catch (dbError) {
      console.log('❌ Error verificando base de datos:', dbError.message);
    }

    console.log('\n🎉 Prueba de carga de datos completada');

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    console.error(error.stack);
  }
}

// Ejecutar la prueba
testDataLoading().catch(console.error);
