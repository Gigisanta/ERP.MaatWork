/**
 * Common Types - Shared across all domains
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
 */
export interface TimestampedEntity extends BaseEntity {
  createdAt: string | Date;
  updatedAt: string | Date;
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




