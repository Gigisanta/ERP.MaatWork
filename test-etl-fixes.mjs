#!/usr/bin/env node

/**
 * Script de prueba para verificar las correcciones del ETL
 * Prueba la carga de archivos con las validaciones mejoradas
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const API_URL = 'http://localhost:3001';

async function testETLEndpoints() {
  console.log('🧪 Probando correcciones del ETL...\n');

  // Test 1: AUM Madre CSV
  console.log('📊 Probando carga de AUM Madre...');
  try {
    const csvPath = join(process.cwd(), 'Balanz Cactus 2025 - AUM Balanz.csv');
    const csvBuffer = readFileSync(csvPath);
    
    const formData = new FormData();
    formData.append('file', new Blob([csvBuffer]), 'Balanz Cactus 2025 - AUM Balanz.csv');
    formData.append('snapshotDate', new Date().toISOString().split('T')[0]);

    const response = await fetch(`${API_URL}/etl/aum-madre`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    if (response.ok || response.status === 207) {
      console.log(`✅ AUM Madre cargado exitosamente:`);
      console.log(`   - Filas válidas: ${result.parseMetrics?.filasValidas || 0}`);
      console.log(`   - Filas rechazadas: ${result.parseMetrics?.filasRechazadas || 0}`);
      console.log(`   - Clientes creados: ${result.loadResult?.clientesCreados || 0}`);
      console.log(`   - Clientes actualizados: ${result.loadResult?.clientesActualizados || 0}`);
    } else {
      console.log(`❌ Error en AUM Madre: ${result.error || 'Error desconocido'}`);
    }
  } catch (error) {
    console.log(`❌ Error probando AUM Madre: ${error.message}`);
  }

  console.log('\n');

  // Test 2: Cluster Cuentas
  console.log('📈 Probando carga de Cluster Cuentas...');
  try {
    const excelPath = join(process.cwd(), 'reporteClusterCuentasV2.xlsx');
    const excelBuffer = readFileSync(excelPath);
    
    const formData = new FormData();
    formData.append('file', new Blob([excelBuffer]), 'reporteClusterCuentasV2.xlsx');
    formData.append('snapshotDate', new Date().toISOString().split('T')[0]);

    const response = await fetch(`${API_URL}/etl/cluster-cuentas`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    if (response.ok || response.status === 207) {
      console.log(`✅ Cluster Cuentas cargado exitosamente:`);
      console.log(`   - Filas válidas: ${result.parseMetrics?.filasValidas || 0}`);
      console.log(`   - Filas rechazadas: ${result.parseMetrics?.filasRechazadas || 0}`);
      console.log(`   - Clientes creados: ${result.loadResult?.clientesCreados || 0}`);
    } else {
      console.log(`❌ Error en Cluster Cuentas: ${result.error || 'Error desconocido'}`);
    }
  } catch (error) {
    console.log(`❌ Error probando Cluster Cuentas: ${error.message}`);
  }

  console.log('\n');

  // Test 3: Comisiones
  console.log('💰 Probando carga de Comisiones...');
  try {
    const excelPath = join(process.cwd(), 'Comisiones (2).xlsx');
    const excelBuffer = readFileSync(excelPath);
    
    const formData = new FormData();
    formData.append('file', new Blob([excelBuffer]), 'Comisiones (2).xlsx');

    const response = await fetch(`${API_URL}/etl/comisiones`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    if (response.ok || response.status === 207) {
      console.log(`✅ Comisiones cargadas exitosamente:`);
      console.log(`   - Filas válidas: ${result.parseMetrics?.filasValidas || 0}`);
      console.log(`   - Filas rechazadas: ${result.parseMetrics?.filasRechazadas || 0}`);
      console.log(`   - Asesores creados: ${result.loadResult?.asesoresCreados || 0}`);
      console.log(`   - Comisiones creadas: ${result.loadResult?.comisionesCreadas || 0}`);
    } else {
      console.log(`❌ Error en Comisiones: ${result.error || 'Error desconocido'}`);
    }
  } catch (error) {
    console.log(`❌ Error probando Comisiones: ${error.message}`);
  }

  console.log('\n');

  // Test 4: Matching
  console.log('🔄 Probando ejecución de matching...');
  try {
    const response = await fetch(`${API_URL}/etl/matching/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fuzzyEnabled: true,
        fuzzyThreshold: 2
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ Matching ejecutado exitosamente:`);
      console.log(`   - Total procesados: ${result.totalProcessed || 0}`);
      console.log(`   - Matched: ${result.matched || 0}`);
      console.log(`   - Multi-match: ${result.multiMatch || 0}`);
      console.log(`   - No match: ${result.noMatch || 0}`);
      console.log(`   - Match rate: ${result.metrics?.matchRate?.toFixed(2) || 0}%`);
    } else {
      console.log(`❌ Error en Matching: ${result.error || 'Error desconocido'}`);
    }
  } catch (error) {
    console.log(`❌ Error probando Matching: ${error.message}`);
  }

  console.log('\n🎉 Pruebas completadas!');
}

// Verificar que la API esté corriendo
async function checkAPI() {
  try {
    const response = await fetch(`${API_URL}/health`);
    if (response.ok) {
      console.log('✅ API está corriendo\n');
      return true;
    } else {
      console.log('❌ API no responde correctamente\n');
      return false;
    }
  } catch (error) {
    console.log('❌ No se puede conectar a la API. Asegúrate de que esté corriendo en http://localhost:3001\n');
    return false;
  }
}

// Ejecutar pruebas
async function main() {
  const apiRunning = await checkAPI();
  if (apiRunning) {
    await testETLEndpoints();
  }
}

main().catch(console.error);
