/**
 * Tipos relacionados con benchmarks
 */

export type BenchmarkType = 'individual' | 'composite';

/**
 * Benchmark base
 */
export interface Benchmark {
  id: string;
  name: string;
  type: BenchmarkType;
  description?: string | null;
  code?: string; // Código del benchmark (para benchmarks del sistema)
  isSystem?: boolean; // Si es un benchmark del sistema
  createdAt: string;
  updatedAt: string;
  components?: BenchmarkComponent[];
}

/**
 * Componente de benchmark
 */
export interface BenchmarkComponent {
  id: string;
  benchmarkId: string;
  instrumentId: string;
  weight: number; // Decimal (0.25 = 25%)
  instrumentSymbol: string; // Required para UI
  instrumentName?: string; // Opcional pero comúnmente usado
  active?: boolean;
  createdAt?: string;
}

// Tipo para componentes temporales durante la creación
export interface BenchmarkComponentForm {
  id: string;
  instrumentId?: string | null; // Puede ser null si aún no está resuelto
  instrumentSymbol: string;
  instrumentName?: string;
  weight: number; // Percentage (25 = 25%)
}

export interface CreateBenchmarkRequest {
  name: string;
  type: BenchmarkType;
  description?: string;
  code?: string;
}

export interface UpdateBenchmarkRequest {
  name?: string;
  description?: string;
  code?: string;
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

export interface BenchmarkFormData {
  name: string;
  type: BenchmarkType;
  description: string;
  components: BenchmarkComponentForm[];
}

