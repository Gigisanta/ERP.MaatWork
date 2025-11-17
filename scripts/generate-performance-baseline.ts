/**
 * Script para generar baseline de performance de queries
 * 
 * Ejecuta análisis completo de queries existentes y genera reporte baseline
 * para comparación futura después de optimizaciones.
 */

import { getQueryMetrics, getSlowQueries, getNPlusOneQueries } from '../apps/api/src/utils/db-logger';
import { analyzeQueries, generateTextReport } from '../apps/api/src/utils/query-analyzer';
import { getCacheHealth } from '../apps/api/src/utils/cache';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function generateBaseline() {
  console.log('📊 Generando baseline de performance de queries...\n');

  try {
    // Obtener métricas actuales
    const allMetrics = getQueryMetrics();
    const slowQueries = getSlowQueries(500); // Threshold de 500ms
    const nPlusOneQueries = getNPlusOneQueries();
    const cacheHealth = getCacheHealth();

    // Generar análisis completo
    const analysis = analyzeQueries(500);

    // Generar reporte de texto
    const textReport = generateTextReport(analysis);

    // Calcular hit rate general de caché
    const cacheStats = Object.values(cacheHealth);
    const totalHits = cacheStats.reduce((sum: number, stats: any) => sum + (stats.hits || 0), 0);
    const totalMisses = cacheStats.reduce((sum: number, stats: any) => sum + (stats.misses || 0), 0);
    const overallHitRate = totalHits + totalMisses > 0 
      ? totalHits / (totalHits + totalMisses) 
      : 0;

    // Crear objeto de baseline
    const baseline = {
      timestamp: new Date().toISOString(),
      summary: {
        totalQueries: allMetrics.length,
        slowQueriesCount: slowQueries.length,
        nPlusOneQueriesCount: nPlusOneQueries.length,
        cacheHitRate: overallHitRate
      },
      topSlowQueries: slowQueries.slice(0, 20).map(m => ({
        operation: m.operationBase,
        count: m.count,
        avgDuration: m.avgDuration,
        p95Duration: m.p95Duration,
        p99Duration: m.p99Duration
      })),
      topFrequentQueries: allMetrics
        .filter(m => m.count > 100)
        .sort((a, b) => b.count - a.count)
        .slice(0, 20)
        .map(m => ({
          operation: m.operationBase,
          count: m.count,
          avgDuration: m.avgDuration,
          p95Duration: m.p95Duration
        })),
      nPlusOneQueries: nPlusOneQueries.map(m => ({
        operation: m.operationBase,
        count: m.count,
        nPlusOneCount: m.nPlusOneCount,
        avgDuration: m.avgDuration
      })),
      cacheHealth: {
        overallHitRate: overallHitRate,
        caches: Object.entries(cacheHealth).map(([name, stats]: [string, any]) => ({
          name,
          hitRate: stats.hitRate || 0,
          hits: stats.hits || 0,
          misses: stats.misses || 0,
          keys: stats.keys || 0
        }))
      },
      recommendations: analysis.recommendations
    };

    // Guardar baseline JSON
    const baselinePath = join(process.cwd(), 'docs', 'QUERY_PERFORMANCE_BASELINE.json');
    writeFileSync(baselinePath, JSON.stringify(baseline, null, 2), 'utf-8');
    console.log(`✅ Baseline JSON guardado en: ${baselinePath}`);

    // Guardar reporte de texto
    const reportPath = join(process.cwd(), 'docs', 'QUERY_PERFORMANCE_BASELINE.txt');
    writeFileSync(reportPath, textReport, 'utf-8');
    console.log(`✅ Reporte de texto guardado en: ${reportPath}`);

    // Mostrar resumen en consola
    console.log('\n📈 RESUMEN DEL BASELINE:');
    console.log('='.repeat(80));
    console.log(`Total de queries analizadas: ${baseline.summary.totalQueries}`);
    console.log(`Queries lentas (>500ms p95): ${baseline.summary.slowQueriesCount}`);
    console.log(`Queries N+1 detectadas: ${baseline.summary.nPlusOneQueriesCount}`);
    console.log(`Cache hit rate general: ${(baseline.summary.cacheHitRate * 100).toFixed(2)}%`);
    console.log(`Recomendaciones generadas: ${baseline.recommendations.length}`);

    if (baseline.topSlowQueries.length > 0) {
      console.log('\n🐌 TOP 5 QUERIES MÁS LENTAS:');
      baseline.topSlowQueries.slice(0, 5).forEach((q, i) => {
        console.log(`${i + 1}. ${q.operation}`);
        console.log(`   Promedio: ${q.avgDuration.toFixed(2)}ms | P95: ${q.p95Duration.toFixed(2)}ms | Ejecuciones: ${q.count}`);
      });
    }

    if (baseline.nPlusOneQueries.length > 0) {
      console.log('\n⚠️  QUERIES N+1 DETECTADAS:');
      baseline.nPlusOneQueries.forEach(q => {
        console.log(`- ${q.operation}: ${q.nPlusOneCount} ocurrencias N+1 de ${q.count} ejecuciones totales`);
      });
    }

    console.log('\n✅ Baseline generado exitosamente');
  } catch (error) {
    console.error('❌ Error generando baseline:', error);
    throw error;
  }
}

// Ejecutar generación de baseline
generateBaseline()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });

