'use client';

import {
  getBenchmarks,
  getBenchmarkComponentsBatch,
  createBenchmark as createBenchmarkApi,
  updateBenchmark as updateBenchmarkApi,
  deleteBenchmark as deleteBenchmarkApi,
} from '@/lib/api';
import type {
  Benchmark,
  BenchmarkComponent,
  CreateBenchmarkRequest,
  UpdateBenchmarkRequest,
} from '@/types';
import { useEntityWithComponents } from './useEntityWithComponents';
import { useRequireAuth } from '@/auth/useRequireAuth';

export function useBenchmarks() {
  const { user } = useRequireAuth();
  const canManageBenchmarks = user?.role === 'admin' || user?.role === 'manager';

  const {
    entities: benchmarks,
    isLoading,
    error,
    refetch,
    createEntity: createBenchmark,
    updateEntity: updateBenchmark,
    deleteEntity: deleteBenchmark,
  } = useEntityWithComponents<
    Benchmark & { components?: BenchmarkComponent[] },
    BenchmarkComponent,
    CreateBenchmarkRequest,
    UpdateBenchmarkRequest
  >({
    fetchEntities: getBenchmarks,
    fetchComponentsBatch: getBenchmarkComponentsBatch,
    createEntity: createBenchmarkApi,
    updateEntity: updateBenchmarkApi,
    deleteEntity: deleteBenchmarkApi,
    getEntityId: (benchmark) => benchmark.id,
    canManage: () => canManageBenchmarks,
    entityName: 'benchmarks',
  });

  return {
    benchmarks: benchmarks as Benchmark[],
    isLoading,
    error,
    canManageBenchmarks,
    refetch,
    createBenchmark,
    updateBenchmark,
    deleteBenchmark,
  };
}
