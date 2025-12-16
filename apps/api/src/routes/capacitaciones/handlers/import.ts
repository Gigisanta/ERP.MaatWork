/**
 * Capacitaciones Import Handler
 *
 * POST /capacitaciones/import - Import capacitaciones from CSV
 */
import type { Request, Response, NextFunction } from 'express';
import { promises as fs } from 'node:fs';
import { db, capacitaciones } from '@cactus/db';
import { createAsyncHandler, HttpError } from '../../../utils/route-handler';
import { transactionWithLogging } from '../../../utils/database/db-transactions';
import {
  createCsvUpload,
  handleMulterError,
  DEFAULT_UPLOAD_DIR,
} from '../../../utils/file/file-upload';
import { parseCapacitacionesCSV } from '../utils';

const uploadDir = process.env.UPLOAD_DIR || DEFAULT_UPLOAD_DIR;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const upload = createCsvUpload(MAX_FILE_SIZE, uploadDir, 'capacitaciones');

/**
 * Multer middleware wrapper
 */
const multerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      req.log?.error?.(
        { err, filename: (req as { file?: Express.Multer.File }).file?.originalname },
        'Error en multer upload'
      );
      return handleMulterError(err, res, { maxFileSize: MAX_FILE_SIZE });
    }
    next();
  });
};

export const handleImportCapacitaciones = [
  multerMiddleware,
  createAsyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id as string | undefined;
    if (!userId) {
      throw new HttpError(401, 'Unauthorized');
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      req.log?.warn?.({ userId }, 'Upload request sin archivo');
      throw new HttpError(400, 'No file uploaded');
    }

    req.log?.info?.(
      {
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        userId,
      },
      'Iniciando importación de capacitaciones desde CSV'
    );

    // Parsear CSV
    let parseResult;
    try {
      await fs.access(file.path);
      parseResult = await parseCapacitacionesCSV(file.path);
    } catch (accessError) {
      req.log?.error?.({ err: accessError, filePath: file.path }, 'Archivo no accesible');
      throw new HttpError(
        400,
        'Error al procesar el archivo: El archivo subido no está disponible o fue eliminado'
      );
    }

    const { data: parsedData, errors: parseErrors } = parseResult;

    if (!parsedData || parsedData.length === 0) {
      try {
        await fs.unlink(file.path);
      } catch {}
      throw new HttpError(
        400,
        'Error al procesar el archivo: ' +
          (parseErrors.length > 0
            ? parseErrors.map((e) => e.message).join('; ')
            : 'El archivo no contiene datos válidos')
      );
    }

    // Insertar en batch usando transacción
    const dbi = db();
    let inserted = 0;
    let insertErrors = 0;
    const errorsList: string[] = [];

    // Agregar errores de parsing a la lista
    parseErrors.forEach((e) => errorsList.push(e.message));

    // AI_DECISION: Optimizar batch insert - reemplazar loop con INSERTs individuales por batch insert
    await transactionWithLogging(req.log, 'import-capacitaciones-csv', async (tx) => {
      if (parsedData.length > 0) {
        try {
          // Batch insert de todos los items
          await tx.insert(capacitaciones).values(
            parsedData.map((item) => ({
              titulo: item.titulo,
              tema: item.tema,
              link: item.link,
              fecha: item.fecha,
              createdByUserId: userId,
            }))
          );
          inserted = parsedData.length;
        } catch (error) {
          // Si batch insert falla, intentar inserts individuales como fallback
          req.log.warn(
            { error, batchSize: parsedData.length },
            'Batch insert failed, falling back to individual inserts'
          );
          for (const item of parsedData) {
            try {
              await tx.insert(capacitaciones).values({
                titulo: item.titulo,
                tema: item.tema,
                link: item.link,
                fecha: item.fecha,
                createdByUserId: userId,
              });
              inserted++;
            } catch (individualError) {
              insertErrors++;
              errorsList.push(
                `Error insertando "${item.titulo}": ${individualError instanceof Error ? individualError.message : String(individualError)}`
              );
            }
          }
        }
      }
    });

    // Limpiar archivo temporal
    try {
      await fs.unlink(file.path);
    } catch {}

    const totalErrors = parseErrors.length + insertErrors;
    const totalProcessed = parsedData.length + parseErrors.length;

    req.log?.info?.(
      {
        filename: file.originalname,
        inserted,
        parseErrors: parseErrors.length,
        insertErrors,
        totalProcessed,
        total: parsedData.length,
      },
      'Importación de capacitaciones completada'
    );

    return res.json({
      success: true,
      data: {
        totalProcessed,
        totalImported: inserted,
        totalErrors,
        errors: errorsList.length > 0 ? errorsList : undefined,
      },
      requestId: req.requestId,
    });
  }),
];
