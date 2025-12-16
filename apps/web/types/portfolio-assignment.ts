/**
 * Tipos relacionados con asignaciones de portfolio a contactos
 */

import type { TimestampedEntity } from './common';

/**
 * Estado de asignación de portfolio
 */
export type PortfolioAssignmentStatus = 'active' | 'paused' | 'ended';

/**
 * Asignación de portfolio a contacto - extiende TimestampedEntity
 */
export interface PortfolioAssignment extends TimestampedEntity {
  id: string; // Explicitly include id from BaseEntity for TypeScript resolution
  contactId: string;
  templateId: string;
  templateName?: string; // Nombre del template (para UI)
  status: PortfolioAssignmentStatus;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
}

/**
 * Request para asignar portfolio a contacto
 */
export interface AssignPortfolioRequest extends Pick<PortfolioAssignment, 'templateId'> {
  status?: PortfolioAssignmentStatus;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

/**
 * Response de asignación de portfolio
 */
export interface AssignPortfolioResponse {
  assignment: PortfolioAssignment;
  message?: string;
}
