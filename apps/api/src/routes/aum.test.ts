import { describe, expect, it } from 'vitest';
import aumRouter from './aum';
import uploadRouter from './aum/upload';
import rowsRouter from './aum/rows';
import commitRouter from './aum/commit';
import adminRouter from './aum/admin';

describe('AUM modular router', () => {
  it('mounts upload, rows, commit and admin sub-routers', () => {
    const mountedLayers = (aumRouter as any).stack.filter((layer: any) => layer.name === 'router');
    expect(mountedLayers).toHaveLength(4);
    const handles = mountedLayers.map((layer: any) => layer.handle);
    expect(handles).toContain(uploadRouter);
    expect(handles).toContain(rowsRouter);
    expect(handles).toContain(commitRouter);
    expect(handles).toContain(adminRouter);
  });
});