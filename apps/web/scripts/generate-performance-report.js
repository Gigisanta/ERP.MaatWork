#!/usr/bin/env node

/**
 * Performance Report Generator
 * 
 * AI_DECISION: Create automated performance report generator
 * Justificación: Provides comprehensive performance metrics in a single report
 * Impacto: Easier performance monitoring, better visibility of metrics
 * 
 * Usage:
 *   node scripts/generate-performance-report.js
 * 
 * This script generates a comprehensive performance report including:
 * - Bundle size metrics
 * - Lighthouse CI metrics (if available)
 * - Recommendations for optimization
 */

const fs = require('fs');
const path = require('path');
const { checkBundleSizes } = require('./check-bundle-size');

const REPORT_PATH = path.join(__dirname, '..', 'PERFORMANCE_REPORT.md');
const BUNDLE_REPORT_PATH = path.join(__dirname, '..', '.next', 'bundle-report.json');
const LIGHTHOUSE_REPORT_PATH = path.join(__dirname, '..', '.lighthouseci');

/**
 * Load bundle report if exists
 */
function loadBundleReport() {
  try {
    if (fs.existsSync(BUNDLE_REPORT_PATH)) {
      return JSON.parse(fs.readFileSync(BUNDLE_REPORT_PATH, 'utf8'));
    }
  } catch (err) {
    console.warn('⚠️  Could not load bundle report:', err.message);
  }
  return null;
}

/**
 * Load Lighthouse report if exists
 */
function loadLighthouseReport() {
  try {
    // Look for latest Lighthouse report
    if (fs.existsSync(LIGHTHOUSE_REPORT_PATH)) {
      const files = fs.readdirSync(LIGHTHOUSE_REPORT_PATH);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      if (jsonFiles.length > 0) {
        const latest = jsonFiles.sort().reverse()[0];
        return JSON.parse(fs.readFileSync(path.join(LIGHTHOUSE_REPORT_PATH, latest), 'utf8'));
      }
    }
  } catch (err) {
    console.warn('⚠️  Could not load Lighthouse report:', err.message);
  }
  return null;
}

/**
 * Generate performance report
 */
function generateReport() {
  console.log('📊 Generating performance report...\n');

  // Get bundle metrics
  const bundleReport = loadBundleReport();
  let bundleMetrics = null;
  
  if (!bundleReport) {
    console.log('⚠️  No bundle report found. Running bundle size check...');
    const result = checkBundleSizes();
    if (result.report) {
      bundleMetrics = result.report;
    }
  } else {
    bundleMetrics = bundleReport;
  }

  // Get Lighthouse metrics
  const lighthouseReport = loadLighthouseReport();

  // Generate markdown report
  const report = generateMarkdownReport(bundleMetrics, lighthouseReport);

  // Save report
  fs.writeFileSync(REPORT_PATH, report);
  console.log(`✅ Performance report generated: ${REPORT_PATH}\n`);
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(bundleMetrics, lighthouseMetrics) {
  const timestamp = new Date().toISOString();
  
  let report = `# Performance Report

**Generated:** ${new Date(timestamp).toLocaleString()}

## Bundle Size Metrics

`;

  if (bundleMetrics) {
    report += `### Current Metrics

- **First Load JS:** ${bundleMetrics.metrics.firstLoadJS.toFixed(2)} KB / ${bundleMetrics.limits.firstLoadJS} KB ${bundleMetrics.metrics.firstLoadJS > bundleMetrics.limits.firstLoadJS ? '⚠️ EXCEEDS LIMIT' : '✅'}
- **Total Bundle:** ${bundleMetrics.metrics.totalBundle.toFixed(2)} KB / ${bundleMetrics.limits.total} KB ${bundleMetrics.metrics.totalBundle > bundleMetrics.limits.total ? '⚠️ EXCEEDS LIMIT' : '✅'}
- **First Load Chunks:** ${bundleMetrics.metrics.firstLoadChunks}
- **Lazy Chunks:** ${bundleMetrics.metrics.lazyChunks}
- **Total Chunks:** ${bundleMetrics.metrics.totalChunks}

### Largest Chunks

`;
    if (bundleMetrics.chunks.largest.length > 0) {
      bundleMetrics.chunks.largest.slice(0, 10).forEach((chunk, index) => {
        report += `${index + 1}. **${chunk.file}**: ${chunk.size.toFixed(2)} KB\n`;
      });
    }

    if (bundleMetrics.errors.length > 0) {
      report += `\n### ⚠️ Errors\n\n`;
      bundleMetrics.errors.forEach(error => {
        report += `- ${error}\n`;
      });
    }

    if (bundleMetrics.warnings.length > 0) {
      report += `\n### ⚠️ Warnings\n\n`;
      bundleMetrics.warnings.forEach(warning => {
        report += `- ${warning}\n`;
      });
    }
  } else {
    report += `⚠️ Bundle metrics not available. Run \`pnpm -F @cactus/web build && pnpm -F @cactus/web check:bundle\` to generate.\n`;
  }

  report += `\n## Lighthouse Metrics\n\n`;

  if (lighthouseMetrics) {
    // Extract Lighthouse scores if available
    if (lighthouseMetrics.lhr) {
      const scores = lighthouseMetrics.lhr.categories;
      report += `### Performance Scores\n\n`;
      Object.keys(scores).forEach(key => {
        const score = scores[key];
        report += `- **${score.title}**: ${(score.score * 100).toFixed(0)}/100\n`;
      });
    }
  } else {
    report += `⚠️ Lighthouse metrics not available. Run \`pnpm lighthouse\` to generate.\n`;
  }

  report += `\n## Optimization Recommendations\n\n`;

  if (bundleMetrics) {
    if (bundleMetrics.metrics.firstLoadJS > bundleMetrics.limits.firstLoadJS * 0.8) {
      report += `### ⚠️ First Load JS Approaching Limit\n\n`;
      report += `- Consider code splitting for large components\n`;
      report += `- Review dynamic imports for heavy dependencies\n`;
      report += `- Evaluate Server Components for data-heavy pages\n\n`;
    }

    if (bundleMetrics.chunks.largest.length > 0) {
      const largestChunk = bundleMetrics.chunks.largest[0];
      if (largestChunk.size > 150) {
        report += `### ⚠️ Large Chunk Detected\n\n`;
        report += `- Largest chunk: **${largestChunk.file}** (${largestChunk.size.toFixed(2)} KB)\n`;
        report += `- Consider splitting this chunk or lazy loading its dependencies\n\n`;
      }
    }
  }

  report += `### General Recommendations\n\n`;
  report += `1. **Monitor bundle size** in CI/CD to prevent regressions\n`;
  report += `2. **Use dynamic imports** for heavy components (charts, editors, etc.)\n`;
  report += `3. **Convert to Server Components** where possible to reduce client JS\n`;
  report += `4. **Optimize images** using next/image with proper sizing\n`;
  report += `5. **Review dependencies** for alternatives with smaller bundle size\n\n`;

  report += `## Next Steps\n\n`;
  report += `1. Review bundle size metrics above\n`;
  report += `2. Address any errors or warnings\n`;
  report += `3. Implement optimization recommendations\n`;
  report += `4. Re-run report to verify improvements\n\n`;

  report += `---\n\n`;
  report += `*Report generated automatically. Update by running: \`node apps/web/scripts/generate-performance-report.js\`*\n`;

  return report;
}

// Main execution
if (require.main === module) {
  generateReport();
}

module.exports = { generateReport };

