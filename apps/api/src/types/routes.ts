/**
 * Tipos generales para routes
 * Centralizados para evitar duplicidad según patrones de arquitectura
 */

import type { BaseEntity } from '@cactus/types/common';

/**
 * Base para attachment - extiende BaseEntity
 */
export interface AttachmentBase extends BaseEntity {
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  uploadedByUserId: string;
  description: string | null;
}

/**
 * Datos de attachment para inserción
 * Usa Partial para hacer opcionales las relaciones
 */
export type AttachmentInsert = AttachmentBase & {
  contactId?: string;
  noteId?: string;
  meetingId?: string;
};
