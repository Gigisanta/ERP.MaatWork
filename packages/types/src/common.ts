/**
 * Common Types - Shared across all domains
 *
 * AI_DECISION: Consolidar tipos base en @cactus/types para eliminar duplicación
 * Justificación: Evita divergencia de tipos entre frontend y backend, facilita mantenimiento
 * Impacto: Un solo lugar para tipos base, cambios se propagan automáticamente
 *
 * These are foundational types used throughout the application.
 */

/**
 * Base entity with id
 */
export interface BaseEntity {
  id: string;
}

/**
 * Timestamped entity - common pattern for all database entities
 *
 * Uses Date | string to support both:
 * - Backend: Drizzle can return Date objects
 * - Frontend: JSON APIs always return strings
 */
export interface TimestampedEntity extends BaseEntity {
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Entity with optional timestamps (for creation cases)
 */
export interface TimestampedEntityOptional extends BaseEntity {
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/**
 * Soft-deletable entity
 */
export interface SoftDeletableEntity extends TimestampedEntity {
  deletedAt?: string | Date | null;
}

/**
 * Versioned entity - for optimistic locking
 */
export interface VersionedEntity extends SoftDeletableEntity {
  version: number;
}

/**
 * Utility type para crear tipos de Request a partir de entidades
 * Omite campos automáticos (id, createdAt, updatedAt, version) y hace opcionales los campos opcionales
 */
export type CreateRequest<T extends BaseEntity> = Omit<
  T,
  'id' | 'createdAt' | 'updatedAt' | 'version'
> & {
  [K in keyof T]?: T[K] extends string | number | boolean | null | undefined
    ? T[K]
    : T[K] extends Date
      ? string | Date
      : T[K];
};

/**
 * Utility type para actualizar entidades
 * Hace todos los campos opcionales excepto los que se deben mantener requeridos
 */
export type UpdateRequest<T extends BaseEntity> = Partial<
  Omit<T, 'id' | 'createdAt' | 'updatedAt'>
>;

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success?: boolean;
  data: T;
  error?: string;
  message?: string;
  requestId?: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    limit: number;
    offset: number;
    total?: number;
  };
}

/**
 * User roles in the system
 */
export type UserRole = 'admin' | 'manager' | 'advisor';

/**
 * Risk profile levels
 */
export type RiskProfile = 'low' | 'mid' | 'high';

/**
 * Common status types
 */
export type ActiveStatus = 'active' | 'inactive';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
