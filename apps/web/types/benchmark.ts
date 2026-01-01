/**
 * Tipos relacionados con benchmarks
 */

import type { TimestampedEntity, UpdateRequest, CreateRequest, ComponentBase } from './common';

/**
 * Tipo de benchmark
 */
export type BenchmarkType = 'individual' | 'composite';

/**
 * Benchmark base - extiende TimestampedEntity
 */
export interface Benchmark extends TimestampedEntity {
  id: string; // Explicitly include id from BaseEntity for TypeScript resolution
  name: string;
  type: BenchmarkType;
  description?: string | null;
  code?: string; // Código del benchmark (para benchmarks del sistema)
  isSystem?: boolean; // Si es un benchmark del sistema
  components?: BenchmarkComponent[];
}

/**
 * Componente de benchmark - extiende ComponentBase
 */
export interface BenchmarkComponent extends ComponentBase {
  id: string;
  benchmarkId: string;
  instrumentId: string; // Required en componente
  weight: number; // Decimal (0.25 = 25%)
  active?: boolean;
  createdAt?: string;
}

/**
 * Tipo para componentes temporales durante la creación
 */
export interface BenchmarkComponentForm extends ComponentBase {
  id: string;
  instrumentId?: string | null; // Puede ser null si aún no está resuelto
  weight: number; // Percentage (25 = 25%)
}

/**
 * Request para crear benchmark - usando utility type CreateRequest
 */
export interface CreateBenchmarkRequest extends CreateRequest<Benchmark> {
  name: string;
  type: BenchmarkType;
  description?: string | null;
  code?: string;
}

/**
 * Request para actualizar benchmark - usando utility type UpdateRequest
 */
export type UpdateBenchmarkRequest = UpdateRequest<Benchmark>;

/**
 * Request para agregar componente de benchmark
 */
export type AddBenchmarkComponentRequest = Pick<BenchmarkComponent, 'instrumentId' | 'weight'>;

/**
 * Benchmark con componentes completos
 */
export interface BenchmarkWithComponents extends Benchmark {
  components: BenchmarkComponent[];
  totalWeight: number;
  isValid: boolean;
}

/**
 * Datos de formulario de benchmark
 */
export interface BenchmarkFormData {
  name: string;
  type: BenchmarkType;
  description: string;
  components: BenchmarkComponentForm[];
}
