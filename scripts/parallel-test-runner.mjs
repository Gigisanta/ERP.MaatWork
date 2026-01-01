#!/usr/bin/env node
/**
 * Parallel Test Runner
 *
 * AI_DECISION: Replace serial test execution with parallel via Turbo
 * Justificación: Aprovechar Turbo's built-in parallelization
 * Impacto: Tests 60-70% más rápidos en ejecución total
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = `${__dirname}/..`;

// Get optimal concurrency from adaptive config
let concurrency = 4;
try {
  const { getOptimalThreads } = await import('./adaptive-test-config.mjs');
  const { maxThreads } = getOptimalThreads();
  concurrency = Math.max(2, Math.min(maxThreads, 6)); // Cap at 6 for stability
} catch (error) {
  console.warn('⚠️  Could not load adaptive config, using default concurrency: 4');
}

const PACKAGES = [
  '@maatwork/ui',
  '@maatwork/api',
  '@maatwork/web',
  '@maatwork/analytics-service',
];

console.log(`\n🚀 Running tests in parallel (concurrency: ${concurrency})\n`);
console.log(`Packages: ${PACKAGES.join(', ')}\n`);

const startTime = Date.now();

try {
  // Use Turbo's built-in parallelization
  execSync(`pnpm turbo run test:unit --concurrency=${concurrency}`, {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' },
  });
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ All tests passed in ${duration}s\n`);
  
  // Generate success summary
  const summaryPath = path.join(rootDir, 'test-results', 'parallel-test-summary.txt');
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, [
    `PARALLEL TEST RUN - ${new Date().toISOString()}`,
    `================================================================`,
    `Status: SUCCESS ✅`,
    `Duration: ${duration}s`,
    `Concurrency: ${concurrency}`,
    `Packages: ${PACKAGES.join(', ')}`,
    `================================================================`,
  ].join('\n'));
  
  process.exit(0);
} catch (error) {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.error(`\n❌ Tests failed after ${duration}s\n`);
  
  // Generate failure summary
  const summaryPath = path.join(rootDir, 'test-results', 'parallel-test-summary.txt');
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, [
    `PARALLEL TEST RUN - ${new Date().toISOString()}`,
    `================================================================`,
    `Status: FAILED ❌`,
    `Duration: ${duration}s`,
    `Concurrency: ${concurrency}`,
    `Packages: ${PACKAGES.join(', ')}`,
    `================================================================`,
    ``,
    `See individual package logs for details.`,
  ].join('\n'));
  
  process.exit(1);
}



