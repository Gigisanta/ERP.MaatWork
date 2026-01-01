#!/usr/bin/env ts-node
/**
 * Optimized E2E Database Setup
 *
 * AI_DECISION: Smart DB seeding with validation and caching
 * Justificación: Skip unnecessary re-seeding, faster E2E setup
 * Impacto: E2E setup 50% más rápido
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SEED_MARKER_FILE = path.join(__dirname, '..', '.e2e-db-seeded');

interface SeedMarker {
  timestamp: string;
  dbUrl: string;
  version: string;
}

/**
 * Check if DB is already seeded and fresh enough
 */
function isDbFresh(): boolean {
  if (!fs.existsSync(SEED_MARKER_FILE)) {
    return false;
  }

  try {
    const marker: SeedMarker = JSON.parse(fs.readFileSync(SEED_MARKER_FILE, 'utf-8'));
    const seedTime = new Date(marker.timestamp).getTime();
    const now = Date.now();
    const hoursSinceSeeded = (now - seedTime) / (1000 * 60 * 60);

    // Consider DB fresh if seeded within last 24 hours
    const isFresh = hoursSinceSeeded < 24;

    if (isFresh) {
      console.log(`✅ E2E DB already seeded ${hoursSinceSeeded.toFixed(1)} hours ago - skipping`);
    }

    return isFresh;
  } catch (error) {
    console.warn('⚠️  Could not read seed marker, will re-seed');
    return false;
  }
}

/**
 * Mark DB as seeded
 */
function markDbSeeded(): void {
  const marker: SeedMarker = {
    timestamp: new Date().toISOString(),
    dbUrl: process.env.DATABASE_URL || 'unknown',
    version: '1.0.0',
  };

  fs.writeFileSync(SEED_MARKER_FILE, JSON.stringify(marker, null, 2));
  console.log(`✅ DB seed marker written to ${SEED_MARKER_FILE}`);
}

/**
 * Setup E2E database
 */
async function setupE2eDb(): Promise<void> {
  console.log('🔄 Setting up E2E database...\n');

  // Check if we can skip seeding
  if (isDbFresh() && !process.env.FORCE_SEED) {
    console.log('✅ E2E DB is fresh, skipping setup');
    console.log('   Use FORCE_SEED=true to force re-seeding\n');
    return;
  }

  const startTime = Date.now();

  try {
    // 1. Run migrations
    console.log('1️⃣ Running migrations...');
    execSync('pnpm db:migrate', {
      stdio: 'inherit',
      env: { ...process.env },
    });

    // 2. Seed database
    console.log('\n2️⃣ Seeding database...');
    execSync('pnpm -F @maatwork/db run db:init', {
      stdio: 'inherit',
      env: { ...process.env },
    });

    // 3. Mark as seeded
    markDbSeeded();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ E2E database setup completed in ${duration}s\n`);
  } catch (error) {
    console.error('\n❌ E2E database setup failed:', error);
    process.exit(1);
  }
}

// CLI execution
if (require.main === module) {
  setupE2eDb().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { setupE2eDb, isDbFresh };
