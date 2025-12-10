/**
 * Performance monitoring script
 *
 * AI_DECISION: Create script for continuous performance monitoring
 * Justificación: Provides automated way to track performance metrics over time
 * Impacto: Early detection of performance regressions, data-driven optimization
 *
 * Usage:
 *   node scripts/performance-check.js
 *   ANALYZE=true node scripts/performance-check.js  # Include bundle analysis
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PERFORMANCE_LOG = path.join(__dirname, '../.next/performance-log.json');

/**
 * Get bundle size from build output
 */
function getBundleSizes() {
  try {
    const buildOutput = execSync('pnpm -F @cactus/web build 2>&1', {
      encoding: 'utf-8',
      cwd: path.join(__dirname, '../..'),
    });

    // Extract bundle sizes from Next.js build output
    const bundleSizeMatch = buildOutput.match(/Route \(app\)\s+(\d+)\s+(\d+)\s+(\d+)/);
    if (bundleSizeMatch) {
      return {
        firstLoadJs: parseInt(bundleSizeMatch[1]),
        sharedJs: parseInt(bundleSizeMatch[2]),
        totalJs: parseInt(bundleSizeMatch[3]),
      };
    }

    // Try to parse from .next/build-manifest.json
    const manifestPath = path.join(__dirname, '../.next/build-manifest.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      let totalSize = 0;
      Object.values(manifest.pages || {}).forEach((files) => {
        files.forEach((file) => {
          const filePath = path.join(__dirname, '../.next', file);
          if (fs.existsSync(filePath)) {
            totalSize += fs.statSync(filePath).size;
          }
        });
      });
      return {
        totalJs: totalSize,
        timestamp: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.warn('Could not get bundle sizes:', error.message);
  }
  return null;
}

/**
 * Log performance metrics
 */
function logPerformanceMetrics(metrics) {
  const log = {
    timestamp: new Date().toISOString(),
    ...metrics,
  };

  // Ensure directory exists
  const logDir = path.dirname(PERFORMANCE_LOG);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Read existing log
  let logs = [];
  if (fs.existsSync(PERFORMANCE_LOG)) {
    try {
      logs = JSON.parse(fs.readFileSync(PERFORMANCE_LOG, 'utf-8'));
    } catch (error) {
      console.warn('Could not read existing log, starting fresh');
    }
  }

  // Add new entry
  logs.push(log);

  // Keep only last 100 entries
  if (logs.length > 100) {
    logs = logs.slice(-100);
  }

  // Write back
  fs.writeFileSync(PERFORMANCE_LOG, JSON.stringify(logs, null, 2));

  return log;
}

/**
 * Main function
 */
function main() {
  console.log('🔍 Checking performance metrics...\n');

  const metrics = {
    bundleSizes: null,
  };

  // Get bundle sizes if build exists
  if (fs.existsSync(path.join(__dirname, '../.next'))) {
    metrics.bundleSizes = getBundleSizes();
  } else {
    console.log('⚠️  No build found. Run "pnpm -F @cactus/web build" first.');
  }

  // Log metrics
  const logged = logPerformanceMetrics(metrics);

  console.log('📊 Performance Metrics:');
  console.log(JSON.stringify(logged, null, 2));
  console.log('\n✅ Metrics logged to:', PERFORMANCE_LOG);

  // Show trend if available
  if (fs.existsSync(PERFORMANCE_LOG)) {
    const logs = JSON.parse(fs.readFileSync(PERFORMANCE_LOG, 'utf-8'));
    if (logs.length > 1) {
      const previous = logs[logs.length - 2];
      const current = logs[logs.length - 1];

      if (previous.bundleSizes && current.bundleSizes) {
        const diff = current.bundleSizes.totalJs - previous.bundleSizes.totalJs;
        const percentChange = ((diff / previous.bundleSizes.totalJs) * 100).toFixed(2);
        console.log('\n📈 Trend:');
        console.log(
          `  Bundle size: ${diff > 0 ? '+' : ''}${(diff / 1024).toFixed(2)} KB (${percentChange}%)`
        );
      }
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { getBundleSizes, logPerformanceMetrics };
