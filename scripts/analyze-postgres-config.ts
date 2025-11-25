#!/usr/bin/env tsx
/**
 * Script para analizar configuración de PostgreSQL y recomendar optimizaciones
 * 
 * Analiza:
 * - Configuración actual de PostgreSQL
 * - Recursos del sistema (RAM, CPU)
 * - Recomendaciones basadas en mejores prácticas
 */

import { db } from '../packages/db/src/index.js';
import { sql } from 'drizzle-orm';
import pino from 'pino';
import os from 'os';

const logger = pino({ name: 'analyze-postgres-config' });

interface PostgresConfig {
  name: string;
  current: string;
  recommended: string | null;
  unit: string;
  requiresRestart: boolean;
  description: string;
}

interface SystemResources {
  totalMemoryGB: number;
  availableMemoryGB: number;
  cpuCount: number;
}

async function getPostgresConfig(): Promise<PostgresConfig[]> {
  const configs = await db().execute(sql.raw(`
    SELECT name, setting, unit, context, short_desc
    FROM pg_settings
    WHERE name IN (
      'shared_buffers',
      'effective_cache_size',
      'work_mem',
      'maintenance_work_mem',
      'max_connections',
      'wal_buffers',
      'checkpoint_completion_target',
      'max_wal_size',
      'random_page_cost',
      'effective_io_concurrency',
      'default_statistics_target',
      'log_min_duration_statement'
    )
    ORDER BY name
  `));

  return configs.rows.map((row: any) => ({
    name: row.name,
    current: row.setting,
    recommended: null,
    unit: row.unit || '',
    requiresRestart: row.context === 'postmaster',
    description: row.short_desc || ''
  }));
}

function getSystemResources(): SystemResources {
  const totalMemoryBytes = os.totalmem();
  const freeMemoryBytes = os.freemem();
  
  return {
    totalMemoryGB: totalMemoryBytes / (1024 * 1024 * 1024),
    availableMemoryGB: freeMemoryBytes / (1024 * 1024 * 1024),
    cpuCount: os.cpus().length
  };
}

function parseSize(sizeStr: string, unit: string): number {
  if (!sizeStr || sizeStr === '0') return 0;
  
  // PostgreSQL puede retornar valores como "8kB", "256MB", "2GB"
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(kB|MB|GB|TB)?$/i);
  if (!match) return parseFloat(sizeStr) || 0;
  
  const value = parseFloat(match[1]);
  const sizeUnit = (match[2] || unit || 'kB').toUpperCase();
  
  const multipliers: Record<string, number> = {
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024
  };
  
  return value * (multipliers[sizeUnit] || 1);
}

function formatSize(bytes: number, unit: 'MB' | 'GB' = 'GB'): string {
  if (unit === 'GB') {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
}

function calculateRecommendations(
  configs: PostgresConfig[],
  resources: SystemResources
): PostgresConfig[] {
  const totalMemoryGB = resources.totalMemoryGB;
  const cpuCount = resources.cpuCount;
  
  // Calcular recomendaciones basadas en recursos disponibles
  const sharedBuffersMB = Math.min(
    Math.max(256, Math.floor(totalMemoryGB * 0.25 * 1024)),
    8192 // Máximo 8GB
  );
  
  const effectiveCacheSizeGB = Math.floor(totalMemoryGB * 0.75);
  
  // Obtener max_connections actual
  const maxConnections = parseInt(
    configs.find(c => c.name === 'max_connections')?.current || '100',
    10
  );
  
  // work_mem: (RAM - shared_buffers) / (max_connections * 2)
  const workMemMB = Math.max(
    4,
    Math.floor((totalMemoryGB * 1024 - sharedBuffersMB) / (maxConnections * 2))
  );
  
  // maintenance_work_mem: Puede ser mayor que work_mem
  const maintenanceWorkMemMB = Math.min(
    Math.max(workMemMB * 4, 512),
    Math.floor(totalMemoryGB * 1024 * 0.1) // Máximo 10% de RAM
  );
  
  // max_wal_size: Basado en tamaño de base de datos esperado
  const maxWalSizeGB = Math.min(Math.max(2, Math.floor(totalMemoryGB * 0.25)), 16);
  
  return configs.map(config => {
    let recommended: string | null = null;
    
    switch (config.name) {
      case 'shared_buffers':
        recommended = `${sharedBuffersMB}MB`;
        break;
      case 'effective_cache_size':
        recommended = `${effectiveCacheSizeGB}GB`;
        break;
      case 'work_mem':
        recommended = `${workMemMB}MB`;
        break;
      case 'maintenance_work_mem':
        recommended = `${maintenanceWorkMemMB}MB`;
        break;
      case 'max_connections':
        // Mantener actual si es razonable, recomendar 100-200
        const currentMaxConn = parseInt(config.current, 10);
        if (currentMaxConn < 50) {
          recommended = '100';
        } else if (currentMaxConn > 200) {
          recommended = '200';
        }
        break;
      case 'wal_buffers':
        // 16MB es suficiente para la mayoría de casos
        if (parseSize(config.current, config.unit) < 16 * 1024 * 1024) {
          recommended = '16MB';
        }
        break;
      case 'checkpoint_completion_target':
        // 0.9 distribuye checkpoints mejor
        if (parseFloat(config.current) < 0.9) {
          recommended = '0.9';
        }
        break;
      case 'max_wal_size':
        const currentMaxWalGB = parseSize(config.current, config.unit) / (1024 * 1024 * 1024);
        if (currentMaxWalGB < maxWalSizeGB) {
          recommended = `${maxWalSizeGB}GB`;
        }
        break;
      case 'random_page_cost':
        // 1.1 para SSD (asumimos SSD en producción moderna)
        if (parseFloat(config.current) > 1.5) {
          recommended = '1.1';
        }
        break;
      case 'effective_io_concurrency':
        // 200 para SSD
        const currentIOConcurrency = parseInt(config.current, 10);
        if (currentIOConcurrency < 100) {
          recommended = '200';
        }
        break;
      case 'default_statistics_target':
        // 100 para queries complejas
        const currentStatsTarget = parseInt(config.current, 10);
        if (currentStatsTarget < 100) {
          recommended = '100';
        }
        break;
      case 'log_min_duration_statement':
        // 1000ms para logging de queries lentas
        const currentLogMin = parseInt(config.current, 10);
        if (currentLogMin === 0 || currentLogMin > 1000) {
          recommended = '1000';
        }
        break;
    }
    
    return { ...config, recommended };
  });
}

async function analyzePostgresConfig(): Promise<void> {
  logger.info('Analizando configuración de PostgreSQL...');

  // Verificar conexión a la base de datos primero
  try {
    await db().execute(sql.raw(`SELECT 1`));
  } catch (error) {
    console.error('\n❌ Error de conexión a la base de datos:');
    console.error('   Asegúrate de que:');
    console.error('   1. PostgreSQL esté corriendo');
    console.error('   2. DATABASE_URL esté configurada en el entorno');
    console.error('   3. Las credenciales sean correctas');
    console.error('\n   Ejemplo de configuración:');
    console.error('   $env:DATABASE_URL="postgresql://usuario:password@localhost:5432/nombre_db"\n');
    throw error;
  }

  const resources = getSystemResources();
  const configs = await getPostgresConfig();
  const recommendations = calculateRecommendations(configs, resources);

  // Generar reporte
  console.log('\n========================================');
  console.log('ANÁLISIS DE CONFIGURACIÓN DE POSTGRESQL');
  console.log('========================================\n');

  console.log('📊 RECURSOS DEL SISTEMA:');
  console.log(`   RAM Total: ${resources.totalMemoryGB.toFixed(2)}GB`);
  console.log(`   RAM Disponible: ${resources.availableMemoryGB.toFixed(2)}GB`);
  console.log(`   CPUs: ${resources.cpuCount}`);
  console.log('');

  console.log('⚙️  CONFIGURACIÓN ACTUAL Y RECOMENDACIONES:\n');

  const needsRestart: PostgresConfig[] = [];
  const needsReload: PostgresConfig[] = [];
  const needsChangeList: PostgresConfig[] = [];

  recommendations.forEach(config => {
    const shouldChange = config.recommended && config.current !== config.recommended;
    
    if (shouldChange) {
      if (config.requiresRestart) {
        needsRestart.push(config);
      } else {
        needsReload.push(config);
      }
      needsChangeList.push(config);
    }

    const status = shouldChange ? '⚠️' : '✅';
    console.log(`${status} ${config.name}:`);
    console.log(`   Actual: ${config.current} ${config.unit}`);
    if (config.recommended) {
      console.log(`   Recomendado: ${config.recommended} ${config.unit}`);
    }
    if (config.requiresRestart) {
      console.log(`   ⚠️  Requiere reinicio de PostgreSQL`);
    }
    console.log(`   Descripción: ${config.description}`);
    console.log('');
  });

  // Resumen de cambios necesarios
  if (needsChangeList.length > 0) {
    console.log('\n========================================');
    console.log('CAMBIOS RECOMENDADOS');
    console.log('========================================\n');

    if (needsRestart.length > 0) {
      console.log('🔴 CAMBIOS QUE REQUIEREN REINICIO:\n');
      needsRestart.forEach(config => {
        console.log(`   ${config.name} = ${config.recommended}`);
      });
      console.log('');
    }

    if (needsReload.length > 0) {
      console.log('🟡 CAMBIOS QUE REQUIEREN RELOAD (sin reinicio):\n');
      needsReload.forEach(config => {
        console.log(`   ALTER SYSTEM SET ${config.name} = '${config.recommended}';`);
      });
      console.log('');
    }

    console.log('📝 PRÓXIMOS PASOS:');
    console.log('   1. Revisar recomendaciones');
    console.log('   2. Aplicar cambios en postgresql.conf o con ALTER SYSTEM');
    if (needsRestart.length > 0) {
      console.log('   3. Reiniciar PostgreSQL para aplicar cambios que requieren reinicio');
    } else if (needsReload.length > 0) {
      console.log('   3. Ejecutar: SELECT pg_reload_conf(); para aplicar cambios');
    }
    console.log('   4. Verificar cambios con: SHOW <parameter_name>;');
    console.log('   5. Monitorear performance después de cambios\n');
  } else {
    console.log('✅ La configuración actual es óptima según las mejores prácticas.\n');
  }

  // Verificar pg_stat_statements
  try {
    const pgStatStatements = await db().execute(sql.raw(`
      SELECT COUNT(*) as extension_count
      FROM pg_extension
      WHERE extname = 'pg_stat_statements'
    `));
    
    const extensionExists = parseInt((pgStatStatements.rows[0] as any).extension_count, 10) > 0;
    
    if (!extensionExists) {
      console.log('⚠️  RECOMENDACIÓN ADICIONAL:');
      console.log('   Instalar extensión pg_stat_statements para análisis de queries:');
      console.log('   CREATE EXTENSION IF NOT EXISTS pg_stat_statements;');
      console.log('   (Requiere agregar a shared_preload_libraries en postgresql.conf)\n');
    }
  } catch (error) {
    logger.warn({ error }, 'No se pudo verificar pg_stat_statements');
  }
}

// Ejecutar análisis
analyzePostgresConfig()
  .then(() => {
    logger.info('Análisis completado');
    process.exit(0);
  })
  .catch((error) => {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Error en análisis');
    process.exit(1);
  });

