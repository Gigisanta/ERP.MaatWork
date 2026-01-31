
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockCacheInstance } = vi.hoisted(() => ({
  mockCacheInstance: {
    get: vi.fn(),
    set: vi.fn(),
    flushAll: vi.fn(),
  }
}));

// Mock NodeCache before importing middleware
vi.mock('node-cache', () => {
  return {
    default: class MockNodeCache {
      constructor() {
        return mockCacheInstance;
      }
    },
  };
});

// Now import middleware
import { rateLimit } from './rate-limit';

describe('Rate Limit Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow request if under limit', () => {
    const middleware = rateLimit({ windowMs: 1000, max: 10 });
    const req = { ip: '1.2.3.4', path: '/test' } as any;
    const res = { setHeader: vi.fn() } as any;
    const next = vi.fn();

    mockCacheInstance.get.mockReturnValue(undefined); // First request

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 9);
  });

  it('should block request if over limit', () => {
    const middleware = rateLimit({ windowMs: 1000, max: 2 });
    const req = { ip: '1.2.3.4', path: '/test' } as any;
    const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    mockCacheInstance.get.mockReturnValue({ count: 2, resetTime: Date.now() + 1000 });

    middleware(req, res, next);

    // Should call next with error
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 429 }));
  });
});
