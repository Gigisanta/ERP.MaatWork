import os from 'os';

/**
 * Adaptive Test Configuration
 * 
 * Automatically adjusts test parallelism and timeouts based on available system resources.
 * Designed to maximize performance without freezing the system.
 */

export function getTestConfig(type = 'unit') {
  const cpus = os.cpus().length;
  const isCI = process.env.CI === 'true';
  
  // Calculate max threads
  // Reserve 2 cores for system tasks, then use 75% of remaining
  // Ensure at least 1 thread (or 2 if enough cores)
  // On CI, use more aggressive allocation if possible, or stick to provided limits
  
  let maxThreads;
  
  if (process.env.MAX_THREADS) {
    maxThreads = parseInt(process.env.MAX_THREADS, 10);
  } else {
    // Basic formula: (Cores - 2) * 0.75
    // Ensure we don't go below 1
    const availableCores = Math.max(1, cpus - 2);
    maxThreads = Math.max(1, Math.floor(availableCores * 0.75));
    
    // Cap at reasonable limits to avoid overhead
    if (maxThreads > 12) maxThreads = 12;
    // ensure at least 2 threads if we have 4+ cores
    if (cpus >= 4 && maxThreads < 2) maxThreads = 2;
  }

  const minThreads = 1;

  // Timeouts based on type
  // Unit tests should be fast
  // Integration/E2E need more time
  const timeouts = {
    unit: {
      test: 10000,
      hook: 10000,
    },
    integration: {
      test: 30000,
      hook: 30000,
    },
    e2e: {
      test: 60000,
      hook: 60000,
    }
  };

  const selectedTimeout = timeouts[type] || timeouts.unit;

  console.log(`[TestConfig] Type: ${type}, Cores: ${cpus}, Threads: ${maxThreads}, Timeout: ${selectedTimeout.test}ms`);

  return {
    maxThreads,
    minThreads,
    testTimeout: selectedTimeout.test,
    hookTimeout: selectedTimeout.hook,
    // Helper to get raw thread count if needed
    threads: maxThreads
  };
}

// For direct execution to check config
if (process.argv[1] === import.meta.filename) {
  console.log(JSON.stringify(getTestConfig(process.argv[2] || 'unit'), null, 2));
}
