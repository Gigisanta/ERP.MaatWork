/**
 * Tag Types - Shared tag-related types
 *
 * These types are used by both API and Web applications.
 */

import type {
  TimestampedEntityOptional,
  CreateRequest,
  UpdateRequest,
  BusinessLine,
} from './common';

/**
 * Tag base - extends TimestampedEntityOptional
 *
 * NOTE: The backend uses 'scope' (contact, meeting, note) while the frontend
 * uses 'entityType' (contact, task, note). The API client transforms automatically.
 */
export interface Tag extends TimestampedEntityOptional {
  name: string;
  color: string;
  icon?: string | null;
  entityType?: 'contact' | 'task' | 'note'; // Frontend: entity type
  scope?: string; // Backend: scope (contact, meeting, note)
  businessLine?: BusinessLine | null; // Business line: inversiones, zurich, patrimonial
}

/**
 * Request to create a tag
 */
export interface CreateTagRequest extends Omit<CreateRequest<Tag>, 'entityType' | 'scope'> {
  name: string;
  color: string;
  entityType: 'contact' | 'task' | 'note';
  scope?: string;
  businessLine?: BusinessLine | null;
}

/**
 * Request to update a tag
 */
export type UpdateTagRequest = UpdateRequest<Tag>;

/**
 * Contact-Tag relation with additional data for business lines
 */
export interface ContactTagRelation {
  id: string;
  contactId: string;
  tagId: string;
  monthlyPremium?: number | null;
  policyNumber?: string | null;
  createdAt: string | Date;
}

/**
 * Contact-Tag relation with full tag information
 */
export interface ContactTagWithDetails extends ContactTagRelation {
  tag: Tag;
}

/**
 * Request to update contact-tag relation data
 */
export interface UpdateContactTagRequest {
  monthlyPremium?: number | null;
  policyNumber?: string | null;
}
