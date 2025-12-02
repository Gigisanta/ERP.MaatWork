/**
 * Authentication helpers for tests
 *
 * Provides utilities to create test users, tokens, and mock authentication
 */

import { signUserToken } from '../../auth/jwt';
import type { AuthUser } from '../../auth/types';
import { db } from '@cactus/db';
import { users } from '@cactus/db/schema';
import { eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';

/**
 * Create a test user in the database
 */
export async function createTestUser(
  overrides?: Partial<{
    id: string;
    email: string;
    password: string;
    role: 'admin' | 'manager' | 'advisor';
    fullName: string;
    active: boolean;
  }>
): Promise<AuthUser & { password: string }> {
  const testUser = {
    id: overrides?.id || `test-user-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    email: overrides?.email || `test-${Date.now()}@example.com`,
    password: overrides?.password || 'test-password-123',
    role: overrides?.role || ('advisor' as const),
    fullName: overrides?.fullName || 'Test User',
    active: overrides?.active !== undefined ? overrides.active : true,
  };

  const hashedPassword = await hash(testUser.password, 10);

  await db()
    .insert(users)
    .values({
      id: testUser.id,
      email: testUser.email,
      passwordHash: hashedPassword,
      role: testUser.role,
      fullName: testUser.fullName,
      isActive: testUser.active,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  return {
    id: testUser.id,
    email: testUser.email,
    role: testUser.role,
    fullName: testUser.fullName,
    password: testUser.password,
  };
}

/**
 * Create a test admin user
 */
export async function createTestAdmin(
  overrides?: Partial<{
    id: string;
    email: string;
    password: string;
    fullName: string;
  }>
): Promise<AuthUser & { password: string }> {
  return createTestUser({
    ...overrides,
    role: 'admin',
  });
}

/**
 * Create a test manager user
 */
export async function createTestManager(
  overrides?: Partial<{
    id: string;
    email: string;
    password: string;
    fullName: string;
  }>
): Promise<AuthUser & { password: string }> {
  return createTestUser({
    ...overrides,
    role: 'manager',
  });
}

/**
 * Create a test advisor user
 */
export async function createTestAdvisor(
  overrides?: Partial<{
    id: string;
    email: string;
    password: string;
    fullName: string;
  }>
): Promise<AuthUser & { password: string }> {
  return createTestUser({
    ...overrides,
    role: 'advisor',
  });
}

/**
 * Generate a JWT token for a test user
 */
export async function createTestToken(user: AuthUser, expiresIn?: string): Promise<string> {
  return signUserToken(user, expiresIn);
}

/**
 * Create a test user and return both user and token
 */
export async function createTestUserWithToken(
  overrides?: Partial<{
    id: string;
    email: string;
    password: string;
    role: 'admin' | 'manager' | 'advisor';
    fullName: string;
  }>
): Promise<{
  user: AuthUser & { password: string };
  token: string;
}> {
  const user = await createTestUser(overrides);
  const token = await createTestToken(user);

  return { user, token };
}

/**
 * Delete a test user from the database
 */
export async function deleteTestUser(userId: string): Promise<void> {
  await db().delete(users).where(eq(users.id, userId));
}

/**
 * Get a user by email (for verification in tests)
 */
export async function getTestUserByEmail(email: string): Promise<typeof users.$inferSelect | null> {
  const [user] = await db().select().from(users).where(eq(users.email, email)).limit(1);
  return user || null;
}

/**
 * Mock request with authenticated user
 */
export function createMockAuthRequest(user: AuthUser): Partial<{
  user: AuthUser;
  headers: Record<string, string>;
  cookies: Record<string, string>;
}> {
  return {
    user,
    headers: {
      authorization: `Bearer mock-token`,
    },
    cookies: {
      token: 'mock-token',
    },
  };
}
