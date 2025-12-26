import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as apiModule from './client';
import { getAumRows } from './aum';

describe('getAumRows', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockRowsResponse = {
    data: {
      ok: true,
      rows: [],
      pagination: {
        total: 0,
        limit: 100,
        offset: 0,
        hasMore: false,
      },
    },
  };

  it('adds preferredOnly=false by default', async () => {
    const spy = vi.spyOn(apiModule.apiClient, 'get').mockResolvedValue(mockRowsResponse as any);
    await getAumRows();
    // The apiClient.get call receives the endpoint as first arg
    // We assert it contains preferredOnly=false
    const calledWith = (spy as any).mock.calls[0][0] as string;
    expect(calledWith).toContain('preferredOnly=false');
  });

  it('respects preferredOnly=false when passed', async () => {
    const spy = vi.spyOn(apiModule.apiClient, 'get').mockResolvedValue(mockRowsResponse as any);
    await getAumRows({ preferredOnly: false });
    const calledWith = (spy as any).mock.calls[0][0] as string;
    expect(calledWith).toContain('preferredOnly=false');
  });
});
