// REGLA CURSOR: Capacitaciones CRUD - mantener RBAC, validación Zod, logging estructurado
import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { extname, join } from 'node:path';
import { promises as fs } from 'node:fs';
import { db, capacitaciones, users } from '@cactus/db';
import { eq, and, ilike, or, desc, asc, sql } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth/middlewares';
import { z } from 'zod';
import { validate } from '../utils/validation';
import { uuidSchema, idParamSchema, paginationQuerySchema, urlSchema, dateSchema } from '../utils/common-schemas';
import { transactionWithLogging } from '../utils/db-transactions';

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
 * Parsea fecha en formato DD/MM/YYYY a Date o null
 */
function parseFechaDDMMYYYY(fechaStr: string | null | undefined): Date | null {
  if (!fechaStr || !fechaStr.trim()) {
    return null;
  }
  
  // Formato esperado: DD/MM/YYYY
  const match = fechaStr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    return null;
  }
  
  const [, day, month, year] = match;
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  
  // Validar rango
  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
    return null;
  }
  
  // Crear fecha (mes es 0-indexed en JS)
  const date = new Date(yearNum, monthNum - 1, dayNum);
  
  // Validar que la fecha es válida
  if (date.getFullYear() !== yearNum || date.getMonth() !== monthNum - 1 || date.getDate() !== dayNum) {
    return null;
  }
  
  return date;
}

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
// File Upload Configuration
// ==========================================================

const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch {}
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `capacitaciones-${uniqueSuffix}${extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    if (ext === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos CSV'));
    }
  }
});

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
      
      const [data, totalResult] = await Promise.all([
        dbi
          .select()
          .from(capacitaciones)
          .where(whereClause)
          .orderBy(desc(capacitaciones.createdAt))
          .limit(limit)
          .offset(offset),
        dbi
          .select({ count: sql<number>`count(*)`.as('count') })
          .from(capacitaciones)
          .where(whereClause)
      ]);
      
      const total = Number(totalResult[0]?.count || 0);
      
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
        req.log?.error?.({ err, filename: (req as any).file?.originalname }, 'Error en multer upload');
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              error: 'Error al procesar el archivo',
              details: `Archivo demasiado grande. Tamaño máximo: ${MAX_FILE_SIZE / (1024 * 1024)}MB`
            });
          }
          return res.status(400).json({
            error: 'Error al procesar el archivo',
            details: `Error de upload: ${err.message}`
          });
        }
        return res.status(400).json({
          error: 'Error al procesar el archivo',
          details: err instanceof Error ? err.message : String(err)
        });
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
      
      await transactionWithLogging(
        req.log,
        'import-capacitaciones-csv',
        async (tx) => {
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
            } catch (error) {
              insertErrors++;
              errorsList.push(`Error insertando "${item.titulo}": ${error instanceof Error ? error.message : String(error)}`);
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

