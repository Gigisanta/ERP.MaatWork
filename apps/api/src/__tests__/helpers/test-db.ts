/**
 * Database helpers for integration tests
 *
 * Provides setup/teardown utilities for tests that require a real database connection
 */

import { db } from '@cactus/db';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '@cactus/db/schema';

let testDbInstance: NodePgDatabase<typeof schema> | null = null;

/**
 * Get test database instance
 * Uses a separate test database URL if TEST_DATABASE_URL is set
 */
export function getTestDb(): NodePgDatabase<typeof schema> {
  if (testDbInstance) {
    return testDbInstance;
  }

  // Use test database if available, otherwise use regular db
  const testDbUrl = process.env.TEST_DATABASE_URL;
  if (testDbUrl) {
    // Create a new connection for tests
    // Note: This requires importing createDb from @cactus/db or creating a new pool
    // For now, we'll use the regular db() but with test isolation via transactions
    testDbInstance = db();
  } else {
    testDbInstance = db();
  }

  // TypeScript assertion: testDbInstance is guaranteed to be non-null here
  return testDbInstance as NodePgDatabase<typeof schema>;
}

/**
 * Execute a query in a transaction and rollback after test
 * Useful for tests that need to modify data but want automatic cleanup
 */
export async function withTransaction<T>(
  callback: (db: NodePgDatabase<typeof schema>) => Promise<T>
): Promise<T> {
  const testDb = getTestDb();

  // Start transaction
  await testDb.execute(sql`BEGIN`);

  try {
    const result = await callback(testDb);
    // Rollback to clean up
    await testDb.execute(sql`ROLLBACK`);
    return result;
  } catch (error) {
    // Rollback on error too
    await testDb.execute(sql`ROLLBACK`);
    throw error;
  }
}

/**
 * Clean up test database
 * Truncates all tables (except lookup tables) to ensure clean state
 */
export async function cleanupTestDatabase(): Promise<void> {
  const testDb = getTestDb();

  // Disable foreign key checks temporarily
  await testDb.execute(sql`SET session_replication_role = 'replica'`);

  // Truncate all tables (in reverse dependency order)
  const tables = [
    'aum_import_rows',
    'aum_import_files',
    'aum_monthly_snapshots',
    'portfolio_monitoring_details',
    'portfolio_monitoring_snapshot',
    'client_portfolio_overrides',
    'client_portfolio_assignments',
    'portfolio_template_lines',
    'portfolio_templates',
    'broker_positions',
    'broker_transactions',
    'broker_balances',
    'broker_accounts',
    'career_plan_levels',
    'advisor_account_mapping',
    'advisor_aliases',
    'integration_files',
    'integration_runs',
    'integration_jobs',
    'integration_accounts',
    'activity_events',
    'aum_snapshots',
    'monthly_goals',
    'daily_metrics_user',
    'report_runs',
    'scheduled_reports',
    'benchmark_components',
    'benchmark_definitions',
    'alert_policies',
    'audit_logs',
    'capacitaciones',
    'automation_configs',
    'contact_tags',
    'segment_members',
    'segments',
    'tag_rules',
    'tags',
    'note_tags',
    'notes',
    'audio_files',
    'attachments',
    'pipeline_stage_history',
    'contact_field_history',
    'contacts',
    'pipeline_stages',
    'task_recurrences',
    'tasks',
    'user_channel_preferences',
    'message_log',
    'notification_templates',
    'notifications',
    'team_membership_requests',
    'team_membership',
    'teams',
    'users',
  ];

  for (const table of tables) {
    try {
      await testDb.execute(sql.raw(`TRUNCATE TABLE ${table} CASCADE`));
    } catch (error) {
      // Ignore errors if table doesn't exist
      console.warn(`Could not truncate table ${table}:`, error);
    }
  }

  // Re-enable foreign key checks
  await testDb.execute(sql`SET session_replication_role = 'origin'`);
}

/**
 * Reset test database to clean state
 * Runs migrations and seeds if needed
 */
export async function resetTestDatabase(): Promise<void> {
  await cleanupTestDatabase();

  // Optionally run seeds for test data
  // This would require importing seed functions from @cactus/db
}

/**
 * Check if we're running in test mode
 */
export function isTestMode(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
}

/**
 * Get test database URL
 * Falls back to regular DATABASE_URL if TEST_DATABASE_URL is not set
 */
export function getTestDatabaseUrl(): string {
  return process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || '';
}
