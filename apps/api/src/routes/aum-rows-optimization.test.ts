import { describe, expect, it } from 'vitest';
import rowsRouter from './aum/rows';
import adminRouter from './aum/admin';

type RouteShape = {
  path: string;
  methods: string[];
};

function extractRoutes(router: any): RouteShape[] {
  return (router.stack || [])
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods || {}).filter(Boolean)
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
