#!/usr/bin/env node

/**
 * Bundle Size Checker Script
 *
 * Verifies that bundle sizes are within acceptable limits after Next.js build.
 * This script parses the .next/analyze output or build manifest to check sizes.
 *
 * Usage:
 *   node scripts/check-bundle-size.js
 *
 * Environment Variables:
 *   BUNDLE_SIZE_LIMIT_FIRST_LOAD_JS - Max size for First Load JS (default: 300KB)
 *   BUNDLE_SIZE_LIMIT_CHUNK - Max size for individual chunks (default: 200KB)
 *   BUNDLE_SIZE_LIMIT_TOTAL - Max total bundle size (default: 1MB)
 */

const fs = require('fs');
const path = require('path');

// Bundle size limits (in KB)
const LIMITS = {
  FIRST_LOAD_JS: parseInt(process.env.BUNDLE_SIZE_LIMIT_FIRST_LOAD_JS || '300', 10),
  CHUNK: parseInt(process.env.BUNDLE_SIZE_LIMIT_CHUNK || '200', 10),
  TOTAL: parseInt(process.env.BUNDLE_SIZE_LIMIT_TOTAL || '1000', 10),
};

// Convert bytes to KB
function bytesToKB(bytes) {
  return Math.round((bytes / 1024) * 100) / 100;
}

// Get file size in KB
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return bytesToKB(stats.size);
  } catch (err) {
    return 0;
  }
}

// Find all JS files in a directory recursively
function findJSFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findJSFiles(filePath, fileList);
    } else if (file.endsWith('.js') && !file.includes('node_modules')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Parse Next.js 14 App Router build manifest
function parseBuildManifest() {
  const buildDir = path.join(__dirname, '..', '.next');
  const manifestPath = path.join(buildDir, 'build-manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.warn('⚠️  Build manifest not found. Run "next build" first.');
    return null;
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return manifest;
  } catch (err) {
    console.error('❌ Error parsing build manifest:', err.message);
    return null;
  }
}

// Parse Next.js 14 App Router route manifest
function parseRouteManifest() {
  const buildDir = path.join(__dirname, '..', '.next');
  const routeManifestPath = path.join(buildDir, 'routes-manifest.json');

  if (!fs.existsSync(routeManifestPath)) {
    return null;
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(routeManifestPath, 'utf8'));
    return manifest;
  } catch (err) {
    return null;
  }
}

// Get First Load JS chunks for Next.js 14 App Router
function getFirstLoadChunks(jsFiles) {
  // Next.js 14 App Router structure:
  // - app/layout.js - Root layout (always loaded)
  // - app/page.js - Home page (always loaded)
  // - webpack.js - Webpack runtime (always loaded)
  // - main-app.js - Main app bundle (always loaded)
  const firstLoadPatterns = [
    /\/app\/layout/,
    /\/app\/page/,
    /webpack/,
    /main-app/,
    /^main/,
    /^app$/,
  ];

  return jsFiles.filter((file) => {
    const relativePath = path.relative(path.join(__dirname, '..', '.next', 'static'), file);
    return firstLoadPatterns.some((pattern) => pattern.test(relativePath));
  });
}

// Check bundle sizes from static files (Next.js 14 App Router compatible)
function checkBundleSizes() {
  const buildDir = path.join(__dirname, '..', '.next', 'static');

  if (!fs.existsSync(buildDir)) {
    console.warn('⚠️  Build directory not found. Run "next build" first.');
    return { passed: false, errors: ['Build directory not found'] };
  }

  const jsFiles = findJSFiles(buildDir);
  const errors = [];
  const warnings = [];
  let totalSize = 0;
  let firstLoadSize = 0;

  // Get First Load JS chunks for Next.js 14 App Router
  const firstLoadChunks = getFirstLoadChunks(jsFiles);

  // Calculate First Load JS (main app chunks)
  const firstLoadChunkDetails = [];
  firstLoadChunks.forEach((file) => {
    const size = getFileSize(file);
    firstLoadSize += size;
    totalSize += size;
    const fileName = path.relative(buildDir, file);

    firstLoadChunkDetails.push({ file: fileName, size });

    if (size > LIMITS.CHUNK) {
      errors.push(
        `❌ First Load chunk ${fileName} exceeds limit: ${size.toFixed(2)}KB > ${LIMITS.CHUNK}KB`
      );
    }
  });

  // Check all other chunks (lazy-loaded)
  const lazyChunks = jsFiles.filter((file) => !firstLoadChunks.includes(file));
  const largestChunks = [];
  const lazyChunkDetails = [];

  lazyChunks.forEach((file) => {
    const size = getFileSize(file);
    totalSize += size;
    const fileName = path.relative(buildDir, file);

    lazyChunkDetails.push({ file: fileName, size });

    if (size > LIMITS.CHUNK) {
      warnings.push(
        `⚠️  Lazy chunk ${fileName} exceeds limit: ${size.toFixed(2)}KB > ${LIMITS.CHUNK}KB`
      );
    }

    // Track largest chunks for reporting
    largestChunks.push({ file: fileName, size });
  });

  // Sort largest chunks
  largestChunks.sort((a, b) => b.size - a.size);

  // Check First Load JS limit
  if (firstLoadSize > LIMITS.FIRST_LOAD_JS) {
    errors.push(
      `❌ First Load JS exceeds limit: ${firstLoadSize.toFixed(2)}KB > ${LIMITS.FIRST_LOAD_JS}KB`
    );
  }

  // Check total bundle size
  if (totalSize > LIMITS.TOTAL) {
    errors.push(
      `❌ Total bundle size exceeds limit: ${totalSize.toFixed(2)}KB > ${LIMITS.TOTAL}KB`
    );
  }

  // Build report object
  const report = {
    timestamp: new Date().toISOString(),
    limits: {
      firstLoadJS: LIMITS.FIRST_LOAD_JS,
      chunk: LIMITS.CHUNK,
      total: LIMITS.TOTAL,
    },
    metrics: {
      firstLoadJS: Math.round(firstLoadSize * 100) / 100,
      totalBundle: Math.round(totalSize * 100) / 100,
      firstLoadChunks: firstLoadChunks.length,
      lazyChunks: lazyChunks.length,
      totalChunks: jsFiles.length,
    },
    chunks: {
      firstLoad: firstLoadChunkDetails.map((c) => ({
        file: c.file,
        size: Math.round(c.size * 100) / 100,
      })),
      largest: largestChunks
        .slice(0, 10)
        .map((c) => ({ file: c.file, size: Math.round(c.size * 100) / 100 })),
    },
    warnings: warnings.map((w) => w.replace(/⚠️\s+/, '')),
    errors: errors.map((e) => e.replace(/❌\s+/, '')),
    passed: errors.length === 0,
  };

  // Print summary
  console.log('\n📦 Bundle Size Report (Next.js 14 App Router)\n');
  console.log(`First Load JS: ${firstLoadSize.toFixed(2)}KB / ${LIMITS.FIRST_LOAD_JS}KB`);
  console.log(`Total Bundle: ${totalSize.toFixed(2)}KB / ${LIMITS.TOTAL}KB`);
  console.log(`First Load Chunks: ${firstLoadChunks.length}`);
  console.log(`Lazy Chunks: ${lazyChunks.length}`);
  console.log(`Total Chunks: ${jsFiles.length}\n`);

  // Show largest chunks
  if (largestChunks.length > 0) {
    console.log('Top 5 Largest Chunks:');
    largestChunks.slice(0, 5).forEach((chunk, index) => {
      console.log(`  ${index + 1}. ${chunk.file}: ${chunk.size.toFixed(2)}KB`);
    });
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('Warnings:');
    warnings.forEach((warning) => console.log(`  ${warning}`));
    console.log('');
  }

  if (errors.length > 0) {
    console.log('Errors:');
    errors.forEach((error) => console.log(`  ${error}`));
    console.log('');
    return { passed: false, errors, warnings, firstLoadSize, totalSize, report };
  }

  console.log('✅ All bundle sizes are within limits!\n');
  return { passed: true, errors: [], warnings, firstLoadSize, totalSize, report };
}

// Save report to JSON file
function saveReport(report, outputPath) {
  try {
    const reportDir = path.dirname(outputPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved to: ${outputPath}`);
  } catch (err) {
    console.warn('⚠️  Could not save report:', err.message);
  }
}

// Main execution
function main() {
  console.log('🔍 Checking bundle sizes...\n');
  console.log(`Limits:`);
  console.log(`  First Load JS: ${LIMITS.FIRST_LOAD_JS}KB`);
  console.log(`  Individual Chunks: ${LIMITS.CHUNK}KB`);
  console.log(`  Total Bundle: ${LIMITS.TOTAL}KB\n`);

  const result = checkBundleSizes();

  // Save report if requested
  const reportPath =
    process.env.BUNDLE_REPORT_PATH || path.join(__dirname, '..', '.next', 'bundle-report.json');
  if (result.report) {
    saveReport(result.report, reportPath);
  }

  // In CI/CD, exit with error code if check failed
  // But allow warnings to pass (only errors fail)
  if (!result.passed) {
    console.error('❌ Bundle size check failed!');
    process.exit(1);
  }

  process.exit(0);
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { checkBundleSizes, LIMITS, saveReport };
