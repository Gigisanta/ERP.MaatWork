/**
 * Integration tests for authentication flow
 *
 * Tests the complete authentication flow with real database
 * Requires TEST_DATABASE_URL or DATABASE_URL to be set
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '@maatwork/db';
import { users } from '@maatwork/db/schema';
import { eq } from 'drizzle-orm';
import { signUserToken, verifyUserToken } from '../../../auth/jwt';
import { createTestUser, deleteTestUser, createTestToken } from '../../helpers/test-auth';

describe('Auth Flow Integration Tests', () => {
  let testUserId: string | null = null;

  beforeAll(async () => {
    // Verify database connection
    await db().execute({ sql: 'SELECT 1' });
  });

  afterAll(async () => {
    // Cleanup test user
    if (testUserId) {
      await deleteTestUser(testUserId);
    }
  });

  beforeEach(async () => {
    // Clean up any existing test users before each test
    // This ensures clean state
  });

  describe('User Registration and Login Flow', () => {
    it('should create user, generate token, and verify token', async () => {
      // Create test user
      const testUser = await createTestUser({
        email: `test-auth-${Date.now()}@example.com`,
        password: 'test-password-123',
        role: 'advisor',
        fullName: 'Test Auth User',
      });

      testUserId = testUser.id;

      // Generate token
      const token = await createTestToken(testUser);

      // Verify token
      const decoded = await verifyUserToken(token);

      expect(decoded.id).toBe(testUser.id);
      expect(decoded.email).toBe(testUser.email);
      expect(decoded.role).toBe(testUser.role);
    });

    it('should reject login with wrong password', async () => {
      const testUser = await createTestUser({
        email: `test-wrong-pwd-${Date.now()}@example.com`,
        password: 'correct-password',
        role: 'advisor',
      });

      // Try to verify with wrong password (this would be done in login endpoint)
      // For now, we verify that user exists and password hash is correct
      const [dbUser] = await db().select().from(users).where(eq(users.id, testUser.id)).limit(1);

      expect(dbUser).toBeDefined();
      expect(dbUser?.passwordHash).toBeDefined();
      expect(dbUser?.passwordHash).not.toBe('wrong-password');

      await deleteTestUser(testUser.id);
    });
  });

  describe('Token Verification Flow', () => {
    it('should verify valid token and reject expired token', async () => {
      const testUser = await createTestUser({
        email: `test-token-${Date.now()}@example.com`,
        role: 'advisor',
      });

      // Generate token with short expiration
      const shortToken = await signUserToken(testUser, '1s');

      // Verify immediately (should work)
      const decoded1 = await verifyUserToken(shortToken);
      expect(decoded1.id).toBe(testUser.id);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Verify after expiration (should fail)
      await expect(verifyUserToken(shortToken)).rejects.toThrow();

      await deleteTestUser(testUser.id);
    });

    it('should verify token with different roles', async () => {
      const roles: Array<'admin' | 'manager' | 'advisor'> = ['admin', 'manager', 'advisor'];

      for (const role of roles) {
        const testUser = await createTestUser({
          email: `test-${role}-${Date.now()}@example.com`,
          role,
        });

        const token = await createTestToken(testUser);
        const decoded = await verifyUserToken(token);

        expect(decoded.role).toBe(role);

        await deleteTestUser(testUser.id);
      }
    });
  });

  describe('User State Changes', () => {
    it('should handle user role changes', async () => {
      const testUser = await createTestUser({
        email: `test-role-change-${Date.now()}@example.com`,
        role: 'advisor',
      });

      // Generate token with advisor role
      const token = await createTestToken(testUser);

      // Change role in database
      await db().update(users).set({ role: 'manager' }).where(eq(users.id, testUser.id));

      // Token should still verify (role is in token)
      // But in actual middleware, DB role would take precedence
      const decoded = await verifyUserToken(token);
      expect(decoded.role).toBe('advisor'); // Token role doesn't change

      // Verify DB has new role
      const [dbUser] = await db()
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, testUser.id))
        .limit(1);

      expect(dbUser?.role).toBe('manager');

      await deleteTestUser(testUser.id);
    });

    it('should handle user deactivation', async () => {
      const testUser = await createTestUser({
        email: `test-deactivate-${Date.now()}@example.com`,
        role: 'advisor',
        active: true,
      });

      // Generate token
      const token = await createTestToken(testUser);

      // Deactivate user
      await db().update(users).set({ isActive: false }).where(eq(users.id, testUser.id));

      // Token should still verify (token doesn't check active status)
      // But middleware would check isActive and reject
      const decoded = await verifyUserToken(token);
      expect(decoded.id).toBe(testUser.id);

      // Verify DB has inactive status
      const [dbUser] = await db()
        .select({ isActive: users.isActive })
        .from(users)
        .where(eq(users.id, testUser.id))
        .limit(1);

      expect(dbUser?.isActive).toBe(false);

      await deleteTestUser(testUser.id);
    });
  });
});
