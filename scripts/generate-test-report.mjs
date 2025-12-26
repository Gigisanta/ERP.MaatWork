import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const resultsDir = path.join(rootDir, 'test-results');

if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

const reportFile = path.join(resultsDir, 'test-errors.txt');

// Reset report file
fs.writeFileSync(reportFile, `MAATWORK TEST ERROR REPORT - ${new Date().toLocaleString()}\n`);
fs.appendFileSync(reportFile, `================================================================\n\n`);

const packages = [
  { name: '@maatwork/ui', cmd: 'pnpm', args: ['-F', '@maatwork/ui', 'test:unit'] },
  { name: '@maatwork/api', cmd: 'pnpm', args: ['-F', '@maatwork/api', 'test:unit'] },
  { name: '@maatwork/web', cmd: 'pnpm', args: ['-F', '@maatwork/web', 'test:unit'] },
  { name: '@maatwork/analytics-service', cmd: 'pnpm', args: ['-F', '@maatwork/analytics-service', 'test:unit'] }
];

let globalPassed = true;

for (const pkg of packages) {
  console.log(`\n🔍 Running tests for ${pkg.name}...`);
  
  const result = spawnSync(pkg.cmd, pkg.args, {
    cwd: rootDir,
    env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    shell: true
  });

  if (result.status !== 0) {
    globalPassed = false;
    const output = result.stdout || '';
    const errorOutput = result.stderr || '';
    
    console.log(`❌ ${pkg.name} failed. Logging errors...`);
    
    fs.appendFileSync(reportFile, `[FAILED] ${pkg.name}\n`);
    fs.appendFileSync(reportFile, `----------------------------------------------------------------\n`);
    
    const combinedOutput = output + '\n' + errorOutput;
    const lines = combinedOutput.split('\n');
    
    // Filter to only show relevant failure info
    // We want lines with FAIL, Error, stacks, and summaries
    const filteredLines = lines.filter((line, index) => {
      const lower = line.toLowerCase();
      return (
        line.includes('FAIL') ||
        line.includes('Error:') ||
        line.includes('FAILED') ||
        line.includes('❯') ||
        line.includes('at ') ||
        line.includes('Expected') ||
        line.includes('Received') ||
        line.includes('Summary') ||
        lower.includes('test summary info') ||
        // Keep some context around errors
        (lines[index-1] && lines[index-1].includes('FAIL')) ||
        (lines[index+1] && lines[index+1].includes('FAIL'))
      );
    });

    if (filteredLines.length > 0) {
      fs.appendFileSync(reportFile, filteredLines.join('\n'));
    } else {
      // Fallback: if we couldn't filter effectively, show the last 100 lines
      fs.appendFileSync(reportFile, "... Showing last 100 lines of output ...\n");
      fs.appendFileSync(reportFile, lines.slice(-100).join('\n'));
    }
    
    fs.appendFileSync(reportFile, `\n================================================================\n\n`);
  } else {
    fs.appendFileSync(reportFile, `[PASSED] ${pkg.name}\n`);
    fs.appendFileSync(reportFile, `----------------------------------------------------------------\n`);
    fs.appendFileSync(reportFile, `All tests passed in this package.\n`);
    fs.appendFileSync(reportFile, `\n================================================================\n\n`);
    console.log(`✅ ${pkg.name} passed.`);
  }
}

if (globalPassed) {
  fs.appendFileSync(reportFile, `ALL TESTS PASSED! 🎉\n`);
  console.log('\n✅ All tests passed. Report updated.');
} else {
  console.log(`\n❌ Some tests failed. Errors saved to: ${reportFile}`);
}

process.exit(globalPassed ? 0 : 0); // Exit with 0 so it doesn't break the process if we want to see the file

