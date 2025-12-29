import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { db } from '@maatwork/db';
import { users } from '@maatwork/db/schema';
import { eq, sql } from 'drizzle-orm';
import { handleGoogleAuthCallback } from '../../routes/auth/google/handlers';
// import { deleteTestUser } from '../helpers/test-auth'; // File seems missing in repo
import type { Request, Response } from 'express';

async function deleteTestUser(userId: string) {
  await db().delete(users).where(eq(users.id, userId));
}

// Mock dependencies
vi.mock('../../auth/google-oauth', () => ({
  getGoogleAuthUrl: vi.fn(),
  exchangeCodeForTokens: vi.fn().mockResolvedValue({
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expiry_date: Date.now() + 3600000,
    scope: 'email profile calendar',
  }),
}));

vi.mock('googleapis', () => {
  return {
    google: {
      auth: {
        OAuth2: vi.fn(function () {
          return {
            setCredentials: vi.fn(),
          };
        }),
      },
      oauth2: vi.fn().mockReturnValue({
        userinfo: {
          get: vi.fn().mockResolvedValue({
            data: {
              id: 'mock-google-id',
              email: 'new-google-user@example.com',
              name: 'New Google User',
            },
          }),
        },
      }),
    },
  };
});

// Mock environment variables if needed, but handled by integration setup usually

describe('Google Auth Integration', () => {
  const testEmail = 'new-google-user@example.com';
  let testUserId: string | null = null;

  beforeAll(async () => {
    // Ensure DB connection
    await db().execute(sql`SELECT 1`);
  });

  afterAll(async () => {
    if (testUserId) {
      await deleteTestUser(testUserId);
    }
    // Also clean up by email just in case
    await db().delete(users).where(eq(users.email, testEmail));
  });

  beforeEach(async () => {
    // Clean up before each test
    await db().delete(users).where(eq(users.email, testEmail));
  });

  it('should create a new user with isActive=false and redirect to login with pending_approval error', async () => {
    const req = {
      query: {
        code: 'mock-auth-code',
        state: JSON.stringify({ context: 'register', redirect: '/dashboard' }),
      },
      log: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      },
    } as unknown as Request;

    const res = {
      redirect: vi.fn(),
      cookie: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    // Call the handler
    await handleGoogleAuthCallback(req, res, vi.fn());

    // Verify user creation
    const [user] = await db().select().from(users).where(eq(users.email, testEmail));
    expect(user).toBeDefined();
    testUserId = user.id;

    // CRITICAL ASSERTION: User must be inactive
    expect(user.isActive).toBe(false);

    // Verify redirect
    // We expect it to redirect to login with error=pending_approval because the user is inactive
    // Note: The current implementation might set cookie and redirect to dashboard.
    // This test asserts the DESIRED behavior.
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error=pending_approval'));

    // Should NOT set session cookie for inactive user
    expect(res.cookie).not.toHaveBeenCalled();
  });
});
