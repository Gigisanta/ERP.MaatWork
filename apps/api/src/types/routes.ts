/**
 * Tipos generales para routes
 * Centralizados para evitar duplicidad según patrones de arquitectura
 */

/**
 * Datos de attachment para inserción
 */
export type AttachmentInsert = {
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  uploadedByUserId: string;
  description: string | null;
  contactId?: string;
  noteId?: string;
  meetingId?: string;
};

