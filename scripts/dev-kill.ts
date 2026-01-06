#!/usr/bin/env tsx
/**
 * Dev Kill - Mata procesos de desarrollo
 *
 * Script rápido para matar todos los procesos de desarrollo.
 * Cross-platform: Windows/macOS/Linux.
 *
 * @example
 * pnpm tsx scripts/dev-kill.ts
 */

import { exec, config } from './lib/index';

const patterns = [
  'tsx watch src/index.ts',
  'next dev',
  'python.*main.py',
  'uvicorn.*main:app',
  'dev-unified.js',
];

if (config.isWindows) {
  // Windows: Usar PowerShell o wmic
  for (const pattern of patterns) {
    try {
      exec(`wmic process where "CommandLine like '%${pattern}%'" delete`, {
        silent: true,
        stdio: 'pipe',
      });
    } catch {
      // Ignorar errores
    }
  }
} else {
  // Unix/Linux/macOS: Usar pkill
  for (const pattern of patterns) {
    try {
      exec(`pkill -f "${pattern}" 2>/dev/null || true`, {
        silent: true,
        stdio: 'pipe',
      });
    } catch {
      // Ignorar errores
    }
  }
}

process.exit(0);
