/**
 * Tests para benchmarks API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiIndex from './benchmarks';

vi.mock('../api-client', () => {
  return {
    apiClient: {
      get: vi.fn(async (_p: string) => ({ success: true })),
      post: vi.fn(async (_p: string, _b?: unknown) => ({ success: true })),
      put: vi.fn(async (_p: string, _b?: unknown) => ({ success: true })),
      delete: vi.fn(async (_p: string) => ({ success: true }))
    }
  };
});

describe('benchmarks api client endpoints', () => {
  const { apiClient } = require('../api-client');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls get benchmarks endpoint', async () => {
    await apiIndex.getBenchmarks();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/benchmarks');
  });

  it('calls get benchmark by id endpoint', async () => {
    await apiIndex.getBenchmarkById('bench-123');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/benchmarks/bench-123');
  });

  it('calls get benchmark components batch endpoint', async () => {
    await apiIndex.getBenchmarkComponentsBatch(['bench-1', 'bench-2']);
    expect(apiClient.get).toHaveBeenCalledWith('/v1/benchmarks/components/batch?ids=bench-1,bench-2');
  });

  it('calls create benchmark endpoint', async () => {
    const data = { name: 'Test Benchmark', type: 'individual' };
    await apiIndex.createBenchmark(data);
    expect(apiClient.post).toHaveBeenCalledWith('/v1/benchmarks', data);
  });

  it('calls update benchmark endpoint', async () => {
    const data = { name: 'Updated Benchmark' };
    await apiIndex.updateBenchmark('bench-123', data);
    expect(apiClient.put).toHaveBeenCalledWith('/v1/benchmarks/bench-123', data);
  });

  it('calls delete benchmark endpoint', async () => {
    await apiIndex.deleteBenchmark('bench-123');
    expect(apiClient.delete).toHaveBeenCalledWith('/v1/benchmarks/bench-123');
  });

  it('calls add benchmark component endpoint', async () => {
    const data = { instrumentId: 'inst-123', weight: 0.5 };
    await apiIndex.addBenchmarkComponent('bench-123', data);
    expect(apiClient.post).toHaveBeenCalledWith('/v1/benchmarks/bench-123/components', data);
  });

  it('calls update benchmark component endpoint', async () => {
    const data = { weight: 0.6 };
    await apiIndex.updateBenchmarkComponent('bench-123', 'comp-456', data);
    expect(apiClient.put).toHaveBeenCalledWith('/v1/benchmarks/bench-123/components/comp-456', data);
  });

  it('calls delete benchmark component endpoint', async () => {
    await apiIndex.deleteBenchmarkComponent('bench-123', 'comp-456');
    expect(apiClient.delete).toHaveBeenCalledWith('/v1/benchmarks/bench-123/components/comp-456');
  });
});

