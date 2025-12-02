import { describe, expect, it } from 'vitest';
import uploadRouter from './aum/upload';
import commitRouter from './aum/commit';

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

describe('AUM upload router', () => {
  it('exposes POST /uploads for file ingestion', () => {
    const routes = extractRoutes(uploadRouter);
    const uploadsRoute = routes.find((route) => route.path === '/uploads');
    expect(uploadsRoute).toBeDefined();
    expect(uploadsRoute?.methods).toContain('post');
  });

  it('provides preview and history endpoints', () => {
    const routes = extractRoutes(uploadRouter);
    expect(routes.some((route) => route.path === '/uploads/:fileId/preview' && route.methods.includes('get'))).toBe(true);
    expect(routes.some((route) => route.path === '/uploads/history' && route.methods.includes('get'))).toBe(true);
  });
});

describe('AUM commit router', () => {
  it('allows committing and confirming uploaded files', () => {
    const routes = extractRoutes(commitRouter);
    expect(routes.some((route) => route.path === '/uploads/:fileId/commit' && route.methods.includes('post'))).toBe(true);
    expect(routes.some((route) => route.path === '/uploads/:fileId/confirm-changes' && route.methods.includes('post'))).toBe(true);
  });
});
