// REGLA CURSOR: Capacitaciones CRUD - mantener RBAC, validación Zod, logging estructurado
import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { promises as fs } from 'node:fs';
import { db, capacitaciones, users } from '@cactus/db';
import { eq, and, ilike, or, desc, asc, sql } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth/middlewares';
import { z } from 'zod';
import { validate } from '../utils/validation';
import { uuidSchema, idParamSchema, paginationQuerySchema, urlSchema, dateSchema } from '../utils/common-schemas';
import { transactionWithLogging } from '../utils/db-transactions';
import { createCsvUpload, handleMulterError, DEFAULT_UPLOAD_DIR } from '../utils/file-upload';
import { parseFechaDDMMYYYY } from '../utils/date-utils';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

const createCapacitacionSchema = z.object({
  titulo: z.string().min(1).max(500),
  tema: z.string().min(1).max(100),
  link: urlSchema,
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (expected YYYY-MM-DD)').optional().nullable()
});

const updateCapacitacionSchema = z.object({
  titulo: z.string().min(1).max(500).optional(),
  tema: z.string().min(1).max(100).optional(),
  link: urlSchema.optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (expected YYYY-MM-DD)').optional().nullable()
});

const listCapacitacionesQuerySchema = paginationQuerySchema.and(
  z.object({
    tema: z.string().optional(),
    search: z.string().optional()
  })
);

// ==========================================================
// Helper Functions
// ==========================================================

/**
 * Parsea archivo CSV de capacitaciones
 * Retorna datos válidos y lista de errores por fila
 */
async function parseCapacitacionesCSV(filePath: string): Promise<{
  data: Array<{
    titulo: string;
    tema: string;
    link: string;
    fecha: Date | null;
  }>;
  errors: Array<{ row: number; message: string }>;
}> {
  const { parse } = await import('csv-parse/sync');
  
  const content = await fs.readFile(filePath, 'utf-8');
  
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_quotes: true,
    escape: '"',
    quote: '"',
    cast: false
  }) as Array<Record<string, string>>;
  
  if (!records || records.length === 0) {
    return {
      data: [],
      errors: [{ row: 0, message: 'El archivo CSV no contiene datos o está vacío' }]
    };
  }
  
  const capacitacionesList: Array<{
    titulo: string;
    tema: string;
    link: string;
    fecha: Date | null;
  }> = [];
  const errors: Array<{ row: number; message: string }> = [];
  
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const rowNumber = i + 2; // +2 porque empieza en 1 y hay header
    
    // Validar que tenga las columnas requeridas
    const titulo = (r['Titulo'] || r['titulo'] || '').trim();
    const tema = (r['TEMA'] || r['tema'] || '').trim();
    const link = (r['LINK'] || r['link'] || '').trim();
    const fechaStr = (r['Fecha'] || r['fecha'] || '').trim();
    
    // Skip filas completamente vacías (todas las columnas vacías)
    if (!titulo && !tema && !link) {
      continue;
    }
    
    // Validar campos requeridos y agregar errores sin detener el proceso
    let hasError = false;
    
    if (!titulo) {
      errors.push({ row: rowNumber, message: `Fila ${rowNumber}: El campo 'Titulo' es requerido` });
      hasError = true;
    }
    if (!tema) {
      errors.push({ row: rowNumber, message: `Fila ${rowNumber}: El campo 'TEMA' es requerido` });
      hasError = true;
    }
    if (!link) {
      errors.push({ row: rowNumber, message: `Fila ${rowNumber}: El campo 'LINK' es requerido` });
      hasError = true;
    }
    
    // Si hay errores de campos requeridos, saltar esta fila
    if (hasError) {
      continue;
    }
    
    // Validar URL
    try {
      new URL(link);
    } catch {
      errors.push({ row: rowNumber, message: `Fila ${rowNumber}: 'LINK' debe ser una URL válida: "${link}"` });
      continue;
    }
    
    // Parsear fecha (puede ser null si está vacía o es inválida)
    const fecha = parseFechaDDMMYYYY(fechaStr);
    
    capacitacionesList.push({
      titulo,
      tema,
      link,
      fecha
    });
  }
  
  return {
    data: capacitacionesList,
    errors
  };
}

// ==========================================================
// File Upload Configuration (using centralized utility)
// ==========================================================

const uploadDir = process.env.UPLOAD_DIR || DEFAULT_UPLOAD_DIR;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const upload = createCsvUpload(MAX_FILE_SIZE, uploadDir, 'capacitaciones');

// ==========================================================
// GET /capacitaciones - Listar capacitaciones
// ==========================================================

router.get(
  '/',
  requireAuth,
  validate({ query: listCapacitacionesQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tema, search, limit = 50, offset = 0 } = req.query as {
        tema?: string;
        search?: string;
        limit?: number;
        offset?: number;
      };
      
      const dbi = db();
      const conditions = [];
      
      if (tema) {
        conditions.push(eq(capacitaciones.tema, tema));
      }
      
      if (search) {
        conditions.push(ilike(capacitaciones.titulo, `%${search}%`));
      }
      
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      // AI_DECISION: Optimize COUNT query using window function
      // Justificación: Reduces from 2 queries to 1 query, improves performance
      // Impacto: Single database round-trip instead of two parallel queries
      const result = await dbi
        .select({
          id: capacitaciones.id,
          titulo: capacitaciones.titulo,
          tema: capacitaciones.tema,
          link: capacitaciones.link,
          fecha: capacitaciones.fecha,
          createdByUserId: capacitaciones.createdByUserId,
          createdAt: capacitaciones.createdAt,
          updatedAt: capacitaciones.updatedAt,
          total: sql<number>`count(*) OVER()`.as('total')
        })
        .from(capacitaciones)
        .where(whereClause)
        .orderBy(desc(capacitaciones.createdAt))
        .limit(limit)
        .offset(offset);
      
      type CapacitacionWithTotal = typeof result[0] & { total: number };
      const data = result.map(({ total: _total, ...row }: CapacitacionWithTotal) => row);
      const total: number = result.length > 0 ? Number(result[0]?.total) : 0;
      
      req.log?.info?.({ count: data.length, total, tema, search }, 'capacitaciones fetched');
      res.json({
        success: true,
        data,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });
    } catch (err) {
      req.log?.error?.({ err }, 'failed to fetch capacitaciones');
      next(err);
    }
  }
);

// ==========================================================
// GET /capacitaciones/:id - Obtener capacitación específica
// ==========================================================

router.get(
  '/:id',
  requireAuth,
  validate({ params: idParamSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      const [capacitacion] = await db()
        .select()
        .from(capacitaciones)
        .where(eq(capacitaciones.id, id))
        .limit(1);
      
      if (!capacitacion) {
        return res.status(404).json({ error: 'Capacitación no encontrada' });
      }
      
      req.log?.info?.({ capacitacionId: id }, 'capacitacion fetched');
      res.json({ success: true, data: capacitacion });
    } catch (err) {
      req.log?.error?.({ err, capacitacionId: req.params.id }, 'failed to fetch capacitacion');
      next(err);
    }
  }
);

// ==========================================================
// POST /capacitaciones - Crear capacitación manual
// ==========================================================

router.post(
  '/',
  requireAuth,
  requireRole(['admin']),
  validate({ body: createCapacitacionSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = req.body as z.infer<typeof createCapacitacionSchema>;
      const userId = req.user!.id;
      
      const fecha = validated.fecha ? new Date(validated.fecha) : null;
      
      const [newCapacitacion] = await db()
        .insert(capacitaciones)
        .values({
          titulo: validated.titulo,
          tema: validated.tema,
          link: validated.link,
          fecha,
          createdByUserId: userId
        })
        .returning();
      
      req.log?.info?.({ capacitacionId: newCapacitacion.id }, 'capacitacion created');
      res.status(201).json({ success: true, data: newCapacitacion });
    } catch (err) {
      req.log?.error?.({ err }, 'failed to create capacitacion');
      next(err);
    }
  }
);

// ==========================================================
// POST /capacitaciones/import - Importar desde CSV
// ==========================================================

router.post(
  '/import',
  requireAuth,
  requireRole(['admin']),
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        req.log?.error?.({ err, filename: (req as { file?: Express.Multer.File }).file?.originalname }, 'Error en multer upload');
        return handleMulterError(err, res, { maxFileSize: MAX_FILE_SIZE });
      }
      next();
    });
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id as string | undefined;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        req.log?.warn?.({ userId }, 'Upload request sin archivo');
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      req.log?.info?.({
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        userId
      }, 'Iniciando importación de capacitaciones desde CSV');
      
      // Parsear CSV
      let parseResult;
      try {
        await fs.access(file.path);
        parseResult = await parseCapacitacionesCSV(file.path);
      } catch (accessError) {
        req.log?.error?.({ err: accessError, filePath: file.path }, 'Archivo no accesible');
        return res.status(400).json({
          error: 'Error al procesar el archivo',
          details: 'El archivo subido no está disponible o fue eliminado'
        });
      }
      
      const { data: parsedData, errors: parseErrors } = parseResult;
      
      if (!parsedData || parsedData.length === 0) {
        try {
          await fs.unlink(file.path);
        } catch {}
        return res.status(400).json({
          error: 'Error al procesar el archivo',
          details: parseErrors.length > 0 
            ? parseErrors.map(e => e.message).join('; ')
            : 'El archivo no contiene datos válidos'
        });
      }
      
      // Insertar en batch usando transacción
      const dbi = db();
      let inserted = 0;
      let insertErrors = 0;
      const errorsList: string[] = [];
      
      // Agregar errores de parsing a la lista
      parseErrors.forEach(e => errorsList.push(e.message));
      
      // AI_DECISION: Optimizar batch insert - reemplazar loop con INSERTs individuales por batch insert
      // Justificación: Reduce de N queries a 1 query dentro de transacción (N-1 reducción, mejora significativa para imports grandes)
      // Impacto: Mejora performance del endpoint de importación de capacitaciones
      await transactionWithLogging(
        req.log,
        'import-capacitaciones-csv',
        async (tx) => {
          if (parsedData.length > 0) {
            try {
              // Batch insert de todos los items
              await tx.insert(capacitaciones).values(
                parsedData.map(item => ({
                  titulo: item.titulo,
                  tema: item.tema,
                  link: item.link,
                  fecha: item.fecha,
                  createdByUserId: userId
                }))
              );
              inserted = parsedData.length;
            } catch (error) {
              // Si batch insert falla, intentar inserts individuales como fallback para identificar items problemáticos
              req.log.warn({ error, batchSize: parsedData.length }, 'Batch insert failed, falling back to individual inserts');
              for (const item of parsedData) {
                try {
                  await tx.insert(capacitaciones).values({
                    titulo: item.titulo,
                    tema: item.tema,
                    link: item.link,
                    fecha: item.fecha,
                    createdByUserId: userId
                  });
                  inserted++;
                } catch (individualError) {
                  insertErrors++;
                  errorsList.push(`Error insertando "${item.titulo}": ${individualError instanceof Error ? individualError.message : String(individualError)}`);
                }
              }
            }
          }
        }
      );
      
      // Limpiar archivo temporal
      try {
        await fs.unlink(file.path);
      } catch {}
      
      const totalErrors = parseErrors.length + insertErrors;
      const totalProcessed = parsedData.length + parseErrors.length;
      
      req.log?.info?.({
        filename: file.originalname,
        inserted,
        parseErrors: parseErrors.length,
        insertErrors,
        totalProcessed,
        total: parsedData.length
      }, 'Importación de capacitaciones completada');
      
      res.json({
        success: true,
        data: {
          totalProcessed,
          totalImported: inserted,
          totalErrors,
          errors: errorsList.length > 0 ? errorsList : undefined
        }
      });
    } catch (err) {
      req.log?.error?.({ err }, 'failed to import capacitaciones');
      next(err);
    }
  }
);

// ==========================================================
// PUT /capacitaciones/:id - Actualizar capacitación
// ==========================================================

router.put(
  '/:id',
  requireAuth,
  requireRole(['admin']),
  validate({ params: idParamSchema, body: updateCapacitacionSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const validated = req.body as z.infer<typeof updateCapacitacionSchema>;
      
      const [existing] = await db()
        .select()
        .from(capacitaciones)
        .where(eq(capacitaciones.id, id))
        .limit(1);
      
      if (!existing) {
        return res.status(404).json({ error: 'Capacitación no encontrada' });
      }
      
      const updateData: {
        titulo?: string;
        tema?: string;
        link?: string;
        fecha?: Date | null;
        updatedAt: Date;
      } = {
        updatedAt: new Date()
      };
      
      if (validated.titulo !== undefined) {
        updateData.titulo = validated.titulo;
      }
      if (validated.tema !== undefined) {
        updateData.tema = validated.tema;
      }
      if (validated.link !== undefined) {
        updateData.link = validated.link;
      }
      if (validated.fecha !== undefined) {
        updateData.fecha = validated.fecha ? new Date(validated.fecha) : null;
      }
      
      const [updated] = await db()
        .update(capacitaciones)
        .set(updateData)
        .where(eq(capacitaciones.id, id))
        .returning();
      
      req.log?.info?.({ capacitacionId: id }, 'capacitacion updated');
      res.json({ success: true, data: updated });
    } catch (err) {
      req.log?.error?.({ err, capacitacionId: req.params.id }, 'failed to update capacitacion');
      next(err);
    }
  }
);

// ==========================================================
// DELETE /capacitaciones/:id - Eliminar capacitación
// ==========================================================

router.delete(
  '/:id',
  requireAuth,
  requireRole(['admin']),
  validate({ params: idParamSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      const [existing] = await db()
        .select()
        .from(capacitaciones)
        .where(eq(capacitaciones.id, id))
        .limit(1);
      
      if (!existing) {
        return res.status(404).json({ error: 'Capacitación no encontrada' });
      }
      
      await db()
        .delete(capacitaciones)
        .where(eq(capacitaciones.id, id));
      
      req.log?.info?.({ capacitacionId: id }, 'capacitacion deleted');
      res.json({ success: true, data: { id, deleted: true } });
    } catch (err) {
      req.log?.error?.({ err, capacitacionId: req.params.id }, 'failed to delete capacitacion');
      next(err);
    }
  }
);

export default router;

