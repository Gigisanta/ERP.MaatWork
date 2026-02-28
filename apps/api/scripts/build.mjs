#!/usr/bin/env node
/**
 * Build script for API using esbuild
 *
 * Creates a single bundled file for production deployment.
 * Native modules (bcrypt, pg, ioredis) are externalized.
 */
import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { rmSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// Clean dist folder
try {
  rmSync(resolve(rootDir, 'dist'), { recursive: true, force: true });
} catch {
  // Ignore if doesn't exist
}
mkdirSync(resolve(rootDir, 'dist'), { recursive: true });

// Packages with native bindings or special requirements - externalize them
const externalPackages = [
  // Native bindings
  'bcrypt',
  'pg-native',
  // Node built-ins that shouldn't be bundled
  'fsevents',
  // Optional peer dependencies
  'bufferutil',
  'utf-8-validate',
];

const startTime = Date.now();

try {
  const result = await esbuild.build({
    entryPoints: [resolve(rootDir, 'src/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    outfile: resolve(rootDir, 'dist/index.js'),

    // Externalize native modules
    external: externalPackages,

    // Handle __dirname and __filename for ESM
    // Use unique names to avoid conflicts with bundled code
    banner: {
      js: `
import { createRequire as __createRequire } from 'module';
import { fileURLToPath as __fileURLToPath } from 'url';
import { dirname as __dirname_fn } from 'path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_fn(__filename);
`.trim(),
    },

    // Source maps for debugging (optional in prod)
    sourcemap: process.env.NODE_ENV !== 'production',

    // Minify for smaller bundle (optional)
    minify: false, // Keep readable for debugging
    // Minify for smaller bundle (optional)
    minify: true, // Keep readable for debugging
    keepNames: true,

    // Tree shaking
    treeShaking: true,

    // Metafile for bundle analysis
    metafile: true,

    // Log level
    logLevel: 'info',
  });

  const duration = Date.now() - startTime;

  // Analyze bundle
  const text = await esbuild.analyzeMetafile(result.metafile, { verbose: false });

  console.log('\n📦 Build completed successfully!');
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log('\n📊 Bundle analysis:');
  console.log(text);
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}
