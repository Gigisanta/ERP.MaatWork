/**
 * API methods para benchmarks
 */

import { apiClient } from '../api-client';
import type {
  ApiResponse,
  Benchmark,
  BenchmarkComponent,
  BenchmarkWithComponents,
  CreateBenchmarkRequest,
  UpdateBenchmarkRequest,
  AddBenchmarkComponentRequest,
} from '@/types';

/**
 * Obtener todos los benchmarks
 */
export async function getBenchmarks(): Promise<ApiResponse<Benchmark[]>> {
  return apiClient.get<Benchmark[]>('/v1/benchmarks');
}

/**
 * Obtener benchmark por ID
 */
export async function getBenchmarkById(id: string): Promise<ApiResponse<BenchmarkWithComponents>> {
  return apiClient.get<BenchmarkWithComponents>(`/v1/benchmarks/${id}`);
}

/**
 * Obtener componentes de múltiples benchmarks (batch)
 */
export async function getBenchmarkComponentsBatch(
  ids: string[]
): Promise<ApiResponse<Record<string, BenchmarkComponent[]>>> {
  return apiClient.get<Record<string, BenchmarkComponent[]>>(
    `/v1/benchmarks/components/batch?ids=${ids.join(',')}`
  );
}

/**
 * Crear benchmark
 */
export async function createBenchmark(
  data: CreateBenchmarkRequest
): Promise<ApiResponse<Benchmark>> {
  return apiClient.post<Benchmark>('/v1/benchmarks', data);
}

/**
 * Actualizar benchmark
 */
export async function updateBenchmark(
  id: string,
  data: UpdateBenchmarkRequest
): Promise<ApiResponse<Benchmark>> {
  return apiClient.put<Benchmark>(`/v1/benchmarks/${id}`, data);
}

/**
 * Eliminar benchmark
 */
export async function deleteBenchmark(id: string): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/v1/benchmarks/${id}`);
}

/**
 * Agregar componente a benchmark
 */
export async function addBenchmarkComponent(
  benchmarkId: string,
  data: AddBenchmarkComponentRequest
): Promise<ApiResponse<BenchmarkComponent>> {
  return apiClient.post<BenchmarkComponent>(`/v1/benchmarks/${benchmarkId}/components`, data);
}

/**
 * Actualizar componente de benchmark
 */
export async function updateBenchmarkComponent(
  benchmarkId: string,
  componentId: string,
  data: Partial<AddBenchmarkComponentRequest>
): Promise<ApiResponse<BenchmarkComponent>> {
  return apiClient.put<BenchmarkComponent>(
    `/v1/benchmarks/${benchmarkId}/components/${componentId}`,
    data
  );
}

/**
 * Eliminar componente de benchmark
 */
export async function deleteBenchmarkComponent(
  benchmarkId: string,
  componentId: string
): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/v1/benchmarks/${benchmarkId}/components/${componentId}`);
}
