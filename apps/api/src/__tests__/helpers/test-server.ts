/**
 * Test server setup utilities
 *
 * Provides utilities to create and manage Express server instances for testing
 */

import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import type { Server } from 'http';
import { vi } from 'vitest';
import { db } from '@cactus/db';
import { initializeDatabase } from '../../db-init';

// Re-export common test utilities
export * from './test-mocks';
export * from './test-setup';

let testServer: Server | null = null;
let testApp: Express | null = null;

/**
 * Create a test Express app
 * Minimal setup without all production middleware
 */
export function createTestApp(): Express;

/**
 * Create a test Express app with custom routes
 * @param routes Array of route configurations to add to the app
 */
export function createTestApp(routes: Array<{ path: string; router: any }>): Express;

/**
 * Create a test Express app with optional custom routes
 */
export function createTestApp(routes?: Array<{ path: string; router: any }>): Express {
  const app = express();

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // Add custom routes if provided
  if (routes && routes.length > 0) {
    routes.forEach(({ path, router }) => {
      app.use(path, router);
    });
  }

  return app;
}

/**
 * Initialize test database before tests
 */
export async function setupTestDatabase(): Promise<void> {
  // Set test environment
  process.env.NODE_ENV = 'test';

  // Initialize database (run migrations, etc.)
  try {
    await initializeDatabase();
  } catch (error) {
    console.warn('Database initialization warning:', error);
    // Continue even if initialization fails (might already be initialized)
  }
}

/**
 * Cleanup test server after tests
 * Note: Database cleanup is handled by test-db.ts cleanupTestDatabase
 */
export async function cleanupTestServer(): Promise<void> {
  // Close server connections if needed
  // Database cleanup is handled separately
}

/**
 * Start test server on a random port
 */
export async function startTestServer(app: Express, port?: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const serverPort = port || 0; // 0 = random available port

    const server = app.listen(serverPort, () => {
      testServer = server;
      testApp = app;
      resolve(server);
    });

    server.on('error', reject);
  });
}

/**
 * Stop test server
 */
export async function stopTestServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!testServer) {
      resolve();
      return;
    }

    testServer.close((err) => {
      if (err) {
        reject(err);
      } else {
        testServer = null;
        testApp = null;
        resolve();
      }
    });
  });
}

/**
 * Get test server port
 */
export function getTestServerPort(): number | null {
  if (!testServer) {
    return null;
  }

  const address = testServer.address();
  if (address && typeof address === 'object') {
    return address.port;
  }

  return null;
}

/**
 * Get test server URL
 */
export function getTestServerUrl(): string | null {
  const port = getTestServerPort();
  if (port === null) {
    return null;
  }

  return `http://localhost:${port}`;
}

/**
 * Create authenticated request helper
 */
export function createAuthenticatedRequest(user: {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'advisor';
  fullName?: string;
}): Partial<Request> {
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    },
    headers: {},
    cookies: {},
  } as Partial<Request>;
}

/**
 * Mock Express request for testing
 */
export function createMockRequest(overrides?: Partial<Request>): Partial<Request> {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
    cookies: {},
    user: undefined,
    log: {
      info: () => {},
      error: () => {},
      warn: () => {},
      debug: () => {},
    },
    ...overrides,
  } as Partial<Request>;
}

/**
 * Mock Express response for testing
 */
export function createMockResponse(): Partial<Response> {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    getHeader: vi.fn(),
  };

  return res as unknown as Partial<Response>;
}

/**
 * Mock Express next function for testing
 */
export function createMockNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}
