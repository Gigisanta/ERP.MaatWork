/**
 * Centralized file upload utilities for multer
 *
 * Consolidates file upload configuration used across:
 * - AUM uploads (aum/upload.ts, aum/admin/mapping.ts)
 * - Capacitaciones imports (capacitaciones.ts)
 * - Attachments (attachments.ts)
 *
 * AI_DECISION: Centralizar configuración de multer para eliminar duplicación
 * Justificación: Código duplicado en 4+ archivos dificulta mantenimiento y consistencia
 * Impacto: Configuración unificada, mejor mantenibilidad, seguridad consistente
 */

import multer from 'multer';
import { extname, join, basename } from 'node:path';
import { promises as fs } from 'node:fs';
import type { Request, Response, NextFunction } from 'express';

// ==========================================================
// Types
// ==========================================================

interface FileUploadOptions {
  /** Maximum file size in bytes */
  maxFileSize: number;
  /** Custom upload directory (defaults to process.cwd()/uploads) */
  uploadDir?: string | undefined;
  /** File prefix for naming (e.g., 'capacitaciones', 'aum') */
  filePrefix?: string | undefined;
  /** Allowed MIME types (if not provided, all types are allowed) */
  allowedMimeTypes?: readonly string[] | undefined;
  /** Allowed file extensions (e.g., ['.csv', '.xlsx']) */
  allowedExtensions?: readonly string[] | undefined;
  /** Custom destination function for entity-based directories */
  customDestination?: ((req: Request, file: Express.Multer.File) => Promise<string>) | undefined;
}

/** Multer file filter callback type */
type MulterFileFilterFn = (
  req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => void;

interface MulterErrorHandlerOptions {
  maxFileSize: number;
  logger?: {
    error?: (context: Record<string, unknown>, message: string) => void;
  };
}

// ==========================================================
// Constants
// ==========================================================

/** Default upload directory */
export const DEFAULT_UPLOAD_DIR = join(process.cwd(), 'uploads');

/** Common MIME type sets for reuse */
export const MIME_TYPES = {
  /** Spreadsheet formats for AUM/data imports */
  SPREADSHEET: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv',
  ],
  /** CSV only */
  CSV: ['text/csv'],
  /** Images */
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  /** Documents */
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
  /** Audio */
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  /** Video */
  VIDEO: ['video/mp4', 'video/quicktime'],
  /** All common attachment types */
  ATTACHMENTS: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'video/mp4',
    'video/quicktime',
  ],
} as const;

/** Extension to MIME type mapping for validation */
const EXTENSION_TO_MIME: Record<string, string[]> = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp'],
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.txt': ['text/plain'],
  '.csv': ['text/csv'],
  '.mp3': ['audio/mpeg'],
  '.wav': ['audio/wav'],
  '.ogg': ['audio/ogg'],
  '.mp4': ['video/mp4'],
  '.mov': ['video/quicktime'],
};

// ==========================================================
// Utility Functions
// ==========================================================

/**
 * Sanitize filename to prevent path traversal and dangerous characters
 *
 * @param filename - Original filename
 * @returns Sanitized filename safe for filesystem storage
 */
export function sanitizeFilename(filename: string): string {
  // Remove path traversal and normalize
  let sanitized = basename(filename);

  // Remove dangerous or problematic characters
  sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1F]/g, '');

  // Replace multiple spaces with underscore
  sanitized = sanitized.replace(/\s+/g, '_');

  // Limit length (max 200 characters for basename)
  const ext = extname(sanitized);
  const base = basename(sanitized, ext);
  const maxBasenameLength = 200 - ext.length;

  if (base.length > maxBasenameLength) {
    sanitized = base.substring(0, maxBasenameLength) + ext;
  }

  // Use default name if sanitized is empty
  if (!sanitized || sanitized === ext) {
    sanitized = `file${ext || '.bin'}`;
  }

  return sanitized;
}

/**
 * Generate unique filename with timestamp and random suffix
 *
 * @param originalname - Original filename
 * @param prefix - Optional prefix (e.g., 'capacitaciones', 'aum')
 * @returns Unique filename
 */
function generateUniqueFilename(originalname: string, prefix?: string): string {
  const sanitized = sanitizeFilename(originalname);
  const ext = extname(sanitized);
  const base = basename(sanitized, ext);
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  if (prefix) {
    return `${prefix}-${uniqueSuffix}${ext}`;
  }
  return `${base}-${uniqueSuffix}${ext}`;
}

/**
 * Validate that file extension matches MIME type
 *
 * @param filename - Filename with extension
 * @param mimeType - MIME type to validate against
 * @returns true if extension matches MIME type
 */
export function validateExtensionVsMimeType(filename: string, mimeType: string): boolean {
  const ext = extname(filename).toLowerCase();
  const expectedMimes = EXTENSION_TO_MIME[ext];

  if (!expectedMimes) {
    return false;
  }

  return expectedMimes.includes(mimeType);
}

/**
 * Ensure upload directory exists
 *
 * @param dir - Directory path to ensure
 */
export async function ensureUploadDir(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // Directory may already exist
  }
}

// ==========================================================
// Storage Factories
// ==========================================================

/**
 * Create standard multer disk storage
 *
 * @param options - Storage configuration options
 * @returns Configured multer.diskStorage instance
 */
function createMulterStorage(options: FileUploadOptions): multer.StorageEngine {
  const uploadDir = options.uploadDir || DEFAULT_UPLOAD_DIR;

  return multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        let destDir = uploadDir;

        if (options.customDestination) {
          destDir = await options.customDestination(req, file);
        }

        await ensureUploadDir(destDir);
        cb(null, destDir);
      } catch (err) {
        cb(err instanceof Error ? err : new Error(String(err)), uploadDir);
      }
    },
    filename: (_req, file, cb) => {
      cb(null, generateUniqueFilename(file.originalname, options.filePrefix));
    },
  });
}

/**
 * Create file filter based on allowed MIME types and extensions
 *
 * @param options - Filter options with allowedMimeTypes and/or allowedExtensions
 * @returns Multer file filter function
 */
function createFileFilter(
  options: Pick<FileUploadOptions, 'allowedMimeTypes' | 'allowedExtensions'>
): MulterFileFilterFn {
  return (req, file, cb) => {
    // Check MIME type if specified
    if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
      if (!options.allowedMimeTypes.includes(file.mimetype)) {
        return cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
      }
    }

    // Check extension if specified
    if (options.allowedExtensions && options.allowedExtensions.length > 0) {
      const ext = extname(file.originalname).toLowerCase();
      if (!options.allowedExtensions.includes(ext)) {
        return cb(new Error(`Extensión de archivo no permitida: ${ext}`));
      }
    }

    // Validate extension vs MIME type for security
    if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
      if (!validateExtensionVsMimeType(file.originalname, file.mimetype)) {
        return cb(new Error('La extensión del archivo no coincide con su tipo'));
      }
    }

    cb(null, true);
  };
}

/**
 * Create configured multer instance
 *
 * @param options - Upload configuration options
 * @returns Configured multer instance
 */
function createMulterUpload(options: FileUploadOptions): multer.Multer {
  const storage = createMulterStorage(options);

  // Build multer options, only including fileFilter if MIME types or extensions are specified
  const hasFilter =
    (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) ||
    (options.allowedExtensions && options.allowedExtensions.length > 0);

  if (hasFilter) {
    return multer({
      storage,
      limits: { fileSize: options.maxFileSize },
      fileFilter: createFileFilter(options),
    });
  }

  return multer({
    storage,
    limits: { fileSize: options.maxFileSize },
  });
}

// ==========================================================
// Error Handling
// ==========================================================

/**
 * Handle multer upload errors consistently
 *
 * @param err - Error from multer
 * @param res - Express response object
 * @param options - Error handler options
 * @returns Response with appropriate error message
 */
export function handleMulterError(
  err: Error | multer.MulterError,
  res: Response,
  options: MulterErrorHandlerOptions
): Response {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'Error al procesar el archivo',
        details: `Archivo demasiado grande. Tamaño máximo: ${Math.round(options.maxFileSize / (1024 * 1024))}MB`,
      });
    }
    return res.status(400).json({
      error: 'Error al procesar el archivo',
      details: `Error de upload: ${err.message}`,
    });
  }

  return res.status(400).json({
    error: 'Error al procesar el archivo',
    details: err.message,
  });
}

/**
 * Create Express middleware that wraps multer.single() with consistent error handling
 *
 * @param upload - Multer instance
 * @param fieldName - Form field name for the file
 * @param options - Error handler options
 * @returns Express middleware
 */
export function createUploadMiddleware(
  upload: multer.Multer,
  fieldName: string,
  options: MulterErrorHandlerOptions
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        options.logger?.error?.(
          { err, filename: (req as { file?: Express.Multer.File }).file?.originalname },
          'Error en multer upload'
        );
        return handleMulterError(err, res, options);
      }
      next();
    });
  };
}

// ==========================================================
// Pre-configured Uploads for Common Use Cases
// ==========================================================

/**
 * Create AUM file upload (spreadsheets: xlsx, xls, csv)
 *
 * @param maxFileSize - Maximum file size in bytes
 * @param uploadDir - Optional custom upload directory
 * @returns Configured multer instance
 */
export function createAumUpload(maxFileSize: number, uploadDir?: string): multer.Multer {
  return createMulterUpload({
    maxFileSize,
    uploadDir,
    allowedMimeTypes: MIME_TYPES.SPREADSHEET,
  });
}

/**
 * Create CSV-only file upload (e.g., capacitaciones)
 *
 * @param maxFileSize - Maximum file size in bytes
 * @param uploadDir - Optional custom upload directory
 * @param filePrefix - Optional file prefix
 * @returns Configured multer instance
 */
export function createCsvUpload(
  maxFileSize: number,
  uploadDir?: string,
  filePrefix?: string
): multer.Multer {
  return createMulterUpload({
    maxFileSize,
    uploadDir,
    filePrefix,
    allowedExtensions: ['.csv'],
    allowedMimeTypes: MIME_TYPES.CSV,
  });
}

/**
 * Create attachment upload with all common file types
 *
 * @param maxFileSize - Maximum file size in bytes
 * @param uploadDir - Optional custom upload directory
 * @returns Configured multer instance
 */
function createAttachmentUpload(maxFileSize: number, uploadDir?: string): multer.Multer {
  return createMulterUpload({
    maxFileSize,
    uploadDir,
    allowedMimeTypes: MIME_TYPES.ATTACHMENTS,
  });
}
