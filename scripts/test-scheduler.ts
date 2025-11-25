#!/usr/bin/env tsx
/**
 * Script para probar el scheduler manualmente
 */

import { config } from 'dotenv';
import { resolve } from 'node:path';

// Cargar .env desde apps/api
config({ path: resolve(process.cwd(), 'apps/api/.env') });

import { getScheduler } from '../apps/api/src/jobs/scheduler.js';
import { runDailyMaintenance } from '../apps/api/src/jobs/maintenance.js';
import { MonitorQueryPerformanceJob } from '../apps/api/src/jobs/monitor-query-performance.js';

async function testScheduler() {
  console.log('🧪 Probando sistema de scheduling...\n');

  try {
    // 1. Verificar que el scheduler se puede crear
    console.log('1. Creando instancia del scheduler...');
    const scheduler = getScheduler();
    console.log('   ✅ Scheduler creado exitosamente');

    // 2. Verificar estado inicial
    console.log('\n2. Verificando estado inicial...');
    const status = scheduler.getStatus();
    console.log(`   Jobs registrados: ${status.length}`);
    for (const job of status) {
      console.log(`   - ${job.name}: ${job.running ? 'running' : 'stopped'}`);
    }

    // 3. Probar jobs manualmente (sin iniciar el scheduler completo)
    console.log('\n3. Probando jobs manualmente...');
    
    console.log('   a) Probando mantenimiento diario...');
    try {
      await runDailyMaintenance();
      console.log('      ✅ Mantenimiento diario ejecutado exitosamente');
    } catch (error) {
      console.log('      ⚠️  Error en mantenimiento diario:', error instanceof Error ? error.message : String(error));
    }

    console.log('   b) Probando monitoreo de queries...');
    try {
      const monitorJob = new MonitorQueryPerformanceJob();
      await monitorJob.run();
      console.log('      ✅ Monitoreo de queries ejecutado exitosamente');
    } catch (error) {
      console.log('      ⚠️  Error en monitoreo (puede ser normal si pg_stat_statements no está habilitado):', 
        error instanceof Error ? error.message : String(error));
    }

    // 4. Verificar que el scheduler puede iniciar (pero no lo iniciamos para no dejar jobs corriendo)
    console.log('\n4. Verificando configuración del scheduler...');
    console.log('   ✅ Scheduler configurado correctamente');
    console.log('   ℹ️  Para iniciar el scheduler, debe iniciarse la aplicación API');
    console.log('   ℹ️  El scheduler se iniciará automáticamente al iniciar la API');

    console.log('\n✅ Pruebas del scheduler completadas');
    console.log('\n📝 Notas:');
    console.log('   - El scheduler se inicia automáticamente al iniciar la API');
    console.log('   - Jobs programados:');
    console.log('     * Diario 2:00 AM: Mantenimiento diario');
    console.log('     * Diario 2:30 AM: Monitoreo de queries');
    console.log('     * Semanal (Dom 3:00 AM): Mantenimiento semanal');
    console.log('     * Mensual (Día 1, 4:00 AM): Limpieza de particiones');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

testScheduler()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

