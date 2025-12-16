/**
 * Tipos relacionados con contactos
 */

import type { TimestampedEntity } from '@cactus/types/common';

/**
 * Tag simplificado para contacto
 *
 * AI_DECISION: Incluir businessLine para compatibilidad con backend
 * Justificación: El backend devuelve businessLine en las respuestas de tags
 * Impacto: Permite que las etiquetas Zurich sean clickeables
 */
export interface ContactTag {
  id: string;
  name: string;
  color: string | null;
  icon?: string | null;
  businessLine?: string | null;
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
 * Tipos de valores permitidos para actualizar campos de contacto
 */
export type ContactFieldValue = string | number | boolean | null | Date;

/**
 * Contacto base - extiende TimestampedEntity
 */
export interface Contact extends TimestampedEntity {
  id: string; // Explicitly include id from BaseEntity for TypeScript resolution
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  dni?: string | null;
  country?: string | null;
  pipelineStageId?: string | null;
  assignedAdvisorId?: string | null;
  assignedTeamId?: string | null;
  source?: string | null;
  riskProfile?: string | null;
  nextStep?: string | null;
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
  customFields?: Record<string, ContactFieldValue>;
  contactLastTouchAt?: string | null;
  pipelineStageUpdatedAt?: string | null;
  deletedAt?: string | null;
  version?: number;
  tags?: ContactTag[];
  interactionCount?: number | null;
  meetingStatus?: ContactMeetingStatus;
}

/**
 * Nombres de campos válidos para actualizar contacto
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
 * Objeto para actualizar un campo específico
 */
export interface ContactFieldUpdate {
  field: ContactFieldName | string; // string para flexibilidad con customFields
  value: ContactFieldValue;
}

/**
 * Request para crear contacto - usando Pick para campos requeridos
 */
export interface CreateContactRequest extends Pick<Contact, 'firstName' | 'lastName'> {
  email?: string | null;
  phone?: string | null;
  dni?: string | null;
  pipelineStageId?: string | null;
  source?: string | null;
  riskProfile?: string | null;
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
 * Request para actualizar contacto (partial)
 */
export interface UpdateContactRequest extends Partial<
  Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>
> {}
