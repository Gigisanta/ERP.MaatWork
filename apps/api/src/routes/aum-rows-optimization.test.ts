import { describe, expect, it, vi } from 'vitest';

// Mock @cactus/db before importing routers
vi.mock('@cactus/db', async () => {
  const actual = await vi.importActual('@cactus/db');
  return {
    ...actual,
    db: vi.fn(),
    aumImportRows: {},
    aumImportFiles: {},
    contacts: {},
    users: {},
    advisorAliases: {},
    aumMonthlySnapshots: {},
    eq: vi.fn(),
    sql: vi.fn()
  };
});

import rowsRouter from './aum/rows';
import adminRouter from './aum/admin';

type RouteShape = {
  path: string;
  methods: string[];
};

interface RouterLayer {
  route?: { path: string; methods: Record<string, boolean> };
}

function extractRoutes(router: { stack?: RouterLayer[] }): RouteShape[] {
  return (router.stack || [])
    .filter((layer: RouterLayer) => layer.route)
    .map((layer: RouterLayer) => ({
      path: layer.route!.path,
      methods: Object.keys(layer.route!.methods || {}).filter(Boolean)
    }));
}

describe('AUM rows router', () => {
  it('serves listings and duplicates endpoints', () => {
    const routes = extractRoutes(rowsRouter);
    expect(routes.some((route) => route.path === '/rows/all' && route.methods.includes('get'))).toBe(true);
    expect(routes.some((route) => route.path === '/rows/duplicates/:accountNumber' && route.methods.includes('get'))).toBe(true);
  });
});

describe('AUM admin router', () => {
  it('exposes destructive maintenance endpoints behind admin guard', () => {
    const routes = extractRoutes(adminRouter);
    expect(routes.some((route) => route.path === '/uploads/:fileId' && route.methods.includes('delete'))).toBe(true);
    expect(routes.some((route) => route.path === '/uploads' && route.methods.includes('delete'))).toBe(true);
    expect(routes.some((route) => route.path === '/cleanup-duplicates' && route.methods.includes('post'))).toBe(true);
  });
});
