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
  icon?: string | null | undefined;
  businessLine?: string | null | undefined;
}

/**
 * Meeting Status from Google Calendar sync
 */
export interface MeetingStatus {
  scheduled: boolean;
  completed: boolean;
  at: string | null; // ISO string
  eventId: string | null;
}

export interface ContactMeetingStatus {
  firstMeeting: MeetingStatus;
  secondMeeting: MeetingStatus;
  lastCheckedAt: string;
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
  assignedAdvisorName?: string | null;
  assignedTeamId?: string | null;
  assignedTeamName?: string | null;
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
  // Metadata for UI/Analytics
  tags?: ContactTag[];
  interactionCount?: number | null;
  meetingStatus?: ContactMeetingStatus;
}

/**
 * ContactTag with contactId for join results
 */
export interface ContactTagWithInfo extends ContactTag {
  contactId: string | null;
}

/**
 * Contact with tags guaranteed
 */
export interface ContactWithTags extends Contact {
  tags: ContactTag[];
}

/**
 * Import statistics for mass contact import
 */
export interface ImportStats {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  unknownAdvisors: string[];
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
 * Contact update object for backend use
 */
export interface ContactUpdateFields extends Partial<Record<ContactFieldName, ContactFieldValue>> {
  version: number;
  updatedAt: Date | string;
  [key: string]: ContactFieldValue | number | Date | string | undefined;
}

/**
 * Timeline item for contact history
 */
export interface TimelineItem {
  id: string;
  type: 'interaction' | 'note' | 'task' | 'attachment' | 'stage_change' | 'field_change';
  title: string;
  description?: string | null;
  timestamp: string | Date;
  userId?: string | null;
  userName?: string | null;
  metadata?: Record<string, unknown>;
}

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
  queSeDedica?: string | null;
  familia?: string | null;
  expectativas?: string | null;
  objetivos?: string | null;
  requisitosPlanificacion?: string | null;
  prioridades?: string[];
  preocupaciones?: string[];
  ingresos?: number | null;
  gastos?: number | null;
  excedente?: number | null;
}

/**
 * Update contact request
 */
export interface UpdateContactRequest extends Partial<
  Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'version'>
> {
  fields?: ContactFieldUpdate[];
}
