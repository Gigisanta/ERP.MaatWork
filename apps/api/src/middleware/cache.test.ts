
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cache, invalidateCache } from './cache';
import { getRedisClient } from '../config/redis';

vi.mock('../config/redis', () => ({
  getRedisClient: vi.fn(),
  buildCacheKey: vi.fn((prefix, path, query) => `${prefix}:${path}:${query}`),
  REDIS_TTL: { DEFAULT: 3600 }
}));

describe('Cache Middleware', () => {
  let mockRedis: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = {
      get: vi.fn(),
      setex: vi.fn().mockResolvedValue('OK'),
      keys: vi.fn(),
      del: vi.fn(),
    };
    (getRedisClient as any).mockReturnValue(mockRedis);
  });

  it('should return cached value if present', async () => {
    const middleware = cache({ ttl: 60, keyPrefix: 'test' });
    const req = { path: '/test', query: {} } as any;
    const res = { setHeader: vi.fn(), json: vi.fn() } as any;
    const next = vi.fn();

    mockRedis.get.mockResolvedValue(JSON.stringify({ data: 'cached' }));

    await middleware(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ data: 'cached' });
    expect(res.setHeader).toHaveBeenCalledWith('X-Cache', 'HIT');
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next and capture response on miss', async () => {
    const middleware = cache({ ttl: 60, keyPrefix: 'test' });
    const req = { path: '/test', query: {} } as any;
    const res = { setHeader: vi.fn(), json: vi.fn() } as any;
    const next = vi.fn();

    mockRedis.get.mockResolvedValue(null);

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    
    // Simulate response
    const mockData = { data: 'new' };
    res.json(mockData);
    
    expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.any(String), 
        60, 
        JSON.stringify(mockData)
    );
  });
});

describe('invalidateCache', () => {
  it('should delete keys matching pattern', async () => {
    const mockRedis = {
      keys: vi.fn().mockResolvedValue(['res1', 'res2']),
      del: vi.fn().mockResolvedValue(2),
    };
    (getRedisClient as any).mockReturnValue(mockRedis);

    await invalidateCache('pattern*');

    expect(mockRedis.keys).toHaveBeenCalledWith('pattern*');
    expect(mockRedis.del).toHaveBeenCalledWith(['res1', 'res2']);
  });
});
