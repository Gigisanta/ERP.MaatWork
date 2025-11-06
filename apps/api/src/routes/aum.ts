import { Router } from 'express';
import multer from 'multer';
import { extname, join } from 'node:path';
import { promises as fs } from 'node:fs';
import type { Request } from 'express';
import { db, aumImportFiles, aumImportRows, brokerAccounts, contacts, users, teams, teamMembership, advisorAliases, advisorAccountMapping } from '@cactus/db';
import { eq, and, sql, inArray, type SQL } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth/middlewares';
import { canAccessAumFile, getUserAccessScope } from '../auth/authorization';
import { z } from 'zod';
import { validate } from '../utils/validation';
import { 
  uuidSchema, 
  fileIdParamSchema, 
  paginationQuerySchema,
  brokerSchema 
} from '../utils/common-schemas';
import { AUM_LIMITS } from '../config/aum-limits';
import { createErrorResponse } from '../utils/error-response';
import { normalizeAccountNumber, normalizeAdvisorAlias } from '../utils/aum-normalization';
import { mapAumColumns } from '../utils/aum-column-mapper';
import { transactionWithLogging } from '../utils/db-transactions';

const router = Router();

// Export small helpers for testing
export function computeMatchStatus(matchedContactId: string | null | undefined): 'matched' | 'unmatched' {
  return matchedContactId ? 'matched' : 'unmatched';
}

// ==========================================================
// Zod Validation Schemas
// ==========================================================

// Path parameter schemas
const fileIdParamsSchema = fileIdParamSchema;

// Query parameter schemas
const exportQuerySchema = z.object({}).optional(); // No query params for export

const commitQuerySchema = z.object({
  broker: brokerSchema.optional()
});

const previewQuerySchema = z.object({
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .pipe(z.number().int().min(1).max(500))
    .optional()
    .default('50')
});

const historyQuerySchema = z.intersection(
  paginationQuerySchema,
  z.object({
    limit: z.string()
      .regex(/^\d+$/, 'Limit must be a number')
      .transform(Number)
      .pipe(z.number().int().min(1).max(200))
      .optional()
      .default('50')
  })
);

const uploadQuerySchema = z.object({
  broker: brokerSchema.optional()
});

const purgeQuerySchema = z.object({
  force: z
    .string()
    .transform((v) => v === 'true')
    .optional()
});

const purgeAllQuerySchema = z.object({
  broker: brokerSchema.optional()
});

const rowsAllQuerySchema = z.intersection(
  paginationQuerySchema,
  z.object({
    limit: z.string()
      .regex(/^\d+$/, 'Limit must be a number')
      .transform(Number)
      .pipe(z.number().int().min(1).max(200))
      .optional()
      .default('50'),
    broker: brokerSchema.optional(),
    status: z.enum(['matched', 'ambiguous', 'unmatched']).optional(),
    fileId: uuidSchema.optional(),
    preferredOnly: z.string()
      .transform((v) => v === 'true')
      .optional()
      .default('true')
  })
);

// Body schemas
const matchRowBodySchema = z.object({
  rowId: uuidSchema,
  matchedContactId: uuidSchema.optional().nullable(),
  matchedUserId: uuidSchema.optional().nullable()
});

// ==========================================================
// File Upload Configuration
// ==========================================================

// AI_DECISION: Guardar uploads en FS local bajo apps/api/uploads y registrar metadata en DB
// Justificación: Simplicidad y trazabilidad en MVP; mover a S3 en el futuro si es necesario
// Impacto: Nuevo endpoint y archivos temporales controlados
// CORRECCIÓN: Usar variable de entorno UPLOAD_DIR para evitar path duplicado

const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

// AI_DECISION: Eliminar Pool manual - usar solo Drizzle
// Justificación: Drizzle ya maneja conexiones con pool interno, duplicar pool causa problemas
// Impacto: Mejor gestión de conexiones, sin riesgo de pool exhaustion

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch {}
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${extname(file.originalname)}`);
  }
});

// GET /admin/aum/uploads/:fileId/export
router.get('/uploads/:fileId/export', 
  requireAuth,
  validate({ params: fileIdParamsSchema, query: exportQuerySchema }),
  async (req, res) => {
  try {
    const { fileId } = req.params; // Validated UUID
    const userId = req.user?.id as string;
    const userRole = req.user?.role as 'admin' | 'manager' | 'advisor';
    
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user has access to this file
    const hasAccess = await canAccessAumFile(userId, userRole, fileId);
    if (!hasAccess) {
      return res.status(404).json({ error: 'File not found' });
    }

    const dbi = db();
    const [file] = await dbi.select().from(aumImportFiles).where(eq(aumImportFiles.id, fileId)).limit(1);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const rows = await dbi.select().from(aumImportRows).where(eq(aumImportRows.fileId, fileId));

    const headers = [
      'account_number',
      'broker_holder_name',
      'crm_contact_id',
      'crm_contact_full_name',
      'matched_user_id',
      'advisor_raw',
      'match_status'
    ];

    // Fetch contact names for matched rows
    type AumRowWithContactId = {
      matchedContactId: string | null;
      [key: string]: unknown;
    };
    const contactIdSet = new Set<string>();
    rows.forEach((r: AumRowWithContactId) => { 
      if (r.matchedContactId) contactIdSet.add(r.matchedContactId); 
    });
    const contactIds = Array.from(contactIdSet);
    const contactMap = new Map<string, string>();
    if (contactIds.length > 0) {
      // Fallback robusto: usar SQL crudo para evitar metadatos de tablas
      for (const cid of contactIds) {
        try {
          const r = await dbi.execute(sql`SELECT id, full_name FROM contacts WHERE id = ${cid} LIMIT 1`);
          type ContactResult = {
            id: string;
            full_name: string;
          };
          const rec = (r.rows && r.rows[0]) as ContactResult | undefined;
          if (rec && rec.id) {
            contactMap.set(rec.id, rec.full_name || '');
          }
        } catch {}
      }
    }

    const csvLines: string[] = [];
    csvLines.push(headers.join(','));
    for (const r of rows as any[]) {
      const values = [
        r.accountNumber || '',
        r.holderName || '',
        r.matchedContactId || '',
        (r.matchedContactId ? (contactMap.get(r.matchedContactId) || '') : ''),
        r.matchedUserId || '',
        r.advisorRaw || '',
        r.matchStatus || ''
      ];
      const escaped = values.map((v) => {
        const s = String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
      });
      csvLines.push(escaped.join(','));
    }

    const csv = csvLines.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=aup_export_${fileId}.csv`);
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// POST /admin/aum/uploads/:fileId/commit
// AI_DECISION: Require manager+ role for commit operation
// Justificación: Operación crítica que modifica broker_accounts y contacts, requiere supervisión
// Impacto: Advisors no pueden commitear importaciones sin aprobación de manager/admin
router.post('/uploads/:fileId/commit', 
  requireAuth, 
  requireRole(['admin', 'manager']),
  validate({ params: fileIdParamsSchema, query: commitQuerySchema }),
  async (req, res) => {
  try {
    const { fileId } = req.params; // Validated UUID
    const { broker = 'balanz' } = req.query; // Validated broker enum
    const userId = (req as any).user?.id as string;
    const userRole = (req as any).user?.role as 'admin' | 'manager' | 'advisor';
    
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user has access to this file
    const hasAccess = await canAccessAumFile(userId, userRole, fileId);
    if (!hasAccess) {
      return res.status(404).json({ error: 'File not found' });
    }
    const dbi = db();

    const [file] = await dbi.select().from(aumImportFiles).where(eq(aumImportFiles.id, fileId)).limit(1);
    if (!file) return res.status(404).json({ error: 'File not found' });

    // Check for ambiguous rows that need resolution
    const ambiguousRows = await dbi.select().from(aumImportRows)
      .where(and(eq(aumImportRows.fileId, fileId), eq(aumImportRows.matchStatus, 'ambiguous')));
    
    if (ambiguousRows.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot commit file with unresolved conflicts', 
        details: `Found ${ambiguousRows.length} rows with ambiguous status. Please resolve conflicts before committing.` 
      });
    }

    // Only commit matched rows that are preferred (source of truth)
    const rows = await dbi.select().from(aumImportRows)
      .where(and(
        eq(aumImportRows.fileId, fileId), 
        eq(aumImportRows.matchStatus, 'matched'),
        eq(aumImportRows.isPreferred, true)
      ));

    // AI_DECISION: Usar transacción para asegurar consistencia atómica
    // Justificación: Operación crítica que modifica múltiples tablas (brokerAccounts, contacts, aumImportFiles)
    // Si cualquier operación falla, todas deben hacer rollback para mantener consistencia
    // Impacto: Previene estados inconsistentes si falla a mitad del proceso
    const result = await transactionWithLogging(
      req.log,
      'commit-aum-file',
      async (tx) => {
        let upserts = 0;
        let skipped = 0;
        
        for (const r of rows) {
          if (!r.accountNumber || !r.matchedContactId) {
            skipped += 1;
            continue;
          }

          // Find existing broker account
          const existing = await tx.select().from(brokerAccounts)
            .where(and(eq(brokerAccounts.broker, broker), eq(brokerAccounts.accountNumber, r.accountNumber)))
            .limit(1);

          if (existing.length === 0) {
            await tx.insert(brokerAccounts).values({
              broker,
              accountNumber: r.accountNumber,
              holderName: r.holderName ?? null,
              contactId: r.matchedContactId as string,
              status: 'active'
            });
            upserts += 1;
          } else {
            // Update holder name/contact if changed (prefer matched contactId)
            const ex = existing[0];
            const needsUpdate = (ex.holderName !== (r.holderName ?? null)) || (ex.contactId !== r.matchedContactId);
            if (needsUpdate) {
              await tx.update(brokerAccounts)
                .set({ holderName: r.holderName ?? null, contactId: r.matchedContactId as string, status: 'active' })
                .where(eq(brokerAccounts.id, ex.id as string));
              upserts += 1;
            }
          }

          // Optionally set advisor on contact if empty and we have a matched user
          if (r.matchedUserId) {
            const [c] = await tx.select({ assignedAdvisorId: contacts.assignedAdvisorId })
              .from(contacts)
              .where(eq(contacts.id, r.matchedContactId as string))
              .limit(1);
            if (c && !c.assignedAdvisorId) {
              await tx.update(contacts)
                .set({ assignedAdvisorId: r.matchedUserId as string })
                .where(eq(contacts.id, r.matchedContactId as string));
            }
          }
        }

        // Update file status only if all operations succeeded
        await tx.update(aumImportFiles)
          .set({ status: 'committed' })
          .where(eq(aumImportFiles.id, fileId));

        return { upserts, skipped };
      },
      {
        timeout: 60000, // 60 segundos para operaciones batch largas
        maxRetries: 3
      }
    );

    const { upserts, skipped } = result;

    return res.json({ 
      ok: true, 
      upserts, 
      skipped, 
      total: rows.length,
      message: `${upserts} cuentas sincronizadas` + (skipped > 0 ? `, ${skipped} omitidas` : '')
    });
  } catch (error) {
    req.log.error({ err: error, fileId: req.params.fileId }, 'AUM commit failed');
    return res.status(500).json(
      createErrorResponse({
        error,
        requestId: (req as any).requestId,
        userMessage: 'Error procesando commit de archivo'
      })
    );
  }
});

const upload = multer({
  storage,
  limits: { fileSize: AUM_LIMITS.MAX_FILE_SIZE }
});

// AI_DECISION: ensureAumTables() removido - tablas ya están en Drizzle migrations
// Justificación: Las tablas AUM están definidas en packages/db/src/schema.ts y migraciones 0012/0013
// Impacto: Simplifica código y sigue convención de usar solo migraciones Drizzle


function isEmailLike(value: string | null | undefined): boolean {
  if (!value) return false;
  return /@/.test(value);
}

async function parseFileToRows(filePath: string, originalName: string): Promise<Array<{ 
  accountNumber: string | null; 
  holderName: string | null; 
  advisorRaw: string | null; 
  aumDollars: number | null;
  bolsaArg: number | null;
  fondosArg: number | null;
  bolsaBci: number | null;
  pesos: number | null;
  mep: number | null;
  cable: number | null;
  cv7000: number | null;
  raw: Record<string, unknown>; 
}>> {
  const ext = extname(originalName).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    try {
      // AI_DECISION: Usar import dinámico en lugar de require para compatibilidad con ES modules
      // Justificación: require no está disponible en ES modules, necesitamos usar import dinámico
      // Impacto: Compatibilidad con módulos ES6/TypeScript moderno
      const XLSX = await import('xlsx');
      
      // Leer archivo Excel con manejo de errores
      let wb;
      try {
        // XLSX es un módulo CommonJS, necesitamos acceder a default o usar la sintaxis correcta
        const xlsxModule = 'default' in XLSX ? XLSX.default : XLSX;
        wb = xlsxModule.readFile(filePath, { 
          cellDates: true,  // Convertir fechas a objetos Date
          cellNF: false,    // No convertir números formateados
          cellText: false   // Usar valores reales, no texto
        });
      } catch (readError) {
        throw new Error(`Error al leer archivo Excel: ${readError instanceof Error ? readError.message : String(readError)}`);
      }
      
      // Verificar que tenga al menos una hoja
      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        throw new Error('El archivo Excel no contiene hojas');
      }
      
      // Logging de todas las hojas disponibles
      console.log('[AUM Parser] Hojas disponibles en Excel:', wb.SheetNames);
      
      // AI_DECISION: Fix TypeScript implicit 'any' and untyped function call issues; increase strictness and maintain compatibility.
      // Justificación: sheet_to_json does not accept type arguments and 'r' was not typed; to enforce strict typing, first parse as unknown[], then map with explicit type.
      // Impacto: Only parseFileToRows XSLX branch affected; code is now type safe and future-proof.
      const sheetName: string = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      
      if (!ws) {
        throw new Error(`No se pudo acceder a la hoja "${sheetName}"`);
      }
      
      // Convertir hoja a JSON con opciones robustas
      let json: Array<Record<string, unknown>>;
      try {
        const xlsxModule = 'default' in XLSX ? XLSX.default : XLSX;
        json = xlsxModule.utils.sheet_to_json(ws, { 
          defval: null,           // Valor por defecto para celdas vacías
          raw: true,              // Mantener valores originales (números, fechas, etc.)
          dateNF: 'yyyy-mm-dd',   // Formato de fecha (si raw: false)
          blankrows: false          // No incluir filas completamente vacías
        }) as Array<Record<string, unknown>>;
        
        // AI_DECISION: Logging de diagnóstico para columnas detectadas - siempre activo
        // Justificación: Es crítico para diagnosticar problemas de mapeo
        // Impacto: Permite identificar problemas rápidamente
        if (json.length > 0) {
          const firstRow = json[0];
          const detectedColumns = Object.keys(firstRow);
          console.log('[AUM Parser] ==========================================');
          console.log('[AUM Parser] Columnas detectadas en Excel:', detectedColumns);
          console.log('[AUM Parser] Total de columnas:', detectedColumns.length);
          console.log('[AUM Parser] Primera fila completa:', JSON.stringify(firstRow, null, 2));
          if (json.length > 1) {
            console.log('[AUM Parser] Segunda fila (para referencia):', JSON.stringify(json[1], null, 2));
          }
          console.log('[AUM Parser] ==========================================');
        }
      } catch (parseError) {
        throw new Error(`Error al parsear hoja Excel: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
      
      // Verificar que se hayan parseado filas
      if (!json || json.length === 0) {
        throw new Error('El archivo Excel no contiene datos o la hoja está vacía');
      }
      
      // Mapear filas con manejo de errores individual
      const rows: Array<{ 
        accountNumber: string | null; 
        holderName: string | null; 
        advisorRaw: string | null;
        aumDollars: number | null;
        bolsaArg: number | null;
        fondosArg: number | null;
        bolsaBci: number | null;
        pesos: number | null;
        mep: number | null;
        cable: number | null;
        cv7000: number | null;
        raw: Record<string, unknown>; 
      }> = [];
      let errorCount = 0;
      
      for (let i = 0; i < json.length; i++) {
        try {
          const r = json[i];
          
          // Verificar que la fila no esté completamente vacía
          const hasData = r && typeof r === 'object' && Object.keys(r).length > 0 && 
                         Object.values(r).some(v => v !== null && v !== undefined && v !== '');
          
          if (!hasData) {
            // Saltar filas completamente vacías sin error
            continue;
          }
          
          // AI_DECISION: Usar mapeo flexible de columnas para mayor tolerancia a variaciones
          // Justificación: Permite reconocer diferentes nombres de columnas sin romper el sistema
          // Impacto: Mayor flexibilidad para aceptar CSVs con diferentes estructuras
          const mapped = mapAumColumns(r);
          rows.push({
            accountNumber: mapped.accountNumber ? normalizeAccountNumber(mapped.accountNumber) : null,
            holderName: mapped.holderName,
            advisorRaw: mapped.advisorRaw,
            aumDollars: mapped.aumDollars,
            bolsaArg: mapped.bolsaArg,
            fondosArg: mapped.fondosArg,
            bolsaBci: mapped.bolsaBci,
            pesos: mapped.pesos,
            mep: mapped.mep,
            cable: mapped.cable,
            cv7000: mapped.cv7000,
            raw: r
          });
        } catch (rowError) {
          errorCount++;
          // Log error pero continuar con otras filas
          // Usar console.warn ya que no tenemos acceso a req.log aquí
          console.warn(`Error procesando fila ${i + 1} del Excel: ${rowError instanceof Error ? rowError.message : String(rowError)}`);
          // Agregar fila con valores null pero preservar raw
          rows.push({
            accountNumber: null,
            holderName: null,
            advisorRaw: null,
            aumDollars: null,
            bolsaArg: null,
            fondosArg: null,
            bolsaBci: null,
            pesos: null,
            mep: null,
            cable: null,
            cv7000: null,
            raw: json[i] || {}
          });
        }
      }
      
      // Verificar que al menos haya una fila procesada (aunque tenga errores)
      if (rows.length === 0) {
        throw new Error('El archivo Excel no contiene filas válidas con datos procesables');
      }
      
      // Si todas las filas tuvieron errores, advertir pero continuar
      if (errorCount === json.length && rows.length > 0) {
        console.warn(`Advertencia: Todas las filas del Excel tuvieron errores, pero se procesaron ${rows.length} filas con datos parciales`);
      }
      
      return rows;
    } catch (error) {
      throw new Error(`Error procesando archivo Excel "${originalName}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // AI_DECISION: Usar csv-parse para parsing robusto en lugar de split manual
  // Justificación: Maneja correctamente comillas escapadas, campos con comas, multilinea, encoding
  // Impacto: Parsing más seguro y confiable, especialmente con CSVs complejos
  try {
    const { parse } = await import('csv-parse/sync');
    
    // Leer archivo CSV con manejo de errores
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch (readError) {
      throw new Error(`Error al leer archivo CSV: ${readError instanceof Error ? readError.message : String(readError)}`);
    }
    
    // Parsear CSV con manejo de errores
    let records: Array<Record<string, string>>;
    try {
      records = parse(content, {
        columns: true,           // Usar primera fila como headers
        skip_empty_lines: true,  // Ignorar líneas vacías
        trim: true,              // Trim whitespace
        bom: true,               // Handle UTF-8 BOM
        relax_quotes: true,      // Más tolerante con comillas
        escape: '"',             // Comillas escapadas con ""
        quote: '"',              // Comillas para campos
        cast: false              // No convertir tipos automáticamente
      }) as Array<Record<string, string>>;
    } catch (parseError) {
      throw new Error(`Error al parsear archivo CSV: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
    
    // Verificar que se hayan parseado filas
    if (!records || records.length === 0) {
      throw new Error('El archivo CSV no contiene datos o está vacío');
    }
    
    // Mapear filas con manejo de errores individual (similar a Excel)
    const rows: Array<{ 
      accountNumber: string | null; 
      holderName: string | null; 
      advisorRaw: string | null;
      aumDollars: number | null;
      bolsaArg: number | null;
      fondosArg: number | null;
      bolsaBci: number | null;
      pesos: number | null;
      mep: number | null;
      cable: number | null;
      cv7000: number | null;
      raw: Record<string, unknown>; 
    }> = [];
    
    for (let i = 0; i < records.length; i++) {
      try {
        const r = records[i];
        // AI_DECISION: Usar mapeo flexible de columnas para mayor tolerancia a variaciones
        // Justificación: Permite reconocer diferentes nombres de columnas sin romper el sistema
        // Impacto: Mayor flexibilidad para aceptar CSVs con diferentes estructuras
        const mapped = mapAumColumns(r);
        rows.push({
          accountNumber: mapped.accountNumber ? normalizeAccountNumber(mapped.accountNumber) : null,
          holderName: mapped.holderName,
          advisorRaw: mapped.advisorRaw,
          aumDollars: mapped.aumDollars,
          bolsaArg: mapped.bolsaArg,
          fondosArg: mapped.fondosArg,
          bolsaBci: mapped.bolsaBci,
          pesos: mapped.pesos,
          mep: mapped.mep,
          cable: mapped.cable,
          cv7000: mapped.cv7000,
          raw: r as Record<string, unknown>
        });
      } catch (rowError) {
        // Log error pero continuar con otras filas
        // Usar console.warn ya que no tenemos acceso a req.log aquí
        console.warn(`Error procesando fila ${i + 1} del CSV: ${rowError instanceof Error ? rowError.message : String(rowError)}`);
        // Agregar fila con valores null pero preservar raw
        rows.push({
          accountNumber: null,
          holderName: null,
          advisorRaw: null,
          aumDollars: null,
          bolsaArg: null,
          fondosArg: null,
          bolsaBci: null,
          pesos: null,
          mep: null,
          cable: null,
          cv7000: null,
          raw: records[i] || {}
        });
      }
    }
    
    return rows;
  } catch (error) {
    throw new Error(`Error procesando archivo CSV "${originalName}": ${error instanceof Error ? error.message : String(error)}`);
  }
}

// POST /admin/aum/uploads
router.post('/uploads', 
  requireAuth,
  requireRole(['admin']),
  validate({ query: uploadQuerySchema }),
  (req, res, next) => {
    // Middleware para manejar errores de multer antes de llegar al handler
    upload.single('file')(req, res, (err) => {
      if (err) {
        req.log?.error?.({ err, filename: (req as any).file?.originalname }, 'Error en multer upload');
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
              error: 'Error al procesar el archivo',
              details: `Archivo demasiado grande. Tamaño máximo: ${AUM_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB`
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
  async (req: Request, res) => {
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
    }, 'Iniciando procesamiento de archivo AUM');

    const { broker = 'balanz' } = req.query; // Validated broker enum

    const dbi = db();
    // AI_DECISION: Usar insert de Drizzle en lugar de SQL crudo
    // Justificación: Mejor type safety y usa schema definido en packages/db
    const [fileRow] = await dbi.insert(aumImportFiles).values({
      broker,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedByUserId: userId,
      status: 'uploaded',
      totalParsed: 0,
      totalMatched: 0,
      totalUnmatched: 0
    }).returning();

    // Resolve team scope for matching (all members of uploader's teams)
    let teamIds: string[] = [];
    let memberUserIds: string[] = [];
    try {
      type TeamWithId = { id: string };
      type TeamMembershipWithTeamId = { teamId: string };
      type TeamMembershipWithUserId = { userId: string | null };
      type TeamWithManagerId = { userId: string | null };
      
      const myManagerTeams = await dbi.select({ id: teams.id }).from(teams).where(sql`manager_user_id = ${userId}`) as TeamWithId[];
      const myMemberTeams = await dbi.select({ teamId: teamMembership.teamId }).from(teamMembership).where(sql`user_id = ${userId}`) as TeamMembershipWithTeamId[];
      const set = new Set<string>();
      myManagerTeams.forEach((t: TeamWithId) => set.add(t.id));
      myMemberTeams.forEach((t: TeamMembershipWithTeamId) => set.add(t.teamId));
      teamIds = Array.from(set);
      if (teamIds.length > 0) {
        const members = await dbi.select({ userId: teamMembership.userId }).from(teamMembership).where(inArray(teamMembership.teamId, teamIds)) as TeamMembershipWithUserId[];
        const managers = await dbi.select({ userId: teams.managerUserId }).from(teams).where(inArray(teams.id, teamIds)) as TeamWithManagerId[];
        const mset = new Set<string>();
        members.forEach((m: TeamMembershipWithUserId) => {
          if (m.userId) mset.add(m.userId);
        });
        managers.forEach((m: TeamWithManagerId) => {
          if (m.userId) mset.add(m.userId);
        });
        memberUserIds = Array.from(mset);
      }
    } catch {}

    // Parse file to rows
    let parsedRows;
    try {
      // Verificar que el archivo existe y es accesible
      try {
        await fs.access(file.path);
        req.log?.info?.({ filePath: file.path, filename: file.originalname, fileSize: file.size }, 'Archivo verificado, iniciando parseo');
      } catch (accessError) {
        req.log?.error?.({ err: accessError, filePath: file.path }, 'Archivo no accesible');
        return res.status(400).json({ 
          error: 'Error al procesar el archivo',
          details: 'El archivo subido no está disponible o fue eliminado'
        });
      }
      
      // Resetear flag de logging para nuevo archivo
      (global as any).__aumMapperLogged = false;
      
      req.log?.info?.({ filePath: file.path, filename: file.originalname }, 'Iniciando parseo de archivo');
      parsedRows = await parseFileToRows(file.path, file.originalname);
      req.log?.info?.({ rowCount: parsedRows?.length, filename: file.originalname }, 'Archivo parseado exitosamente');
      
      // Validar que se hayan parseado filas
      if (!parsedRows || parsedRows.length === 0) {
        req.log?.warn?.({ filename: file.originalname }, 'Archivo parseado pero sin filas válidas');
        // Limpiar archivo temporal en caso de error
        try {
          await fs.unlink(file.path);
        } catch {
          // Ignorar error al eliminar archivo temporal
        }
        return res.status(400).json({ 
          error: 'Error al procesar el archivo',
          details: 'El archivo no contiene datos válidos o todas las filas están vacías'
        });
      }

      // Logging de diagnóstico: verificar cuántas filas tienen accountNumber
      const rowsWithAccount = parsedRows.filter(r => r.accountNumber).length;
      req.log?.info?.({ 
        totalRows: parsedRows.length,
        rowsWithAccount,
        filename: file.originalname 
      }, 'Filas parseadas - diagnóstico');
      
      // Muestra de ejemplo de primera fila
      if (parsedRows.length > 0) {
        const firstRow = parsedRows[0];
        req.log?.info?.({ 
          firstRowSample: {
            accountNumber: firstRow.accountNumber,
            holderName: firstRow.holderName,
            aumDollars: firstRow.aumDollars,
            bolsaArg: firstRow.bolsaArg,
            fondosArg: firstRow.fondosArg,
            pesos: firstRow.pesos
          }
        }, 'Primera fila parseada - muestra');
      }
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      const errorStack = parseError instanceof Error ? parseError.stack : undefined;
      req.log?.error?.({ 
        err: parseError, 
        filename: file.originalname,
        errorMessage,
        errorStack,
        filePath: file.path,
        fileSize: file.size,
        mimetype: file.mimetype
      }, 'Error parsing AUM file');
      
      // Limpiar archivo temporal en caso de error
      try {
        await fs.unlink(file.path);
        req.log?.debug?.({ filePath: file.path }, 'Archivo temporal eliminado después de error');
      } catch (unlinkError) {
        req.log?.warn?.({ err: unlinkError, filePath: file.path }, 'Error al eliminar archivo temporal');
      }
      
      return res.status(400).json({ 
        error: 'Error al procesar el archivo',
        details: errorMessage
      });
    }

    let matched = 0;
    let ambiguous = 0;
    let conflictsDetected = 0;
    
    type AumRowInsert = {
      fileId: string;
      raw: Record<string, unknown>;
      accountNumber: string | null;
      holderName: string | null;
      advisorRaw: string | null;
      matchedContactId: string | null;
      matchedUserId: string | null;
      matchStatus: 'matched' | 'ambiguous' | 'unmatched';
      isPreferred: boolean;
      conflictDetected: boolean;
      aumDollars: number | null;
      bolsaArg: number | null;
      fondosArg: number | null;
      bolsaBci: number | null;
      pesos: number | null;
      mep: number | null;
      cable: number | null;
      cv7000: number | null;
    };
    
    const rowsToInsert: AumRowInsert[] = [];
    
    // Get existing rows for duplicate detection
    type ExistingRow = {
      account_number: string;
      holder_name: string | null;
      advisor_raw: string | null;
      file_id: string;
      created_at: Date;
    };
    
    const existingAccounts = new Map<string, ExistingRow[]>();
    try {
      const existingResult = await dbi.execute(sql`
        SELECT account_number, holder_name, advisor_raw, file_id, created_at
        FROM aum_import_rows
        WHERE account_number IS NOT NULL
      `);
      (existingResult.rows || []).forEach((row: ExistingRow) => {
        if (!existingAccounts.has(row.account_number)) {
          existingAccounts.set(row.account_number, []);
        }
        existingAccounts.get(row.account_number)!.push(row);
      });
    } catch {}
    
    for (const r of parsedRows) {
      let matchedContactId: string | null = null;
      let matchedUserId: string | null = null;
      let matchStatus: 'matched' | 'ambiguous' | 'unmatched' = 'unmatched';
      let conflictDetected = false;

      // AI_DECISION: Normalizar número de cuenta antes de cualquier matching
      // Justificación: Consistencia en comparaciones y claves únicas por broker+cuenta
      // Impacto: Evita duplicados por formatos distintos del mismo número
      if (r.accountNumber) {
        r.accountNumber = normalizeAccountNumber(r.accountNumber);
      }

      // AI_DECISION: Aplicar mapeo estático de asesores antes de procesar fila
      // Justificación: El mapeo asesor-cuenta se carga una vez y prevalece sobre valores del archivo mensual
      // Impacto: Asegura consistencia en asignación de asesores independientemente del archivo cargado
      if (r.accountNumber) {
        try {
          const advisorMapping = await dbi.select().from(advisorAccountMapping)
            .where(eq(advisorAccountMapping.accountNumber, r.accountNumber))
            .limit(1);
          if (advisorMapping.length > 0) {
            const mapping = advisorMapping[0];
            // Usar advisorRaw del mapeo (no del archivo mensual)
            if (mapping.advisorRaw) {
              r.advisorRaw = mapping.advisorRaw;
            }
            // Si el mapeo ya tiene matchedUserId, usarlo directamente
            if (mapping.matchedUserId) {
              matchedUserId = mapping.matchedUserId;
            }
          }
        } catch {}
      }

      // Check for duplicates in existing import rows
      if (r.accountNumber && existingAccounts.has(r.accountNumber)) {
        const existingRows = existingAccounts.get(r.accountNumber)!;
        // Check if data conflicts
        const hasConflict = existingRows.some((existing: ExistingRow) => 
          existing.holder_name !== r.holderName || existing.advisor_raw !== r.advisorRaw
        );
        
        if (hasConflict) {
          matchStatus = 'ambiguous';
          conflictDetected = true;
          conflictsDetected += 1;
          ambiguous += 1;
        }
      }

      // Pre-match by broker account number if not already matched/ambiguous
      if (!matchedContactId && !conflictDetected && r.accountNumber) {
        try {
          const res = await dbi.execute(sql`SELECT contact_id FROM broker_accounts WHERE broker = ${broker} AND account_number = ${r.accountNumber} LIMIT 1`);
          const row = (res.rows && res.rows[0]) as any;
          if (row && row.contact_id) {
            matchedContactId = row.contact_id as string;
          }
        } catch {}
      }

      // If still no match, try matching by holder name (similarity search) scoped to team when applicable
      if (!matchedContactId && !conflictDetected && r.holderName) {
        try {
          // Use similarity search with pg_trgm if available, otherwise exact match
          const res = await dbi.execute(sql`
            SELECT id, full_name,
                   similarity(full_name, ${r.holderName}) as sim_score
            FROM contacts
            WHERE deleted_at IS NULL
              AND full_name % ${r.holderName}
            ORDER BY sim_score DESC
            LIMIT ${AUM_LIMITS.MAX_SIMILARITY_RESULTS}
          `);
          
          // If we get a high-confidence match (threshold), use it
          const rows = res.rows as any[];
          if (rows.length > 0 && rows[0].sim_score > AUM_LIMITS.SIMILARITY_THRESHOLD) {
            matchedContactId = rows[0].id as string;
          }
        } catch (e) {
          // If similarity search fails (e.g., extension not installed), try exact match
          try {
            const res = await dbi.execute(sql`
              SELECT id FROM contacts
              WHERE deleted_at IS NULL
                AND LOWER(TRIM(full_name)) = LOWER(TRIM(${r.holderName}))
              LIMIT 1
            `);
            const row = (res.rows && res.rows[0]) as any;
            if (row && row.id) {
              matchedContactId = row.id as string;
            }
          } catch {}
        }
      }

      // Pre-match advisor by email if email-like
      if (isEmailLike(r.advisorRaw)) {
        try {
          const res = await dbi.execute(sql`SELECT id FROM users WHERE email = ${r.advisorRaw as string} LIMIT 1`);
          const row = (res.rows && res.rows[0]) as any;
          if (row && row.id) {
            matchedUserId = row.id as string;
          }
        } catch {}
      } else if (r.advisorRaw) {
        // AI_DECISION: Usar alias exacto (trim + lowercase) para mapear asesor
        // Justificación: Permite normalización desde Settings sin exponer emails en CSV
        // Impacto: Mejora tasa de match de asesores
        try {
          const normalized = normalizeAdvisorAlias(r.advisorRaw);
          const res = await dbi.select().from(advisorAliases).where(eq(advisorAliases.aliasNormalized, normalized)).limit(1);
          if (res.length > 0) {
            matchedUserId = (res[0] as any).userId as string;
          }
        } catch {}
      }

      if (!conflictDetected && matchStatus !== 'ambiguous') {
        if (matchedContactId) {
          matchStatus = 'matched';
          matched += 1;
        } else {
          matchStatus = 'unmatched';
        }
      }

      rowsToInsert.push({
        fileId: fileRow.id,
        raw: r.raw,
        accountNumber: r.accountNumber,
        holderName: r.holderName,
        advisorRaw: r.advisorRaw,
        matchedContactId,
        matchedUserId,
        matchStatus,
        conflictDetected,
        isPreferred: !conflictDetected, // Only new non-conflicting rows are preferred by default
        aumDollars: r.aumDollars,
        bolsaArg: r.bolsaArg,
        fondosArg: r.fondosArg,
        bolsaBci: r.bolsaBci,
        pesos: r.pesos,
        mep: r.mep,
        cable: r.cable,
        cv7000: r.cv7000
      });
    }

    // Insert rows in batches (raw SQL for robustness)
    const batchSize = AUM_LIMITS.BATCH_INSERT_SIZE;
    let insertErrors = 0;
    
    try {
      for (let i = 0; i < rowsToInsert.length; i += batchSize) {
        const chunk = rowsToInsert.slice(i, i + batchSize);
        for (const r of chunk) {
          try {
            // AI_DECISION: Implementar UPSERT basado en accountNumber + fileId
            // Justificación: Actualizar filas existentes del mismo archivo en lugar de crear duplicados
            // Impacto: Evita duplicados y mantiene datos actualizados cuando se re-carga el mismo archivo
            
            // Buscar fila existente con mismo accountNumber + fileId
            const existingRow = r.accountNumber 
              ? await dbi.select().from(aumImportRows)
                  .where(and(
                    eq(aumImportRows.fileId, r.fileId),
                    eq(aumImportRows.accountNumber, r.accountNumber)
                  ))
                  .limit(1)
              : [];
            
            if (existingRow.length > 0) {
              // Actualizar fila existente con todos los campos
              // AI_DECISION: Convertir números a string para campos numeric de PostgreSQL
              // Justificación: Drizzle numeric() espera strings para valores numéricos
              // Impacto: Manejo correcto de tipos numéricos en PostgreSQL
              await dbi.update(aumImportRows)
                .set({
                  raw: r.raw,
                  holderName: r.holderName,
                  advisorRaw: r.advisorRaw,
                  matchedContactId: r.matchedContactId,
                  matchedUserId: r.matchedUserId,
                  matchStatus: r.matchStatus,
                  isPreferred: r.isPreferred,
                  conflictDetected: r.conflictDetected,
                  aumDollars: r.aumDollars !== null ? String(r.aumDollars) : null,
                  bolsaArg: r.bolsaArg !== null ? String(r.bolsaArg) : null,
                  fondosArg: r.fondosArg !== null ? String(r.fondosArg) : null,
                  bolsaBci: r.bolsaBci !== null ? String(r.bolsaBci) : null,
                  pesos: r.pesos !== null ? String(r.pesos) : null,
                  mep: r.mep !== null ? String(r.mep) : null,
                  cable: r.cable !== null ? String(r.cable) : null,
                  cv7000: r.cv7000 !== null ? String(r.cv7000) : null
                })
                .where(eq(aumImportRows.id, existingRow[0].id));
            } else {
              // Insertar nueva fila
              // Desmarcar como preferidas las filas previas del mismo broker+account_number
              if (r.accountNumber) {
                await dbi.execute(sql`
                  UPDATE aum_import_rows ar
                  SET is_preferred = false
                  FROM aum_import_files af
                  WHERE ar.file_id = af.id
                    AND af.broker = ${broker}
                    AND ar.account_number = ${r.accountNumber}
                `);
              }

              await dbi.execute(sql`
                INSERT INTO aum_import_rows (
                  file_id, raw, account_number, holder_name, advisor_raw, 
                  matched_contact_id, matched_user_id, match_status, is_preferred, conflict_detected,
                  aum_dollars, bolsa_arg, fondos_arg, bolsa_bci, pesos, mep, cable, cv7000
                )
                VALUES (
                  ${r.fileId}, ${JSON.stringify(r.raw)}::jsonb, ${r.accountNumber}, ${r.holderName}, ${r.advisorRaw}, 
                  ${r.matchedContactId}, ${r.matchedUserId}, ${r.matchStatus}, ${r.isPreferred}, ${r.conflictDetected},
                  ${r.aumDollars !== null ? String(r.aumDollars) : null}, 
                  ${r.bolsaArg !== null ? String(r.bolsaArg) : null}, 
                  ${r.fondosArg !== null ? String(r.fondosArg) : null}, 
                  ${r.bolsaBci !== null ? String(r.bolsaBci) : null}, 
                  ${r.pesos !== null ? String(r.pesos) : null}, 
                  ${r.mep !== null ? String(r.mep) : null}, 
                  ${r.cable !== null ? String(r.cable) : null}, 
                  ${r.cv7000 !== null ? String(r.cv7000) : null}
                )
              `);
            }
          } catch (insertError) {
            insertErrors++;
            req.log?.error?.({ 
              err: insertError, 
              rowIndex: i,
              accountNumber: r.accountNumber,
              fileId: fileRow.id 
            }, 'Error insertando/actualizando fila AUM');
            // Continuar con otras filas aunque esta falle
          }
        }
      }
      
      // Si todas las inserciones fallaron, lanzar error
      if (insertErrors === rowsToInsert.length) {
        throw new Error(`No se pudieron insertar las filas del archivo. Todos los intentos de inserción fallaron.`);
      }
      
      // Si algunas inserciones fallaron, advertir pero continuar
      if (insertErrors > 0) {
        req.log?.warn?.({ 
          insertErrors, 
          totalRows: rowsToInsert.length,
          fileId: fileRow.id 
        }, `Se insertaron ${rowsToInsert.length - insertErrors} de ${rowsToInsert.length} filas`);
      }
    } catch (insertBatchError) {
      req.log?.error?.({ err: insertBatchError, fileId: fileRow.id }, 'Error crítico al insertar filas AUM');
      // Limpiar archivo temporal en caso de error crítico
      try {
        await fs.unlink(file.path);
      } catch {
        // Ignorar error al eliminar archivo temporal
      }
      return res.status(500).json({ 
        error: 'Error al guardar los datos del archivo',
        details: insertBatchError instanceof Error ? insertBatchError.message : String(insertBatchError)
      });
    }

    // Calcular totales basados en filas insertadas exitosamente
    const successfullyInserted = rowsToInsert.length - insertErrors;
    
    req.log?.info?.({ 
      fileId: fileRow.id,
      filename: file.originalname,
      totals: {
        parsed: successfullyInserted,
        matched,
        ambiguous,
        conflicts: conflictsDetected,
        unmatched: successfullyInserted - matched - ambiguous,
        insertErrors
      }
    }, 'AUM upload completado - resumen');
    
    // Update file totals
    await dbi.execute(sql`
      UPDATE aum_import_files
      SET status = 'parsed',
          total_parsed = ${successfullyInserted},
          total_matched = ${matched},
          total_unmatched = ${successfullyInserted - matched - ambiguous}
      WHERE id = ${fileRow.id}
    `);

    return res.status(201).json({
      ok: true,
      fileId: fileRow.id,
      filename: file.originalname,
      totals: {
        parsed: successfullyInserted,
        matched,
        ambiguous,
        conflicts: conflictsDetected,
        unmatched: successfullyInserted - matched - ambiguous
      },
      ...(insertErrors > 0 && { 
        warnings: [`Se procesaron ${successfullyInserted} de ${rowsToInsert.length} filas. ${insertErrors} filas no pudieron ser insertadas.`] 
      })
    });
  } catch (error) {
    req.log?.error?.({ err: error }, 'AUM upload failed');
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// GET /admin/aum/uploads/:fileId/preview
router.get('/uploads/:fileId/preview', 
  requireAuth,
  validate({ params: fileIdParamsSchema, query: previewQuerySchema }),
  async (req, res) => {
  try {
    const { fileId } = req.params; // Validated UUID
    const { limit = 50 } = req.query; // Validated number, min 1, max 500
    const userId = req.user?.id as string;
    const userRole = req.user?.role as 'admin' | 'manager' | 'advisor';
    
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user has access to this file
    const hasAccess = await canAccessAumFile(userId, userRole, fileId);
    if (!hasAccess) {
      return res.status(404).json({ error: 'File not found' });
    }
    const dbi = db();
    const [file] = await dbi.select().from(aumImportFiles).where(eq(aumImportFiles.id, fileId)).limit(1);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    const rows = await dbi.select().from(aumImportRows)
      .where(eq(aumImportRows.fileId, fileId))
      .limit(limit as number);

    return res.json({
      ok: true,
      file: {
        id: file.id,
        broker: file.broker,
        originalFilename: file.originalFilename,
        status: file.status,
        totals: {
          parsed: file.totalParsed,
          matched: file.totalMatched,
          unmatched: file.totalUnmatched
        },
        createdAt: file.createdAt
      },
      rows
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// GET /admin/aum/uploads/history
router.get('/uploads/history', 
  requireAuth,
  validate({ query: historyQuerySchema }),
  async (req, res) => {
  try {
    const { limit = 50 } = req.query; // Validated number, min 1, max 200
    const userId = (req as any).user?.id as string;
    const userRole = (req as any).user?.role as string;
    
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const dbi = db();

    // Filter files based on user role and access scope
    let whereClause;
    if (userRole === 'admin') {
      // Admin can see all files
      whereClause = undefined; // No filter
    } else if (userRole === 'advisor') {
      // Advisor can only see their own files
      whereClause = eq(aumImportFiles.uploadedByUserId, userId);
    } else if (userRole === 'manager') {
      // Manager can see files from themselves and their team members
      const accessScope = await getUserAccessScope(userId, userRole);
      const accessibleUserIds = [...new Set([...accessScope.accessibleAdvisorIds, userId])];
      whereClause = inArray(aumImportFiles.uploadedByUserId, accessibleUserIds);
    } else {
      // Unknown role - no access
      return res.json({ ok: true, files: [] });
    }

    try {
      const rows = whereClause
        ? await dbi.select().from(aumImportFiles).where(whereClause).limit(limit as number)
        : await dbi.select().from(aumImportFiles).limit(limit as number);

      return res.json({ ok: true, files: rows });
    } catch (error: unknown) {
      // Si la tabla aún no existe (migración no aplicada en este DB), devolver lista vacía
      type PostgresError = {
        code?: string;
      };
      const pgError = error as PostgresError;
      if (pgError?.code === '42P01') {
    (req as Request & { log?: { warn?: (context: unknown, message: string) => void } }).log?.warn?.({ err: error }, 'AUM history table missing - returning empty list');
        return res.json({ ok: true, files: [] });
      }
      throw error;
    }
  } catch (error) {
    req.log?.error?.({ err: error }, 'AUM history failed');
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// POST /admin/aum/uploads/:fileId/match
router.post('/uploads/:fileId/match', 
  requireAuth,
  validate({ 
    params: fileIdParamsSchema, 
    body: matchRowBodySchema 
  }),
  async (req, res) => {
  try {
    const { fileId } = req.params; // Validated UUID
    const { rowId, matchedContactId, matchedUserId } = req.body; // Validated schema
    const userId = req.user?.id as string;
    const userRole = req.user?.role as 'admin' | 'manager' | 'advisor';
    
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user has access to this file
    const hasAccess = await canAccessAumFile(userId, userRole, fileId);
    if (!hasAccess) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Support isPreferred from body if provided (for backward compatibility)
    const isPreferred = (req.body as any).isPreferred;

    const dbi = db();
    // Ensure file exists
    const [file] = await dbi.select().from(aumImportFiles).where(eq(aumImportFiles.id, fileId)).limit(1);
    if (!file) return res.status(404).json({ error: 'File not found' });

    // AI_DECISION: Usar Drizzle query builder en lugar de Pool manual
    // Justificación: Más seguro, tipado, y usa el pool existente de Drizzle
    // Impacto: Código más limpio y sin duplicación de conexiones
    // Compute new match status: matched if we have a contact, otherwise unmatched
    const newStatus: 'matched' | 'ambiguous' | 'unmatched' = matchedContactId ? 'matched' : 'unmatched';

    // If setting this row as preferred, unset others for the same account_number within the same file
    if (isPreferred === true) {
      // First, fetch the target row to know its account_number
      const [targetRow] = await dbi.select({ accountNumber: aumImportRows.accountNumber })
        .from(aumImportRows)
        .where(and(eq(aumImportRows.id, rowId), eq(aumImportRows.fileId, fileId)))
        .limit(1);
      const accountNumber = (targetRow && (targetRow as any).accountNumber) as string | null;
      if (accountNumber) {
        await dbi.execute(sql`
          UPDATE aum_import_rows
          SET is_preferred = false
          WHERE file_id = ${fileId} AND account_number = ${accountNumber} AND id <> ${rowId}
        `);
      }
    }

    await dbi.update(aumImportRows)
      .set({
        matchedContactId: matchedContactId || null,
        matchedUserId: matchedUserId || null,
        matchStatus: newStatus,
        ...(typeof isPreferred === 'boolean' && { isPreferred })
      })
      .where(and(
        eq(aumImportRows.id, rowId),
        eq(aumImportRows.fileId, fileId)
      ));

    // Recompute file totals
    const totals = await dbi.execute(sql`
      select 
        count(*)::int as total_parsed,
        sum(case when match_status = 'matched' then 1 else 0 end)::int as total_matched,
        sum(case when match_status <> 'matched' then 1 else 0 end)::int as total_unmatched
      from aum_import_rows where file_id = ${fileId}
    `);
    const row = totals.rows[0] as any;
    await dbi.update(aumImportFiles)
      .set({
        totalParsed: row.total_parsed,
        totalMatched: row.total_matched,
        totalUnmatched: row.total_unmatched
      })
      .where(eq(aumImportFiles.id, fileId));

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// GET /admin/aum/rows/all - Get all imported rows with pagination and filters
router.get('/rows/all', 
  requireAuth,
  validate({ query: rowsAllQuerySchema }),
  async (req, res) => {
  try {
    const { limit = 50, offset = 0, broker, status, fileId, preferredOnly = true } = req.query;
    
    const dbi = db();
    
    // Build WHERE conditions
    const conditions: SQL[] = [];
    if (broker) {
      conditions.push(sql`f.broker = ${broker}`);
    }
    if (status) {
      conditions.push(sql`r.match_status = ${status}`);
    }
    if (fileId) {
      conditions.push(sql`r.file_id = ${fileId}`);
    }
    if (preferredOnly) {
      conditions.push(sql`r.is_preferred = true`);
    }
    const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;
    
    // AI_DECISION: Agregar timeout explícito (30s) para queries SQL
    // Justificación: Previene queries colgadas que consumen recursos indefinidamente
    // Impacto: Mejora robustez y permite recuperación de errores de timeout
    const QUERY_TIMEOUT_MS = 30000; // 30 segundos
    
    // Get total count for pagination with timeout
    const countPromise = dbi.execute(sql`
      SELECT COUNT(*) as total
      FROM aum_import_rows r
      INNER JOIN aum_import_files f ON r.file_id = f.id
      ${whereClause}
    `);
    const countTimeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Query timeout: COUNT query exceeded 30s'));
      }, QUERY_TIMEOUT_MS);
    });
    const countResult = await Promise.race([countPromise, countTimeoutPromise]);
    type CountResult = {
      total: string | number;
    };
    const total = Number((countResult.rows?.[0] as CountResult | undefined)?.total || 0);
    
    // Get paginated rows with joined data
    type AumRowResult = {
      id: string;
      file_id: string;
      account_number: string | null;
      holder_name: string | null;
      advisor_raw: string | null;
      matched_contact_id: string | null;
      matched_user_id: string | null;
      match_status: 'matched' | 'ambiguous' | 'unmatched';
      is_preferred: boolean;
      conflict_detected: boolean;
      row_created_at: Date;
      aum_dollars: string | number | null;
      bolsa_arg: string | number | null;
      fondos_arg: string | number | null;
      bolsa_bci: string | number | null;
      pesos: string | number | null;
      mep: string | number | null;
      cable: string | number | null;
      cv7000: string | number | null;
      broker: string;
      original_filename: string;
      file_status: string;
      file_created_at: Date;
      contact_name: string | null;
      contact_first_name: string | null;
      contact_last_name: string | null;
      user_name: string | null;
      user_email: string | null;
      suggested_user_id: string | null;
    };
    
    // Helper function to convert numeric string to number
    const parseNumeric = (value: string | number | null | undefined): number | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'number') return value;
      const parsed = parseFloat(String(value));
      return isNaN(parsed) ? null : parsed;
    };
    
    // AI_DECISION: Optimizar query de advisor aliases usando LEFT JOIN en lugar de query separada
    // Justificación: Reduce número de queries y mejora performance al hacer todo en una sola query
    // Impacto: Mejora tiempo de respuesta y reduce carga en la base de datos
    const rowsPromise = dbi.execute(sql`
      SELECT 
        r.id,
        r.file_id,
        r.account_number,
        r.holder_name,
        r.advisor_raw,
        r.matched_contact_id,
        r.matched_user_id,
        r.match_status,
        r.is_preferred,
        r.conflict_detected,
        r.created_at as row_created_at,
        r.aum_dollars,
        r.bolsa_arg,
        r.fondos_arg,
        r.bolsa_bci,
        r.pesos,
        r.mep,
        r.cable,
        r.cv7000,
        f.id as file_id,
        f.broker,
        f.original_filename,
        f.status as file_status,
        f.created_at as file_created_at,
        c.full_name as contact_name,
        c.first_name as contact_first_name,
        c.last_name as contact_last_name,
        u.full_name as user_name,
        u.email as user_email,
        CASE 
          WHEN r.matched_user_id IS NULL AND r.advisor_raw IS NOT NULL 
          THEN aa.user_id 
          ELSE NULL 
        END as suggested_user_id
      FROM aum_import_rows r
      INNER JOIN aum_import_files f ON r.file_id = f.id
      LEFT JOIN contacts c ON r.matched_contact_id = c.id
      LEFT JOIN users u ON r.matched_user_id = u.id
      LEFT JOIN advisor_aliases aa ON r.matched_user_id IS NULL 
        AND r.advisor_raw IS NOT NULL 
        AND LOWER(TRIM(r.advisor_raw)) = aa.alias_normalized
      ${whereClause}
      ORDER BY f.created_at DESC, r.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    const rowsTimeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Query timeout: SELECT rows query exceeded 30s'));
      }, QUERY_TIMEOUT_MS);
    });
    const result = await Promise.race([rowsPromise, rowsTimeoutPromise]);

    const rows = ((result.rows || []) as AumRowResult[]).map((r: AumRowResult) => ({
      id: r.id,
      fileId: r.file_id,
      accountNumber: r.account_number,
      holderName: r.holder_name,
      advisorRaw: r.advisor_raw,
      matchedContactId: r.matched_contact_id,
      matchedUserId: r.matched_user_id,
      suggestedUserId: r.suggested_user_id || null,
      matchStatus: r.match_status,
      isPreferred: r.is_preferred,
      conflictDetected: r.conflict_detected,
      rowCreatedAt: r.row_created_at,
      aumDollars: parseNumeric(r.aum_dollars),
      bolsaArg: parseNumeric(r.bolsa_arg),
      fondosArg: parseNumeric(r.fondos_arg),
      bolsaBci: parseNumeric(r.bolsa_bci),
      pesos: parseNumeric(r.pesos),
      mep: parseNumeric(r.mep),
      cable: parseNumeric(r.cable),
      cv7000: parseNumeric(r.cv7000),
      file: {
        id: r.file_id,
        broker: r.broker,
        originalFilename: r.original_filename,
        status: r.file_status,
        createdAt: r.file_created_at
      },
      contact: r.matched_contact_id ? {
        id: r.matched_contact_id,
        fullName: r.contact_name,
        firstName: r.contact_first_name,
        lastName: r.contact_last_name
      } : null,
      user: r.matched_user_id ? {
        id: r.matched_user_id,
        name: r.user_name,
        email: r.user_email
      } : null
    }));
    
    return res.json({
      ok: true,
      rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: Number(offset) + rows.length < total
      }
    });
  } catch (error) {
    (req as Request & { log?: { error?: (context: unknown, message: string) => void } }).log?.error?.({ err: error }, 'failed to get all rows');
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// GET /admin/aum/rows/duplicates/:accountNumber - Get all rows with same account number
router.get('/rows/duplicates/:accountNumber', requireAuth, async (req, res) => {
  try {
    const accountNumber = req.params.accountNumber;
    const dbi = db();
    
    const result = await dbi.execute(sql`
      SELECT 
        r.id,
        r.file_id,
        r.account_number,
        r.holder_name,
        r.advisor_raw,
        r.matched_contact_id,
        r.matched_user_id,
        r.match_status,
        r.is_preferred,
        r.conflict_detected,
        r.created_at as row_created_at,
        f.id as file_id,
        f.broker,
        f.original_filename,
        f.created_at as file_created_at,
        c.full_name as contact_name,
        u.first_name || ' ' || u.last_name as user_name
      FROM aum_import_rows r
      INNER JOIN aum_import_files f ON r.file_id = f.id
      LEFT JOIN contacts c ON r.matched_contact_id = c.id
      LEFT JOIN users u ON r.matched_user_id = u.id
      WHERE r.account_number = ${accountNumber}
      ORDER BY f.created_at DESC, r.created_at DESC
    `);
    
    type AumRowResultDuplicate = {
      id: string;
      file_id: string;
      account_number: string | null;
      holder_name: string | null;
      advisor_raw: string | null;
      matched_contact_id: string | null;
      matched_user_id: string | null;
      match_status: string;
      is_preferred: boolean;
      conflict_detected: boolean;
      row_created_at: Date | string;
      broker: string;
      original_filename: string;
      file_created_at: Date | string;
      contact_name: string | null;
      user_name: string | null;
    };
    
    const rows = ((result.rows || []) as AumRowResultDuplicate[]).map((r: AumRowResultDuplicate) => ({
      id: r.id,
      fileId: r.file_id,
      accountNumber: r.account_number,
      holderName: r.holder_name,
      advisorRaw: r.advisor_raw,
      matchedContactId: r.matched_contact_id,
      matchedUserId: r.matched_user_id,
      matchStatus: r.match_status,
      isPreferred: r.is_preferred,
      conflictDetected: r.conflict_detected,
      rowCreatedAt: r.row_created_at,
      file: {
        id: r.file_id,
        broker: r.broker,
        originalFilename: r.original_filename,
        createdAt: r.file_created_at
      },
      contact: r.matched_contact_id ? {
        id: r.matched_contact_id,
        fullName: r.contact_name
      } : null,
      user: r.matched_user_id ? {
        id: r.matched_user_id,
        name: r.user_name
      } : null
    }));
    
    return res.json({
      ok: true,
      accountNumber,
      rows,
      hasConflicts: rows.some(r => r.conflictDetected)
    });
  } catch (error) {
    req.log?.error?.({ err: error, accountNumber: req.params.accountNumber }, 'failed to get duplicates');
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// DELETE /admin/aum/uploads/:fileId
// AI_DECISION: Require admin role for delete operation
// Justificación: Operación destructiva que elimina importaciones, solo admin debe tener acceso
// Impacto: Solo administradores pueden eliminar importaciones
router.delete('/uploads/:fileId', 
  requireAuth, 
  requireRole(['admin']),
  validate({ params: fileIdParamsSchema }),
  async (req, res) => {
  try {
    const { fileId } = req.params; // Validated UUID
    const userId = req.user?.id as string;
    const userRole = req.user?.role as string;
    
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const dbi = db();
    
    // Verify file exists
    const [file] = await dbi.select().from(aumImportFiles).where(eq(aumImportFiles.id, fileId)).limit(1);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Prevent deletion of committed files (safety measure)
    if (file.status === 'committed') {
      return res.status(400).json({ 
        error: 'Cannot delete committed import. Contact administrator if removal is necessary.' 
      });
    }

    // Delete associated rows first (CASCADE should handle this, but being explicit)
    await dbi.delete(aumImportRows).where(eq(aumImportRows.fileId, fileId));

    // Delete the file record
    await dbi.delete(aumImportFiles).where(eq(aumImportFiles.id, fileId));

    // Optionally delete physical file if it exists
    try {
      const filePath = join(uploadDir, file.originalFilename);
      await fs.unlink(filePath).catch(() => {
        // Ignore if file doesn't exist
      });
    } catch {
      // Ignore file system errors
    }

    req.log?.info?.({ 
      fileId, 
      userId, 
      filename: file.originalFilename,
      status: file.status 
    }, 'AUM import file deleted');

    return res.json({ ok: true, message: 'File deleted successfully' });
  } catch (error) {
    req.log?.error?.({ err: error, fileId: req.params.fileId }, 'AUM delete failed');
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// DELETE /admin/aum/uploads (purgar todos)
// AI_DECISION: Añadir endpoint de limpieza para reiniciar staging AUM
// Justificación: Facilita comenzar de cero sin tocar datos comprometidos por defecto
// Impacto: Admin puede vaciar importaciones; opcionalmente incluye committed con force=true
router.delete('/uploads',
  requireAuth,
  requireRole(['admin']),
  validate({ query: purgeQuerySchema.optional() }),
  async (req, res) => {
  try {
    const dbi = db();
    const force = (req.query?.force as unknown as boolean) === true;

    if (force) {
      // Eliminar todas las filas y archivos
      await dbi.execute(sql`DELETE FROM aum_import_rows`);
      await dbi.execute(sql`DELETE FROM aum_import_files`);
      return res.json({ ok: true, message: 'AUM uploads purgados (incluye committed)' });
    }

    // Solo eliminar uploads no comprometidos
    // 1) Borrar filas asociadas a archivos no comprometidos
    await dbi.execute(sql`
      DELETE FROM aum_import_rows r
      USING aum_import_files f
      WHERE r.file_id = f.id AND f.status <> 'committed'
    `);
    // 2) Borrar archivos no comprometidos
    await dbi.execute(sql`DELETE FROM aum_import_files WHERE status <> 'committed'`);

    return res.json({ ok: true, message: 'AUM uploads purgados (solo no committed)' });
  } catch (error) {
    (req as Request & { log?: { error?: (context: unknown, message: string) => void } }).log?.error?.({ err: error }, 'AUM purge failed');
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// DELETE /admin/aum/purge-all (destructivo: broker_* + aum_*)
// AI_DECISION: Endpoint definitivo para dejar el sistema en 0 respecto a AUM/broker
// Justificación: Usuario necesita reiniciar por completo AUM (staging + cuentas broker)
// Impacto: Elimina broker_accounts (con cascade a balances/positions/transactions) y AUM staging
router.delete('/purge-all',
  requireAuth,
  requireRole(['admin']),
  validate({ query: purgeAllQuerySchema.optional() }),
  async (req, res) => {
  try {
    const dbi = db();
    const broker = req.query?.broker as string | undefined;

    if (broker) {
      await dbi.execute(sql`DELETE FROM broker_accounts WHERE broker = ${broker}`);
    } else {
      await dbi.execute(sql`DELETE FROM broker_accounts`);
    }

    await dbi.execute(sql`DELETE FROM aum_import_rows`);
    await dbi.execute(sql`DELETE FROM aum_import_files`);

    return res.json({ ok: true, message: 'Sistema AUM/broker purgado completamente' });
  } catch (error) {
    (req as Request & { log?: { error?: (context: unknown, message: string) => void } }).log?.error?.({ err: error }, 'AUM purge-all failed');
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// POST /admin/aum/advisor-mapping/upload
// AI_DECISION: Endpoint para cargar mapeo estático asesor-cuenta una vez
// Justificación: Permite cargar un archivo con mapeo cuenta->asesor que se aplica a todas las importaciones futuras
// Impacto: Asegura consistencia en asignación de asesores independientemente del archivo mensual cargado
router.post('/advisor-mapping/upload',
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
              details: `Archivo demasiado grande. Tamaño máximo: ${AUM_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB`
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
  async (req: Request, res) => {
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
      }, 'Iniciando procesamiento de mapeo asesor-cuenta');

      const dbi = db();

      // Parsear archivo usando la misma función de parseo
      let parsedRows;
      try {
        await fs.access(file.path);
        parsedRows = await parseFileToRows(file.path, file.originalname);
      } catch (accessError) {
        req.log?.error?.({ err: accessError, filePath: file.path }, 'Archivo no accesible');
        return res.status(400).json({ 
          error: 'Error al procesar el archivo',
          details: 'El archivo subido no está disponible o fue eliminado'
        });
      }

      if (!parsedRows || parsedRows.length === 0) {
        try {
          await fs.unlink(file.path);
        } catch {}
        return res.status(400).json({ 
          error: 'Error al procesar el archivo',
          details: 'El archivo no contiene datos válidos'
        });
      }

      let inserted = 0;
      let updated = 0;
      let errors = 0;

      // Procesar cada fila del archivo
      for (const row of parsedRows) {
        if (!row.accountNumber) {
          errors++;
          continue;
        }

        const normalizedAccountNumber = normalizeAccountNumber(row.accountNumber);
        const advisorName = row.advisorRaw || null;
        const advisorRaw = advisorName ? normalizeAdvisorAlias(advisorName) : null;

        try {
          // Buscar mapeo existente
          const existing = await dbi.select().from(advisorAccountMapping)
            .where(eq(advisorAccountMapping.accountNumber, normalizedAccountNumber))
            .limit(1);

          // Intentar match automático con advisorAliases si tenemos advisorRaw
          let matchedUserId: string | null = null;
          if (advisorRaw) {
            try {
              const advisorMatch = await dbi.select().from(advisorAliases)
                .where(eq(advisorAliases.aliasNormalized, advisorRaw))
                .limit(1);
              if (advisorMatch.length > 0) {
                matchedUserId = (advisorMatch[0] as any).userId as string;
              }
            } catch {}
          }

          if (existing.length > 0) {
            // Actualizar mapeo existente
            await dbi.update(advisorAccountMapping)
              .set({
                advisorName: advisorName,
                advisorRaw: advisorRaw,
                matchedUserId: matchedUserId,
                updatedAt: new Date()
              })
              .where(eq(advisorAccountMapping.accountNumber, normalizedAccountNumber));
            updated++;
          } else {
            // Insertar nuevo mapeo
            await dbi.insert(advisorAccountMapping).values({
              accountNumber: normalizedAccountNumber,
              advisorName: advisorName,
              advisorRaw: advisorRaw,
              matchedUserId: matchedUserId
            });
            inserted++;
          }
        } catch (error) {
          errors++;
          req.log?.error?.({ 
            err: error, 
            accountNumber: normalizedAccountNumber,
            filename: file.originalname 
          }, 'Error procesando fila de mapeo asesor');
        }
      }

      // Limpiar archivo temporal
      try {
        await fs.unlink(file.path);
      } catch {}

      return res.status(201).json({
        ok: true,
        message: 'Mapeo de asesores cargado exitosamente',
        totals: {
          inserted,
          updated,
          errors,
          total: parsedRows.length
        }
      });
    } catch (error) {
      req.log?.error?.({ err: error }, 'AUM advisor mapping upload failed');
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
);

export default router;
