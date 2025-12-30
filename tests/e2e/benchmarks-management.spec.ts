import { test, expect } from './fixtures';

test.describe('Benchmarks Management', () => {
  test('create benchmark with components', async ({ benchmarksPage }) => {
    const timestamp = Date.now();
    const benchmarkName = `Benchmark ${timestamp}`;

    await benchmarksPage.gotoList();

    // Create
    await benchmarksPage.createBenchmark(benchmarkName);

    // View Details
    await benchmarksPage.openBenchmark(benchmarkName);

    // Add Component
    await benchmarksPage.addComponent('SPY', '100');
  });
});
