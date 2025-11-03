import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as apiModule from './api-client';
import { getAumRows } from './aum';

describe('getAumRows', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('adds preferredOnly=true by default', async () => {
    const spy = vi.spyOn(apiModule.apiClient, 'get').mockResolvedValue({} as any);
    await getAumRows();
    // The apiClient.get call receives the endpoint as first arg
    // We assert it contains preferredOnly=true
    const calledWith = (spy as any).mock.calls[0][0] as string;
    expect(calledWith).toContain('preferredOnly=true');
  });

  it('respects preferredOnly=false when passed', async () => {
    const spy = vi.spyOn(apiModule.apiClient, 'get').mockResolvedValue({} as any);
    await getAumRows({ preferredOnly: false });
    const calledWith = (spy as any).mock.calls[0][0] as string;
    expect(calledWith).toContain('preferredOnly=false');
  });
});


