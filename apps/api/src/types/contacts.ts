/**
 * Tipos para el módulo de contactos
 * Centralizados para evitar duplicidad según patrones de arquitectura
 */

import { type InferSelectModel } from 'drizzle-orm';
import { contacts, tags, contactTags, tasks } from '@cactus/db/schema';
import type { BaseEntity } from './common';

/**
 * Contacto base inferido del schema
 */
export type Contact = InferSelectModel<typeof contacts>;

/**
 * Tag inferido del schema
 */
export type Tag = InferSelectModel<typeof tags>;

/**
 * Tag simplificado para contacto (sin contactId) - usando Pick
 */
export type ContactTag = Pick<Tag, 'id' | 'name' | 'color' | 'icon'>;

/**
 * ContactTag con información del tag
 * Resultado de query join entre contactTags y tags
 */
export interface ContactTagWithInfo extends BaseEntity {
  contactId: string | null;
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

/**
 * Contacto con tags agregadas - usando intersection type
 */
export type ContactWithTags = Contact & {
  tags: ContactTag[];
};

/**
 * Task inferido del schema para timeline
 */
export type Task = InferSelectModel<typeof tasks>;

/**
 * Item de timeline unificado - usando intersection type
 */
export type TimelineItem = Task & {
  type: 'task';
  timestamp: Date;
};

/**
 * Objeto de actualización parcial de contacto
 * Usa Partial para hacer campos opcionales
 */
export type ContactUpdateFields = Partial<Pick<Contact, 'version' | 'updatedAt'>> & {
  updatedAt?: Date;
  [key: string]: unknown;
};
