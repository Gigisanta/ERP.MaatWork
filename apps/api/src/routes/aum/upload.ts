/**
 * AUM Upload Routes
 * 
 * AI_DECISION: Modularizar endpoints de upload en archivo separado
 * Justificación: Separar responsabilidades, facilitar mantenimiento y testing
 * Impacto: Código más organizado y mantenible
 */

import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { extname, join } from 'node:path';
import { promises as fs } from 'node:fs';
import { db, aumImportFiles, aumImportRows, teams, teamMembership, advisorAccountMapping, advisorAliases, brokerAccounts, contacts, users } from '@cactus/db';
import { eq, sql, inArray } from 'drizzle-orm';
import { requireAuth, requireRole } from '../../auth/middlewares';
import { canAccessAumFile, getUserAccessScope } from '../../auth/authorization';
import { validate } from '../../utils/validation';
import { AUM_LIMITS } from '../../config/aum-limits';
import { createErrorResponse } from '../../utils/error-response';
import { normalizeAccountNumber, normalizeAdvisorAlias } from '../../utils/aum-normalization';
import { parseAumFile } from '../../services/aumParser';
import { matchContactByAccountNumber, matchContactByHolderName, matchAdvisor } from '../../services/aumMatcher';
import { 
  upsertAumRows, 
  applyAdvisorAccountMapping, 
  type AumRowInsert,
  upsertAumMonthlySnapshots,
  type AumMonthlySnapshotInsert
} from '../../services/aumUpsert';
import { inheritAdvisorFromExisting, shouldFlagConflict, type ExistingAumAccountSnapshot } from '../../services/aumConflictResolution';
import { detectAumFileMetadata } from '../../utils/aum-file-detection';
import {
  aumFileIdParamsSchema,
  aumUploadQuerySchema,
  aumPreviewQuerySchema,
  aumHistoryQuerySchema,
  aumExportQuerySchema
} from '../../utils/aum-validation';

const router = Router();

// ==========================================================
// File Upload Configuration
// ==========================================================

const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

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

const upload = multer({
  storage,
  limits: {
    fileSize: AUM_LIMITS.MAX_FILE_SIZE
  }
});

// Helper function to check if value looks like email
function isEmailLike(value: string | null | undefined): boolean {
  if (!value) return false;
  return /@/.test(value);
}

// ==========================================================
// Routes
// ==========================================================

/**
 * POST /admin/aum/uploads
 * Upload and parse AUM file
 */
router.post('/uploads',
  requireAuth,
  requireRole(['admin']),
  validate({ query: aumUploadQuerySchema }),
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
  async (req: Request, res: Response) => {
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

      const { 
        broker = 'balanz',
        reportMonth: manualReportMonth,
        reportYear: manualReportYear,
        fileType: manualFileType
      } = req.query as { 
        broker?: string;
        reportMonth?: number;
        reportYear?: number;
        fileType?: 'master' | 'monthly';
      };

      const dbi = db();

      // AI_DECISION: Detectar tipo de archivo y período mensual
      // Justificación: Permite identificar archivos master vs mensuales y preservar historial
      // Impacto: Habilita preservación de valores históricos mensuales
      const fileMetadata = detectAumFileMetadata(
        file.originalname,
        manualFileType,
        manualReportMonth,
        manualReportYear
      );

      // Consolidar metadata en mensaje más conciso
      const periodStr = fileMetadata.reportMonth && fileMetadata.reportYear 
        ? `${fileMetadata.reportMonth}/${fileMetadata.reportYear}` 
        : 'N/A';
      req.log?.info?.({
        filename: file.originalname,
        fileType: fileMetadata.fileType,
        period: periodStr
      }, `File type: ${fileMetadata.fileType}, Period: ${periodStr}`);

      // Create file record
      const [fileRow] = await dbi.insert(aumImportFiles).values({
        broker: broker as string,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedByUserId: userId,
        status: 'uploaded',
        totalParsed: 0,
        totalMatched: 0,
        totalUnmatched: 0,
        fileType: fileMetadata.fileType,
        reportMonth: fileMetadata.reportMonth,
        reportYear: fileMetadata.reportYear
      }).returning();

      // Parse file using service
      const parseResult = await parseAumFile(file.path, file.originalname);

      if (!parseResult.success || !parseResult.data) {
        // Cleanup temp file
        try {
          await fs.unlink(file.path);
        } catch {}

        return res.status(400).json({
          error: 'Error al procesar el archivo',
          details: parseResult.error || parseResult.details || 'Error desconocido'
        });
      }

      const parsedRows = parseResult.data;

      // AI_DECISION: Validación post-parseo para verificar integridad de datos
      // Justificación: Detecta problemas de mapeo y datos inválidos antes de procesar
      // Impacto: Mejor diagnóstico y prevención de errores en la carga de datos
      const validationStats = {
        rowsWithIdCuenta: 0,
        rowsWithComitente: 0,
        rowsWithHolderName: 0,
        rowsWithAdvisor: 0,
        rowsWithFinancialData: 0,
        rowsWithInvalidFinancialData: 0,
        rowsMissingIdentifiers: 0
      };

      const validationErrors: string[] = [];
      const validationWarnings: string[] = [];

      for (let i = 0; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        
        // Contar campos presentes
        if (row.idCuenta) validationStats.rowsWithIdCuenta++;
        if (row.accountNumber) validationStats.rowsWithComitente++;
        if (row.holderName) validationStats.rowsWithHolderName++;
        if (row.advisorRaw) validationStats.rowsWithAdvisor++;
        
        // Validar que tenga al menos un identificador
        if (!row.idCuenta && !row.accountNumber) {
          validationStats.rowsMissingIdentifiers++;
          if (i < 10) { // Solo reportar primeros 10 para no saturar logs
            validationWarnings.push(`Fila ${i + 1}: Sin identificador (idCuenta o comitente)`);
          }
        }
        
        // Validar valores financieros
        const financialFields = [
          { name: 'aumDollars', value: row.aumDollars },
          { name: 'bolsaArg', value: row.bolsaArg },
          { name: 'fondosArg', value: row.fondosArg },
          { name: 'bolsaBci', value: row.bolsaBci },
          { name: 'pesos', value: row.pesos },
          { name: 'mep', value: row.mep },
          { name: 'cable', value: row.cable },
          { name: 'cv7000', value: row.cv7000 }
        ];
        
        let hasFinancialData = false;
        for (const field of financialFields) {
          if (field.value !== null && field.value !== undefined) {
            hasFinancialData = true;
            // Validar que sea un número válido (no NaN, no Infinity)
            if (typeof field.value === 'number' && (!isFinite(field.value) || isNaN(field.value))) {
              validationStats.rowsWithInvalidFinancialData++;
              if (validationStats.rowsWithInvalidFinancialData <= 10) {
                validationErrors.push(`Fila ${i + 1}: Valor inválido en ${field.name}: ${field.value}`);
              }
            }
          }
        }
        
        if (hasFinancialData) {
          validationStats.rowsWithFinancialData++;
        }
      }

      // Resumir validación en porcentajes
      // AI_DECISION: Calcular porcentaje de filas con al menos un identificador, no la suma de ambos
      // Justificación: Una fila puede tener ambos identificadores, sumarlos daría porcentajes >100%
      // Impacto: Los porcentajes de validación ahora reflejan correctamente el porcentaje de filas con identificadores
      const rowsWithAtLeastOneIdentifier = parsedRows.length - validationStats.rowsMissingIdentifiers;
      const pctWithIdentifiers = parsedRows.length > 0 
        ? Math.round((rowsWithAtLeastOneIdentifier / parsedRows.length) * 100)
        : 0;
      const pctWithFinancialData = parsedRows.length > 0
        ? Math.round((validationStats.rowsWithFinancialData / parsedRows.length) * 100)
        : 0;
      req.log?.info?.({
        fileId: fileRow.id,
        totalRows: parsedRows.length,
        rowsWithIdCuenta: validationStats.rowsWithIdCuenta,
        rowsWithComitente: validationStats.rowsWithComitente,
        rowsWithAtLeastOneIdentifier,
        rowsMissingIdentifiers: validationStats.rowsMissingIdentifiers,
        rowsWithFinancialData: validationStats.rowsWithFinancialData,
        pctWithIdentifiers,
        pctWithFinancialData
      }, `Validation: ${pctWithIdentifiers}% with identifiers, ${pctWithFinancialData}% with financial data`);

      // Reportar errores críticos (pero no bloquear el proceso si hay datos válidos)
      if (validationErrors.length > 0 && validationStats.rowsWithInvalidFinancialData > parsedRows.length * 0.1) {
        // Si más del 10% de las filas tienen datos financieros inválidos, es un problema serio
        const ratio = Math.round((validationStats.rowsWithInvalidFinancialData / parsedRows.length) * 100);
        req.log?.warn?.({
          fileId: fileRow.id,
          errors: validationErrors.slice(0, 3), // Solo primeros 3 ejemplos
          totalErrors: validationErrors.length
        }, `${validationErrors.length} error(s) found (${ratio}% invalid financial data, showing first 3)`);
      }

      if (validationWarnings.length > 0) {
        req.log?.warn?.({
          fileId: fileRow.id,
          warnings: validationWarnings.slice(0, 3), // Solo primeros 3 ejemplos
          totalWarnings: validationWarnings.length,
          missingIdentifiers: validationStats.rowsMissingIdentifiers
        }, `${validationWarnings.length} warning(s) found (${validationStats.rowsMissingIdentifiers} missing identifiers, showing first 3)`);
      }

      // Get existing rows for duplicate detection
      // AI_DECISION: Incluir filas con solo holderName para preservar asesor en actualizaciones
      // Justificación: Cuando el segundo CSV no tiene columna de asesor, necesitamos heredar el asesor de filas existentes incluso si solo tienen holderName
      // Impacto: Preserva la sincronización del asesor durante actualizaciones
      const existingAccounts = new Map<string, ExistingAumAccountSnapshot[]>();
      const existingHolderNames = new Map<string, ExistingAumAccountSnapshot[]>();

      try {
        // Obtener filas con accountNumber para matching por cuenta
        // AI_DECISION: Incluir también idCuenta en el mapa para matching cuando CSV2 tiene accountNumber pero CSV1 solo tenía idCuenta
        // Justificación: Mejora la preservación de asesores cuando CSV2 agrega accountNumber a filas que antes solo tenían idCuenta
        // Impacto: Asegura que se encuentren todas las filas relacionadas para preservar el asesor correctamente
        const existingResult = await dbi.execute(sql`
          SELECT r.account_number, r.id_cuenta, r.holder_name, r.advisor_raw, r.file_id, r.created_at
          FROM aum_import_rows r
          INNER JOIN aum_import_files f ON r.file_id = f.id
          WHERE (r.account_number IS NOT NULL OR r.id_cuenta IS NOT NULL)
            AND f.broker = ${broker as string}
        `);
        (existingResult.rows || []).forEach((row: any) => {
          // Agregar por accountNumber si existe
          if (row.account_number) {
            const normalizedAccount = normalizeAccountNumber(row.account_number);
            if (!existingAccounts.has(normalizedAccount)) {
              existingAccounts.set(normalizedAccount, []);
            }
            existingAccounts.get(normalizedAccount)!.push({
              holderName: row.holder_name ?? null,
              advisorRaw: row.advisor_raw ?? null,
              createdAt: row.created_at
            });
          }
          // También agregar por idCuenta si existe (para matching cuando CSV2 tiene accountNumber pero CSV1 solo tenía idCuenta)
          if (row.id_cuenta && row.id_cuenta.trim().length > 0) {
            const normalizedIdCuenta = row.id_cuenta.trim();
            if (!existingAccounts.has(normalizedIdCuenta)) {
              existingAccounts.set(normalizedIdCuenta, []);
            }
            existingAccounts.get(normalizedIdCuenta)!.push({
              holderName: row.holder_name ?? null,
              advisorRaw: row.advisor_raw ?? null,
              createdAt: row.created_at
            });
          }
        });

        // Obtener filas con solo holderName (sin accountNumber ni idCuenta) para matching por nombre
        const existingHolderResult = await dbi.execute(sql`
          SELECT r.holder_name, r.advisor_raw, r.file_id, r.created_at
          FROM aum_import_rows r
          INNER JOIN aum_import_files f ON r.file_id = f.id
          WHERE r.holder_name IS NOT NULL
            AND (r.account_number IS NULL OR r.account_number = '')
            AND (r.id_cuenta IS NULL OR r.id_cuenta = '')
            AND f.broker = ${broker as string}
        `);
        (existingHolderResult.rows || []).forEach((row: any) => {
          const normalizedName = row.holder_name?.toLowerCase().trim();
          if (normalizedName) {
            if (!existingHolderNames.has(normalizedName)) {
              existingHolderNames.set(normalizedName, []);
            }
            existingHolderNames.get(normalizedName)!.push({
              holderName: row.holder_name ?? null,
              advisorRaw: row.advisor_raw ?? null,
              createdAt: row.created_at
            });
          }
        });
      } catch {}

      // Process rows: match contacts and advisors
      const rowsToInsert: AumRowInsert[] = [];
      let matched = 0;
      let ambiguous = 0;
      let conflictsDetected = 0;

      for (const r of parsedRows) {
        let matchedContactId: string | null = null;
        let matchedUserId: string | null = null;
        let matchStatus: 'matched' | 'ambiguous' | 'unmatched' = 'unmatched';
        let conflictDetected = false;

        // Normalize account number
        const normalizedAccountNumber = r.accountNumber ? normalizeAccountNumber(r.accountNumber) : null;

        // Apply advisor mapping if account number exists
        if (normalizedAccountNumber) {
          const mapping = await applyAdvisorAccountMapping(normalizedAccountNumber);
          if (mapping.matchedUserId) {
            matchedUserId = mapping.matchedUserId;
          }
          if (mapping.advisorRaw) {
            r.advisorRaw = mapping.advisorRaw;
          }
        }

        const originalAdvisorRaw = r.advisorRaw ?? null;

        // Check for duplicates and inherit advisor when needed
        // AI_DECISION: Buscar en existingAccounts primero (por accountNumber/idCuenta), luego en existingHolderNames (por holderName)
        // Justificación: Preservar asesor tanto para filas con identificadores como para filas que solo tienen holderName
        // Impacto: Mantiene sincronización del asesor durante actualizaciones desde segundo CSV sin columna de asesor
        // Nota: Si CSV2 tiene accountNumber pero CSV1 solo tenía holderName o idCuenta, buscamos por todos los métodos para heredar el asesor
        let existingRowsForInheritance: ExistingAumAccountSnapshot[] = [];
        
        // Buscar por accountNumber normalizado
        if (normalizedAccountNumber && existingAccounts.has(normalizedAccountNumber)) {
          existingRowsForInheritance = existingAccounts.get(normalizedAccountNumber)!;
          const hasConflict = shouldFlagConflict(existingRowsForInheritance, r.holderName ?? null, originalAdvisorRaw);
          if (hasConflict) {
            matchStatus = 'ambiguous';
            conflictDetected = true;
            conflictsDetected += 1;
            ambiguous += 1;
          }
        }
        
        // También buscar por idCuenta si existe (puede que CSV2 tenga accountNumber pero CSV1 solo tenía idCuenta)
        if (r.idCuenta && r.idCuenta.trim().length > 0 && existingAccounts.has(r.idCuenta.trim())) {
          const idCuentaRows = existingAccounts.get(r.idCuenta.trim())!;
          if (existingRowsForInheritance.length > 0) {
            existingRowsForInheritance = [...existingRowsForInheritance, ...idCuentaRows];
          } else {
            existingRowsForInheritance = idCuentaRows;
          }
        }
        
        // Si no encontramos por accountNumber/idCuenta O si el CSV actual no trae asesor, buscar también por holderName
        // Esto cubre el caso donde CSV2 tiene accountNumber pero CSV1 solo tenía holderName
        if (r.holderName && (!originalAdvisorRaw || originalAdvisorRaw.trim().length === 0)) {
          const normalizedHolderName = r.holderName.toLowerCase().trim();
          if (normalizedHolderName && existingHolderNames.has(normalizedHolderName)) {
            const holderNameRows = existingHolderNames.get(normalizedHolderName)!;
            // Si ya tenemos filas por accountNumber/idCuenta, combinarlas con las de holderName
            // Si no, usar solo las de holderName
            if (existingRowsForInheritance.length > 0) {
              existingRowsForInheritance = [...existingRowsForInheritance, ...holderNameRows];
            } else {
              existingRowsForInheritance = holderNameRows;
            }
          }
        }

        // Heredar asesor de filas existentes si el CSV actual no lo trae
        const resolvedAdvisor = inheritAdvisorFromExisting(originalAdvisorRaw, existingRowsForInheritance);
        r.advisorRaw = resolvedAdvisor;

        // Match contact by account number
        if (!matchedContactId && !conflictDetected && normalizedAccountNumber) {
          const contactMatch = await matchContactByAccountNumber(broker as string, normalizedAccountNumber);
          if (contactMatch) {
            matchedContactId = contactMatch.contactId;
          }
        }

        // Match contact by holder name if still unmatched
        if (!matchedContactId && !conflictDetected && r.holderName) {
          const contactMatch = await matchContactByHolderName(r.holderName);
          if (contactMatch) {
            matchedContactId = contactMatch.contactId;
          }
        }

        // Match advisor
        if (!matchedUserId && r.advisorRaw) {
          const advisorMatch = await matchAdvisor(r.advisorRaw);
          if (advisorMatch) {
            matchedUserId = advisorMatch.userId;
          }
        }

        // Determine match status
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
          accountNumber: normalizedAccountNumber,
          holderName: r.holderName,
          idCuenta: r.idCuenta ?? null,
          advisorRaw: r.advisorRaw,
          matchedContactId,
          matchedUserId,
          matchStatus,
          conflictDetected,
          isPreferred: !conflictDetected,
          aumDollars: r.aumDollars,
          bolsaArg: r.bolsaArg,
          fondosArg: r.fondosArg,
          bolsaBci: r.bolsaBci,
          pesos: r.pesos,
          mep: r.mep,
          cable: r.cable,
          cv7000: r.cv7000
        });

        if (normalizedAccountNumber) {
          if (!existingAccounts.has(normalizedAccountNumber)) {
            existingAccounts.set(normalizedAccountNumber, []);
          }
          existingAccounts.get(normalizedAccountNumber)!.push({
            holderName: r.holderName ?? null,
            advisorRaw: r.advisorRaw ?? null,
            createdAt: new Date()
          });
        }
      }

      // Upsert rows using service
      const upsertResult = await upsertAumRows(rowsToInsert, broker as string);

      if (!upsertResult.success) {
        // Cleanup temp file
        try {
          await fs.unlink(file.path);
        } catch {}

        return res.status(500).json({
          error: 'Error al guardar los datos del archivo',
          details: upsertResult.error || 'Error desconocido'
        });
      }

      // AI_DECISION: Crear snapshots mensuales para archivos mensuales
      // Justificación: Preserva historial mensual de valores financieros sin sobrescribir meses anteriores
      // Impacto: Habilita análisis temporal y comparación de AUM entre meses
      let monthlySnapshotsResult: { success: boolean; stats: { inserted: number; updated: number; errors: number } } | null = null;
      
      if (fileMetadata.fileType === 'monthly' && fileMetadata.reportMonth && fileMetadata.reportYear) {
        const snapshotsToInsert: AumMonthlySnapshotInsert[] = rowsToInsert
          .filter(row => row.accountNumber || row.idCuenta) // Solo filas con identificador válido
          .map(row => ({
            fileId: fileRow.id,
            accountNumber: row.accountNumber,
            idCuenta: row.idCuenta,
            reportMonth: fileMetadata.reportMonth!,
            reportYear: fileMetadata.reportYear!,
            aumDollars: row.aumDollars,
            bolsaArg: row.bolsaArg,
            fondosArg: row.fondosArg,
            bolsaBci: row.bolsaBci,
            pesos: row.pesos,
            mep: row.mep,
            cable: row.cable,
            cv7000: row.cv7000
          }));

        if (snapshotsToInsert.length > 0) {
          monthlySnapshotsResult = await upsertAumMonthlySnapshots(snapshotsToInsert);
          
          const { inserted, updated, errors } = monthlySnapshotsResult.stats;
          req.log?.info?.({
            fileId: fileRow.id
          }, `Snapshots: ${inserted} created, ${updated} updated${errors > 0 ? `, ${errors} errors` : ''}`);
        }
      }

      const actualCount = upsertResult.stats.inserted + upsertResult.stats.updated;

      const totalsQuery = await dbi.execute(sql`
        SELECT 
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE match_status = 'matched')::int AS matched,
          COUNT(*) FILTER (WHERE match_status = 'ambiguous')::int AS ambiguous,
          COUNT(*) FILTER (WHERE conflict_detected)::int AS conflicts
        FROM aum_import_rows
        WHERE file_id = ${fileRow.id}
      `);

      const totalsRow = totalsQuery.rows?.[0] as {
        total?: number | string;
        matched?: number | string;
        ambiguous?: number | string;
        conflicts?: number | string;
      } | undefined;

      const totalParsed = totalsRow?.total !== undefined ? Number(totalsRow.total) : actualCount;
      const matchedRows = totalsRow?.matched !== undefined ? Number(totalsRow.matched) : matched;
      const ambiguousRows = totalsRow?.ambiguous !== undefined ? Number(totalsRow.ambiguous) : ambiguous;
      const conflictRows = totalsRow?.conflicts !== undefined ? Number(totalsRow.conflicts) : conflictsDetected;
      const unmatchedRows = Math.max(totalParsed - matchedRows - ambiguousRows, 0);

      await dbi.execute(sql`
        UPDATE aum_import_files
        SET status = 'parsed',
            total_parsed = ${totalParsed},
            total_matched = ${matchedRows},
            total_unmatched = ${unmatchedRows}
        WHERE id = ${fileRow.id}
      `);

      // Consolidar información en mensaje más legible
      const snapshotsMsg = monthlySnapshotsResult 
        ? `, snapshots: ${monthlySnapshotsResult.stats.inserted}+${monthlySnapshotsResult.stats.updated}`
        : '';
      req.log?.info?.({
        fileId: fileRow.id,
        filename: file.originalname
      }, `Upload complete: ${upsertResult.stats.inserted} inserted, ${upsertResult.stats.updated} updated, ${matchedRows} matched, ${unmatchedRows} unmatched${snapshotsMsg}`);

      return res.status(201).json({
        ok: true,
        fileId: fileRow.id,
        filename: file.originalname,
        fileType: fileMetadata.fileType,
        reportMonth: fileMetadata.reportMonth,
        reportYear: fileMetadata.reportYear,
        totals: {
          parsed: totalParsed,
          matched: matchedRows,
          ambiguous: ambiguousRows,
          conflicts: conflictRows,
          unmatched: unmatchedRows,
          inserts: upsertResult.stats.inserted,
          updates: upsertResult.stats.updated,
          monthlySnapshots: monthlySnapshotsResult ? {
            inserted: monthlySnapshotsResult.stats.inserted,
            updated: monthlySnapshotsResult.stats.updated,
            errors: monthlySnapshotsResult.stats.errors
          } : null
        }
      });
    } catch (error) {
      req.log?.error?.({ err: error }, 'AUM upload failed');
      return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  }
);

/**
 * GET /admin/aum/uploads/:fileId/preview
 * Preview rows from uploaded file
 */
router.get('/uploads/:fileId/preview',
  requireAuth,
  validate({ params: aumFileIdParamsSchema, query: aumPreviewQuerySchema }),
  async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;
      const { limit = 50 } = req.query as { limit?: number };
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
        .limit(limit);

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
      req.log?.error?.({ err: error }, 'AUM preview failed');
      return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  }
);

/**
 * GET /admin/aum/uploads/history
 * Get upload history
 */
router.get('/uploads/history',
  requireAuth,
  validate({ query: aumHistoryQuerySchema }),
  async (req: Request, res: Response) => {
    try {
      const { limit = 50 } = req.query as { limit?: number };
      const userId = (req as any).user?.id as string;
      const userRole = (req as any).user?.role as string;

      if (!userId || !userRole) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const dbi = db();

      // Filter files based on user role and access scope
      let whereClause;
      if (userRole === 'admin') {
        whereClause = undefined; // No filter
      } else if (userRole === 'advisor') {
        whereClause = eq(aumImportFiles.uploadedByUserId, userId);
      } else if (userRole === 'manager') {
        const accessScope = await getUserAccessScope(userId, userRole);
        const accessibleUserIds = [...new Set([...accessScope.accessibleAdvisorIds, userId])];
        whereClause = inArray(aumImportFiles.uploadedByUserId, accessibleUserIds);
      } else {
        return res.json({ ok: true, files: [] });
      }

      try {
        const rows = whereClause
          ? await dbi.select().from(aumImportFiles).where(whereClause).limit(limit)
          : await dbi.select().from(aumImportFiles).limit(limit);

        return res.json({ ok: true, files: rows });
      } catch (error: unknown) {
        // If table doesn't exist (migration not applied), return empty list
        type PostgresError = {
          code?: string;
        };
        const pgError = error as PostgresError;
        if (pgError?.code === '42P01') {
          req.log?.warn?.({ err: error }, 'AUM history table missing - returning empty list');
          return res.json({ ok: true, files: [] });
        }
        throw error;
      }
    } catch (error) {
      req.log?.error?.({ err: error }, 'AUM history failed');
      return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  }
);

/**
 * GET /admin/aum/uploads/:fileId/export
 * Export rows from uploaded file as CSV
 */
router.get('/uploads/:fileId/export',
  requireAuth,
  validate({ params: aumFileIdParamsSchema, query: aumExportQuerySchema }),
  async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;
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
      const contactIdSet = new Set<string>();
      rows.forEach((r: any) => {
        if (r.matchedContactId) contactIdSet.add(r.matchedContactId);
      });
      const contactIds = Array.from(contactIdSet);
      const contactMap = new Map<string, string>();
      if (contactIds.length > 0) {
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
      req.log?.error?.({ err: error }, 'AUM export failed');
      return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  }
);

export default router;

