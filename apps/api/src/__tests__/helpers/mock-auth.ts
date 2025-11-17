/**
 * Mock helpers for authentication
 * 
 * Provides factory functions to create mocks for auth-related tests
 */

import { vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import type { AuthUser } from '../../auth/types';

/**
 * Creates a mock authenticated request
 */
export function createMockAuthenticatedRequest(
  user: AuthUser,
  overrides?: Partial<Request>
): Partial<Request> {
  return {
    user,
    headers: {},
    cookies: {},
    params: {},
    query: {},
    body: {},
    log: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
    ...overrides,
  } as Partial<Request>;
}

/**
 * Creates a mock Express response
 */
export function createMockResponse(): Partial<Response> {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    getHeader: vi.fn(),
  } as Partial<Response>;
}

/**
 * Creates a mock Express next function
 */
export function createMockNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}

/**
 * Creates a mock user with default values
 */
export function createMockUser(overrides?: Partial<AuthUser>): AuthUser {
  return {
    id: 'user-123',
    email: 'test@example.com',
    role: 'advisor',
    fullName: 'Test User',
    ...overrides,
  };
}

/**
 * Creates a mock admin user
 */
export function createMockAdminUser(overrides?: Partial<AuthUser>): AuthUser {
  return createMockUser({
    id: 'admin-123',
    email: 'admin@example.com',
    role: 'admin',
    fullName: 'Admin User',
    ...overrides,
  });
}

/**
 * Creates a mock manager user
 */
export function createMockManagerUser(overrides?: Partial<AuthUser>): AuthUser {
  return createMockUser({
    id: 'manager-123',
    email: 'manager@example.com',
    role: 'manager',
    fullName: 'Manager User',
    ...overrides,
  });
}

