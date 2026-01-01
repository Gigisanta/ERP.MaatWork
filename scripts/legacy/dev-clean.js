#!/usr/bin/env node

/**
 * Cross-platform script to clean development environment
 * Kills processes using development ports (3000, 3001, analytics port)
 *
 * AI_DECISION: Consolidated cross-platform implementation
 * Justification: Single JavaScript file is easier to maintain than separate .ps1/.sh scripts
 * Impact: Consistent behavior across Windows/macOS/Linux, reduced maintenance burden
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const { resolveAnalyticsPort, buildAnalyticsServiceUrl } = require('./utils/analytics-port');

const isWindows = process.platform === 'win32';
const projectRoot = path.resolve(__dirname, '..');
const isQuiet = process.argv.includes('--quiet') || process.env.CI === 'true';

// Configure analytics port
const analyticsPort = resolveAnalyticsPort();
const analyticsUrl = buildAnalyticsServiceUrl(analyticsPort);

process.env.ANALYTICS_PORT = String(analyticsPort);
process.env.ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || analyticsUrl;
process.env.PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || analyticsUrl;

// Ports configuration
// AI_DECISION: Solo limpiamos puertos de desarrollo local (3000, 3001, analyticsPort)
// Justificación: Puertos Docker (5678 N8N, 5433 PostgreSQL) NO deben tocarse porque
// en Windows, matarlos rompe com.docker.backend.exe y Docker Desktop se cierra
// Impacto: Docker permanece estable durante desarrollo
const CRITICAL_PORTS = [3000, 3001, analyticsPort];
// IMPORTANTE: NO incluir puertos Docker aquí - rompe Docker Desktop en Windows
const OPTIONAL_PORTS = []; // Removido 5678 (N8N Docker) - ver comentario arriba

/**
 * Log message if not in quiet mode
 */
function log(message, type = 'info') {
  if (isQuiet) return;

  const colors = {
    info: '\x1b[36m', // Cyan
    success: '\x1b[32m', // Green
    warn: '\x1b[33m', // Yellow
    error: '\x1b[31m', // Red
    reset: '\x1b[0m',
  };

  const prefix = {
    info: 'ℹ️',
    success: '✅',
    warn: '⚠️',
    error: '❌',
  };

  console.log(`${colors[type]}${prefix[type]} ${message}${colors.reset}`);
}

/**
 * Get PIDs using a specific port (cross-platform)
 */
function getPidsOnPort(port) {
  const pids = new Set();

  try {
    if (isWindows) {
      // Windows: Use netstat
      const output = execSync(`netstat -ano | findstr ":${port}"`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const lines = output.split('\n');
      for (const line of lines) {
        // Match LISTENING or ESTABLISHED connections
        const match = line.match(/\s+(\d+)\s*$/);
        if (match) {
          const pid = parseInt(match[1], 10);
          if (pid > 0) pids.add(pid);
        }
      }
    } else {
      // Unix/macOS: Use lsof
      const output = execSync(`lsof -ti :${port}`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const lines = output.trim().split('\n');
      for (const line of lines) {
        const pid = parseInt(line.trim(), 10);
        if (pid > 0) pids.add(pid);
      }
    }
  } catch (error) {
    // No processes found on port - this is fine
  }

  return Array.from(pids);
}

/**
 * Kill a process by PID (cross-platform)
 */
function killProcess(pid) {
  try {
    if (isWindows) {
      // Windows: Use taskkill with force and tree kill
      execSync(`taskkill /F /T /PID ${pid}`, {
        stdio: 'pipe',
      });
    } else {
      // Unix/macOS: Use kill -9
      execSync(`kill -9 ${pid}`, {
        stdio: 'pipe',
      });
    }
    return true;
  } catch (error) {
    // Process might already be dead
    return false;
  }
}

/**
 * Kill processes matching a pattern (cross-platform)
 */
function killProcessesByPattern(pattern) {
  try {
    if (isWindows) {
      // Windows: Use WMIC to find processes
      const output = execSync(
        `wmic process where "CommandLine like '%${pattern}%'" get ProcessId`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      );

      const lines = output.split('\n');
      for (const line of lines) {
        const pid = parseInt(line.trim(), 10);
        if (pid > 0 && !isNaN(pid)) {
          killProcess(pid);
        }
      }
    } else {
      // Unix/macOS: Use pkill
      execSync(`pkill -f "${pattern}"`, { stdio: 'pipe' });
    }
  } catch (error) {
    // No matching processes found - this is fine
  }
}

/**
 * Check if a port is free
 */
function isPortFree(port) {
  return getPidsOnPort(port).length === 0;
}

/**
 * Kill all processes on a port with retries
 */
function freePort(port, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const pids = getPidsOnPort(port);

    if (pids.length === 0) {
      return true;
    }

    if (attempt === 1) {
      log(`Killing processes on port ${port}...`, 'info');
    }

    for (const pid of pids) {
      killProcess(pid);
    }

    // Wait for processes to terminate
    const waitMs = isWindows ? 1500 : 500;
    execSync(isWindows ? `ping -n 2 127.0.0.1 >nul` : `sleep 0.5`, { stdio: 'pipe' });

    if (isPortFree(port)) {
      return true;
    }

    if (attempt < maxRetries) {
      log(`Retry ${attempt}/${maxRetries} for port ${port}...`, 'warn');
    }
  }

  return isPortFree(port);
}

/**
 * Main cleanup function
 */
function cleanEnvironment() {
  log('Cleaning development environment...', 'info');

  // Kill common development processes first
  log('Stopping development processes...', 'info');

  const patterns = ['next dev', 'tsx watch', 'node dist/', 'analytics-service'];

  for (const pattern of patterns) {
    killProcessesByPattern(pattern);
  }

  // Wait a bit for processes to terminate
  if (isWindows) {
    execSync('ping -n 2 127.0.0.1 >nul', { stdio: 'pipe' });
  } else {
    execSync('sleep 1', { stdio: 'pipe' });
  }

  // Free critical ports
  log('Freeing development ports...', 'info');

  let allCriticalFree = true;
  const results = [];

  for (const port of CRITICAL_PORTS) {
    const freed = freePort(port);
    results.push({ port, freed, critical: true });
    if (!freed) allCriticalFree = false;
  }

  // Try to free optional ports (don't fail if they're in use)
  for (const port of OPTIONAL_PORTS) {
    const freed = freePort(port, 1);
    results.push({ port, freed, critical: false });
  }

  // Report results
  log('Port status:', 'info');
  for (const { port, freed, critical } of results) {
    if (freed) {
      log(`  Port ${port} is free`, 'success');
    } else if (critical) {
      log(`  Port ${port} is still in use`, 'error');
    } else {
      log(`  Port ${port} is in use (optional - won't block)`, 'warn');
    }
  }

  if (allCriticalFree) {
    log('Environment cleaned successfully!', 'success');
    process.exit(0);
  } else {
    log('Some critical ports are still in use. Please close them manually.', 'error');
    log(`Critical ports: ${CRITICAL_PORTS.join(', ')}`, 'info');
    process.exit(1);
  }
}

// Run cleanup
cleanEnvironment();
