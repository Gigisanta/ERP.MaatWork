import { Pool } from 'pg';
import { execSync } from 'node:child_process';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

// Load .env from root or apps/api
const rootDir = resolve(process.cwd());
const envPath = resolve(rootDir, '.env');
const apiEnvPath = resolve(rootDir, 'apps/api/.env');

if (existsSync(apiEnvPath)) {
  config({ path: apiEnvPath });
} else if (existsSync(envPath)) {
  config({ path: envPath });
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

// Extract base connection string (to postgres database) to create/drop others
// Example: postgresql://postgres:postgres@localhost:5433/CRM
const url = new URL(DATABASE_URL);
const originalDbName = url.pathname.slice(1);
const testDbName = 'CRM_TEST';

// Create a connection to the 'postgres' database to perform administrative tasks
url.pathname = '/postgres';
const adminUrl = url.toString();

async function setupE2EDatabase() {
  // Check if Docker is running first
  try {
    execSync('docker info', { stdio: 'ignore' });
  } catch (e) {
    console.error('\n❌ ERROR: Docker Desktop is not running.');
    console.error('Please start Docker Desktop and try again. The E2E tests require a Postgres container.\n');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: adminUrl });
  
  try {
    console.log(`\n🔄 Setting up E2E database: ${testDbName}`);

    // 1. Terminate existing connections to the test database
    await pool.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${testDbName}'
      AND pid <> pg_backend_pid();
    `);

    // 2. Drop and Recreate
    await pool.query(`DROP DATABASE IF EXISTS "${testDbName}"`);
    await pool.query(`CREATE DATABASE "${testDbName}"`);
    console.log(`✅ Database "${testDbName}" created.`);

    // 3. Run migrations and seeds on the new database
    const testDatabaseUrl = DATABASE_URL.replace(`/${originalDbName}`, `/${testDbName}`);
    process.env.DATABASE_URL = testDatabaseUrl;
    
    console.log('🏗️  Running migrations...');
    execSync('pnpm -F @maatwork/db migrate', { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: testDatabaseUrl }
    });

    console.log('🌱 Seeding test data...');
    execSync('pnpm -F @maatwork/db seed:full', { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: testDatabaseUrl }
    });

    console.log('✨ E2E Database setup complete!\n');
  } catch (error) {
    console.error('❌ Error setting up E2E database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupE2EDatabase();

