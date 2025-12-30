#!/usr/bin/env node
/**
 * Test Result Reporter
 *
 * AI_DECISION: Generate comprehensive test reports with metrics
 * Justificación: Track test health, identify slow tests, monitor trends
 * Impacto: Better visibility into test suite performance
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.join(__dirname, '..');
const reportsDir = path.join(rootDir, 'test-results');

/**
 * Parse test summary from parallel test runner
 */
function parseSummary() {
  const summaryFile = path.join(reportsDir, 'parallel-test-summary.txt');
  
  if (!fs.existsSync(summaryFile)) {
    return null;
  }

  const content = fs.readFileSync(summaryFile, 'utf-8');
  const lines = content.split('\n');
  
  const report = {
    timestamp: lines[0]?.replace('PARALLEL TEST RUN - ', '') || new Date().toISOString(),
    status: 'UNKNOWN',
    duration: '0s',
    concurrency: 0,
    packages: [],
  };

  for (const line of lines) {
    if (line.includes('Status:')) {
      report.status = line.includes('SUCCESS') ? 'SUCCESS' : 'FAILED';
    } else if (line.includes('Duration:')) {
      report.duration = line.split('Duration:')[1]?.trim() || '0s';
    } else if (line.includes('Concurrency:')) {
      report.concurrency = parseInt(line.split('Concurrency:')[1]?.trim() || '0', 10);
    } else if (line.includes('Packages:')) {
      report.packages = line.split('Packages:')[1]?.trim().split(', ') || [];
    }
  }

  return report;
}

/**
 * Generate HTML report
 */
function generateHtmlReport(summary) {
  const statusColor = summary.status === 'SUCCESS' ? '#22c55e' : '#ef4444';
  const statusIcon = summary.status === 'SUCCESS' ? '✅' : '❌';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Report - MAATWORK</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      background: #0f172a;
      color: #e2e8f0;
    }
    .header {
      text-align: center;
      margin-bottom: 3rem;
    }
    .status {
      display: inline-block;
      padding: 1rem 2rem;
      border-radius: 0.5rem;
      font-size: 2rem;
      font-weight: bold;
      background: ${statusColor};
      color: white;
      margin: 1rem 0;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin: 2rem 0;
    }
    .metric-card {
      background: #1e293b;
      padding: 1.5rem;
      border-radius: 0.5rem;
      border: 1px solid #334155;
    }
    .metric-label {
      font-size: 0.875rem;
      color: #94a3b8;
      margin-bottom: 0.5rem;
    }
    .metric-value {
      font-size: 2rem;
      font-weight: bold;
      color: #e2e8f0;
    }
    .packages {
      background: #1e293b;
      padding: 1.5rem;
      border-radius: 0.5rem;
      border: 1px solid #334155;
      margin: 2rem 0;
    }
    .package {
      display: inline-block;
      padding: 0.5rem 1rem;
      margin: 0.25rem;
      background: #334155;
      border-radius: 0.25rem;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
    }
    .timestamp {
      text-align: center;
      color: #64748b;
      margin-top: 2rem;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🧪 Test Report</h1>
    <div class="status">${statusIcon} ${summary.status}</div>
  </div>

  <div class="metrics">
    <div class="metric-card">
      <div class="metric-label">Duration</div>
      <div class="metric-value">${summary.duration}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Concurrency</div>
      <div class="metric-value">${summary.concurrency} threads</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Packages</div>
      <div class="metric-value">${summary.packages.length}</div>
    </div>
  </div>

  <div class="packages">
    <h3>Tested Packages</h3>
    ${summary.packages.map(pkg => `<span class="package">${pkg}</span>`).join('')}
  </div>

  <div class="timestamp">
    Generated: ${new Date(summary.timestamp).toLocaleString()}
  </div>
</body>
</html>`;

  return html;
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(summary) {
  const statusEmoji = summary.status === 'SUCCESS' ? '✅' : '❌';

  return `# Test Report - MAATWORK

## ${statusEmoji} Status: ${summary.status}

### Metrics

| Metric | Value |
|--------|-------|
| Duration | ${summary.duration} |
| Concurrency | ${summary.concurrency} threads |
| Packages | ${summary.packages.length} |

### Tested Packages

${summary.packages.map(pkg => `- \`${pkg}\``).join('\n')}

---

*Generated: ${new Date(summary.timestamp).toLocaleString()}*
`;
}

/**
 * Main execution
 */
function main() {
  console.log('📊 Generating test reports...\n');

  // Ensure reports directory exists
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Parse summary
  const summary = parseSummary();
  
  if (!summary) {
    console.log('⚠️  No test summary found. Run tests first with: pnpm test');
    process.exit(1);
  }

  // Generate HTML report
  const htmlReport = generateHtmlReport(summary);
  const htmlPath = path.join(reportsDir, 'test-report.html');
  fs.writeFileSync(htmlPath, htmlReport);
  console.log(`✅ HTML report: ${htmlPath}`);

  // Generate Markdown report
  const mdReport = generateMarkdownReport(summary);
  const mdPath = path.join(reportsDir, 'test-report.md');
  fs.writeFileSync(mdPath, mdReport);
  console.log(`✅ Markdown report: ${mdPath}`);

  console.log('\n📊 Reports generated successfully!\n');
  console.log(`   View HTML: file://${htmlPath}`);
  console.log(`   View MD: ${mdPath}\n`);
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { parseSummary, generateHtmlReport, generateMarkdownReport };

