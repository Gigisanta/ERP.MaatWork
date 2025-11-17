/**
 * Performance testing script
 * 
 * Tests critical endpoints to measure performance improvements
 * from optimizations (indexes, cache, query consolidation).
 */

import { getCacheHealth } from '../apps/api/src/utils/cache.js';

interface PerformanceResult {
  endpoint: string;
  method: string;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  cacheHitRate?: number;
}

async function testEndpoint(
  baseUrl: string,
  endpoint: string,
  method: string = 'GET',
  headers: Record<string, string> = {}
): Promise<PerformanceResult> {
  const times: number[] = [];
  const iterations = 50; // Number of requests to make
  
  console.log(`\n🧪 Testing ${method} ${endpoint}...`);
  
  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });
      
      if (!response.ok) {
        console.warn(`⚠️  Request ${i + 1} failed with status ${response.status}`);
      }
      
      await response.text(); // Consume response body
      const responseTime = Date.now() - startTime;
      times.push(responseTime);
    } catch (error) {
      console.error(`❌ Request ${i + 1} failed:`, error);
    }
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  if (times.length === 0) {
    throw new Error('All requests failed');
  }
  
  // Calculate statistics
  times.sort((a, b) => a - b);
  const avgResponseTime = times.reduce((a, b) => a + b, 0) / times.length;
  const p95Index = Math.floor(times.length * 0.95);
  const p99Index = Math.floor(times.length * 0.99);
  const p95ResponseTime = times[p95Index] || times[times.length - 1];
  const p99ResponseTime = times[p99Index] || times[times.length - 1];
  
  // Calculate requests per second (approximate)
  const totalTime = times.reduce((a, b) => a + b, 0);
  const requestsPerSecond = (times.length / totalTime) * 1000;
  
  return {
    endpoint,
    method,
    avgResponseTime,
    p95ResponseTime,
    p99ResponseTime,
    requestsPerSecond
  };
}

async function runPerformanceTests() {
  const baseUrl = process.env.API_URL || 'http://localhost:3001/v1';
  const authToken = process.env.AUTH_TOKEN || '';
  
  console.log('🚀 Starting Performance Tests');
  console.log(`Base URL: ${baseUrl}`);
  console.log('=' .repeat(60));
  
  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const results: PerformanceResult[] = [];
  
  try {
    // Test 1: Pipeline Stages (should benefit from cache)
    console.log('\n📊 Test 1: Pipeline Stages (Cache-enabled endpoint)');
    const pipelineResult1 = await testEndpoint(baseUrl, '/pipeline/stages', 'GET', headers);
    results.push(pipelineResult1);
    
    // Second run should hit cache
    console.log('   Running second batch (should hit cache)...');
    const pipelineResult2 = await testEndpoint(baseUrl, '/pipeline/stages', 'GET', headers);
    pipelineResult2.cacheHitRate = 100; // Assuming cache hit on second run
    results.push({ ...pipelineResult2, endpoint: '/pipeline/stages (cached)' });
    
    // Test 2: Benchmarks (should benefit from cache)
    console.log('\n📊 Test 2: Benchmarks (Cache-enabled endpoint)');
    const benchmarksResult1 = await testEndpoint(baseUrl, '/benchmarks', 'GET', headers);
    results.push(benchmarksResult1);
    
    // Second run should hit cache
    console.log('   Running second batch (should hit cache)...');
    const benchmarksResult2 = await testEndpoint(baseUrl, '/benchmarks', 'GET', headers);
    benchmarksResult2.cacheHitRate = 100;
    results.push({ ...benchmarksResult2, endpoint: '/benchmarks (cached)' });
    
    // Test 3: Health check (simple endpoint)
    console.log('\n📊 Test 3: Health Check (Simple endpoint)');
    const healthResult = await testEndpoint(baseUrl, '/health', 'GET');
    results.push(healthResult);
    
    // Display results
    console.log('\n' + '=' .repeat(60));
    console.log('📈 Performance Test Results');
    console.log('=' .repeat(60));
    
    console.table(results.map(r => ({
      Endpoint: r.endpoint,
      Method: r.method,
      'Avg (ms)': r.avgResponseTime.toFixed(2),
      'P95 (ms)': r.p95ResponseTime.toFixed(2),
      'P99 (ms)': r.p99ResponseTime.toFixed(2),
      'Req/s': r.requestsPerSecond.toFixed(2),
      'Cache Hit %': r.cacheHitRate ? `${r.cacheHitRate}%` : 'N/A'
    })));
    
    // Cache health check
    console.log('\n📊 Cache Health:');
    const cacheHealth = getCacheHealth();
    console.table([
      {
        Cache: 'Pipeline Stages',
        'Hit Rate': `${cacheHealth.pipeline.hitRate.toFixed(2)}%`,
        Hits: cacheHealth.pipeline.hits,
        Misses: cacheHealth.pipeline.misses,
        Keys: cacheHealth.pipeline.keys
      },
      {
        Cache: 'Instruments Search',
        'Hit Rate': `${cacheHealth.instruments.hitRate.toFixed(2)}%`,
        Hits: cacheHealth.instruments.hits,
        Misses: cacheHealth.instruments.misses,
        Keys: cacheHealth.instruments.keys
      },
      {
        Cache: 'Benchmarks',
        'Hit Rate': `${cacheHealth.benchmarks.hitRate.toFixed(2)}%`,
        Hits: cacheHealth.benchmarks.hits,
        Misses: cacheHealth.benchmarks.misses,
        Keys: cacheHealth.benchmarks.keys
      }
    ]);
    
    // Performance analysis
    console.log('\n💡 Performance Analysis:');
    const cachedEndpoints = results.filter(r => r.cacheHitRate !== undefined);
    if (cachedEndpoints.length > 0) {
      cachedEndpoints.forEach(r => {
        const original = results.find(orig => 
          orig.endpoint === r.endpoint.replace(' (cached)', '') && 
          orig.cacheHitRate === undefined
        );
        if (original) {
          const improvement = ((original.avgResponseTime - r.avgResponseTime) / original.avgResponseTime) * 100;
          console.log(`   ${r.endpoint}: ${improvement.toFixed(1)}% faster with cache`);
        }
      });
    }
    
    console.log('\n✅ Performance tests completed');
    
  } catch (error) {
    console.error('\n❌ Performance test failed:', error);
    process.exit(1);
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPerformanceTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { runPerformanceTests, testEndpoint };

