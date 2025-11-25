/**
 * Script para verificar estadísticas de cache
 * 
 * Muestra estadísticas de hit rate y uso de cache para pipeline stages,
 * instrumentos y benchmarks.
 */

import { getCacheHealth, calculateHitRate } from '../apps/api/src/utils/cache.js';
import { pipelineStagesCache, instrumentsSearchCache, benchmarksCacheUtil } from '../apps/api/src/utils/cache.js';

function formatStats(stats: ReturnType<typeof pipelineStagesCache.getStats>, name: string, hitRate: number) {
  return {
    Cache: name,
    'Hits': stats.hits,
    'Misses': stats.misses,
    'Hit Rate %': `${hitRate.toFixed(2)}%`,
    'Keys': stats.keys,
    'Size': `${(stats.ksize / 1024).toFixed(2)} KB`
  };
}

console.log('📊 Estadísticas de Cache\n');
console.log('=' .repeat(60));

const health = getCacheHealth();

const statsTable = [
  formatStats(health.pipeline, 'Pipeline Stages', health.pipeline.hitRate),
  formatStats(health.instruments, 'Instruments Search', health.instruments.hitRate),
  formatStats(health.benchmarks, 'Benchmarks', health.benchmarks.hitRate)
];

console.table(statsTable);

console.log('\n💡 Interpretación:');
console.log('- Hit Rate > 80%: Excelente uso de cache');
console.log('- Hit Rate 50-80%: Buen uso de cache');
console.log('- Hit Rate < 50%: Considerar ajustar TTL o estrategia de cache');
console.log('\n📈 Resumen de Health:');
console.log(`Pipeline Stages: ${health.pipeline.hitRate.toFixed(2)}% hit rate, ${health.pipeline.keys} keys`);
console.log(`Instruments Search: ${health.instruments.hitRate.toFixed(2)}% hit rate, ${health.instruments.keys} keys`);
console.log(`Benchmarks: ${health.benchmarks.hitRate.toFixed(2)}% hit rate, ${health.benchmarks.keys} keys`);
console.log('\n✅ Verificación de cache completada');

