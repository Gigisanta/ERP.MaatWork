/**
 * Tipos relacionados con benchmarks
 */

export type BenchmarkType = 'individual' | 'composite';

export interface Benchmark {
  id: string;
  name: string;
  type: BenchmarkType;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  components?: BenchmarkComponent[];
}

export interface BenchmarkComponent {
  id: string;
  benchmarkId: string;
  instrumentId: string;
  weight: number; // Decimal (0.25 = 25%)
  instrumentSymbol?: string;
  instrumentName?: string;
  active?: boolean;
  createdAt?: string;
}

export interface CreateBenchmarkRequest {
  name: string;
  type: BenchmarkType;
  description?: string;
}

export interface UpdateBenchmarkRequest {
  name?: string;
  description?: string;
}

export interface AddBenchmarkComponentRequest {
  instrumentId: string;
  weight: number; // Decimal
}

export interface BenchmarkWithComponents extends Benchmark {
  components: BenchmarkComponent[];
  totalWeight: number;
  isValid: boolean;
}

/**
 * Tipos para composición de benchmark (UI)
 */
export interface BenchmarkComponentForm {
  instrumentId?: string;
  instrumentSymbol: string;
  instrumentName?: string;
  weight: number; // Percentage (25 = 25%)
}

export interface BenchmarkFormData {
  name: string;
  type: BenchmarkType;
  description: string;
  components: BenchmarkComponentForm[];
}

