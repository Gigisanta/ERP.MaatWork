/**
 * Contact Types - Shared contact-related types
 * 
 * These types are used by both API and Web applications.
 */

import type { VersionedEntity, RiskProfile } from './common';

/**
 * Tag simplified for contact
 */
export interface ContactTag {
  id: string;
  name: string;
  color: string | null;
  icon?: string | null;
}

/**
 * Contact field value types
 */
export type ContactFieldValue = string | number | boolean | null | Date;

/**
 * Contact base interface
 */
export interface Contact extends VersionedEntity {
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  phoneSecondary?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  dateOfBirth?: string | null;
  dni?: string | null;
  pipelineStageId?: string | null;
  assignedAdvisorId?: string | null;
  assignedTeamId?: string | null;
  source?: string | null;
  riskProfile?: RiskProfile | null;
  nextStep?: string | null;
  notes?: string | null;
  // Extended profile fields
  queSeDedica?: string | null;
  familia?: string | null;
  expectativas?: string | null;
  objetivos?: string | null;
  requisitosPlanificacion?: string | null;
  prioridades?: string[];
  preocupaciones?: string[];
  // Financial fields
  ingresos?: number | null;
  gastos?: number | null;
  excedente?: number | null;
  // Custom fields
  customFields?: Record<string, ContactFieldValue>;
  // Timestamps
  contactLastTouchAt?: string | null;
  pipelineStageUpdatedAt?: string | null;
  // Tags (when included)
  tags?: ContactTag[];
}

/**
 * Contact with tags guaranteed
 */
export interface ContactWithTags extends Contact {
  tags: ContactTag[];
}

/**
 * Contact field names for updates
 */
export type ContactFieldName = 
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'phoneSecondary'
  | 'whatsapp'
  | 'address'
  | 'city'
  | 'country'
  | 'dateOfBirth'
  | 'dni'
  | 'pipelineStageId'
  | 'source'
  | 'riskProfile'
  | 'assignedAdvisorId'
  | 'assignedTeamId'
  | 'nextStep'
  | 'notes'
  | 'queSeDedica'
  | 'familia'
  | 'expectativas'
  | 'objetivos'
  | 'requisitosPlanificacion'
  | 'prioridades'
  | 'preocupaciones'
  | 'ingresos'
  | 'gastos'
  | 'excedente';

/**
 * Contact field update
 */
export interface ContactFieldUpdate {
  field: ContactFieldName | string;
  value: ContactFieldValue;
}

/**
 * Create contact request
 */
export interface CreateContactRequest {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  dni?: string | null;
  pipelineStageId?: string | null;
  source?: string | null;
  riskProfile?: RiskProfile | null;
  assignedAdvisorId?: string | null;
  notes?: string | null;
}

/**
 * Update contact request
 */
export interface UpdateContactRequest {
  fields?: ContactFieldUpdate[];
  [key: string]: ContactFieldValue | ContactFieldUpdate[] | undefined;
}





