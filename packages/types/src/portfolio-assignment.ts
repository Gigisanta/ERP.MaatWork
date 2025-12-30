/**
 * Portfolio Assignment Types - Shared portfolio assignment-related types
 */

import type { TimestampedEntity } from './common';

/**
 * Portfolio assignment status
 */
export type PortfolioAssignmentStatus = 'active' | 'paused' | 'ended';

/**
 * Portfolio assignment to a contact
 */
export interface PortfolioAssignment extends TimestampedEntity {
  contactId: string;
  templateId: string;
  templateName?: string;
  status: PortfolioAssignmentStatus;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  notes?: string | null;
}

/**
 * Request to assign a portfolio to a contact
 */
export interface AssignPortfolioRequest extends Pick<PortfolioAssignment, 'templateId'> {
  status?: PortfolioAssignmentStatus;
  startDate?: string | Date;
  endDate?: string | Date;
  notes?: string;
}

/**
 * Response for portfolio assignment
 */
export interface AssignPortfolioResponse {
  assignment: PortfolioAssignment;
  message?: string;
}
