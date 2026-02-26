#!/usr/bin/env node
/**
 * Railway Build Script
 *
 * Decides what to build based on RAILWAY_SERVICE_NAME environment variable.
 * This solves the issue where Railway monorepo deployments need to build
 * different services.
 */

const { execSync } = require('child_process');
const serviceName = process.env.RAILWAY_SERVICE_NAME || '';

console.log(`🏗️  Railway Build: Detected service: ${serviceName}`);

const sharedPackages = [
  '@maatwork/types',
  '@maatwork/utils',
  '@maatwork/logger',
  '@maatwork/db',
  '@maatwork/ui',
];

// Build shared packages first (needed by all services)
console.log('📦 Building shared packages...');
for (const pkg of sharedPackages) {
  console.log(`  Building ${pkg}...`);
  execSync(`pnpm -F ${pkg} build`, { stdio: 'inherit' });
}

// Determine what to build based on service name
if (serviceName.toLowerCase().includes('api')) {
  console.log('🚀 Building API service...');
  execSync('pnpm -F @maatwork/api build', { stdio: 'inherit' });
} else if (serviceName.toLowerCase().includes('analytics')) {
  console.log('📊 Building Analytics service...');
  // No build needed for Python, just verify dependencies
  console.log('  (Python service - no build needed)');
} else {
  // Default: build web
  console.log('🌐 Building Web service...');
  execSync('pnpm -F @maatwork/web build', { stdio: 'inherit' });
}

console.log('✅ Build complete!');
