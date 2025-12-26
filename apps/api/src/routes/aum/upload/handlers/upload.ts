/**
 * Handler principal para upload de archivos AUM
 *
 * AI_DECISION: Extraer handler de upload a módulo separado
 * Justificación: El handler de upload es complejo y merece su propio archivo
 * Impacto: Código más organizado y mantenible
 *
 * AI_DECISION: Migrado a createAsyncHandler para status 201 y manejo automático de errores
 * Justificación: Necesita status 201 para creación de recursos, manejo de errores centralizado
 * Impacto: Código más limpio, mejor logging de errores, requestId automático
 */

import type { Request, Response } from 'express';
import { createAsyncHandler, HttpError } from '@/utils/route-handler';
import { promises as fs } from 'node:fs';
import { db, aumImportFiles, aumImportRows } from '@maatwork/db';
import { sql } from 'drizzle-orm';
import { normalizeAccountNumber } from '../../../../utils/aum/aum-normalization';
import { parseAumFile } from '@/services/aum-parser';
import {
  matchContactByAccountNumber,
  matchContactByHolderName,
  matchAdvisor,
  applyAdvisorAccountMapping,
} from '@/services/aum';
import {
  upsertAumRows,
  type AumRowInsert,
  upsertAumMonthlySnapshots,
  type AumMonthlySnapshotInsert,
} from '@/services/aum';
import {
  inheritAdvisorFromExisting,
  inheritMatchedUserIdFromExisting,
  shouldFlagConflict,
  type ExistingAumAccountSnapshot,
} from '@/services/aum-conflict-resolution';
import { detectAumFileMetadata } from '../../../../utils/aum/aum-file-detection';
import { validateParsedRows, calculateValidationPercentages } from '../validation';
import type { TotalsRow } from '../types';

/**
 * POST /admin/aum/uploads
 * Upload and parse AUM file
 *
 * Query params están validados por middleware validate() con aumUploadQuerySchema
 */
export const handleUpload = createAsyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id as string | undefined;
  if (!userId) {
    throw new HttpError(401, 'Unauthorized');
  }

  const file = (req as { file?: Express.Multer.File }).file;
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
    'Iniciando procesamiento de archivo AUM'
  );

  const {
    broker = 'balanz',
    reportMonth: manualReportMonth,
    reportYear: manualReportYear,
    fileType: manualFileType,
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
  const periodStr =
    fileMetadata.reportMonth && fileMetadata.reportYear
      ? `${fileMetadata.reportMonth}/${fileMetadata.reportYear}`
      : 'N/A';
  req.log?.info?.(
    {
      filename: file.originalname,
      fileType: fileMetadata.fileType,
      period: periodStr,
    },
    `File type: ${fileMetadata.fileType}, Period: ${periodStr}`
  );

  // Create file record
  const [fileRow] = await dbi
    .insert(aumImportFiles)
    .values({
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
      reportYear: fileMetadata.reportYear,
    })
    .returning();

  // Parse file using service
  const parseResult = await parseAumFile(file.path, file.originalname);

  if (!parseResult.success || !parseResult.data) {
    // Cleanup temp file
    try {
      await fs.unlink(file.path);
    } catch {}

    return res.status(400).json({
      error: 'Error al procesar el archivo',
      details: parseResult.error || parseResult.details || 'Error desconocido',
    });
  }

  const parsedRows = parseResult.data;

  // Validar filas parseadas
  const validation = validateParsedRows(parsedRows);
  const { pctWithIdentifiers, pctWithFinancialData } = calculateValidationPercentages(
    validation.stats,
    parsedRows.length
  );

  const rowsWithAtLeastOneIdentifier = parsedRows.length - validation.stats.rowsMissingIdentifiers;
  req.log?.info?.(
    {
      fileId: fileRow.id,
      totalRows: parsedRows.length,
      rowsWithIdCuenta: validation.stats.rowsWithIdCuenta,
      rowsWithComitente: validation.stats.rowsWithComitente,
      rowsWithAtLeastOneIdentifier,
      rowsMissingIdentifiers: validation.stats.rowsMissingIdentifiers,
      rowsWithFinancialData: validation.stats.rowsWithFinancialData,
      pctWithIdentifiers,
      pctWithFinancialData,
    },
    `Validation: ${pctWithIdentifiers}% with identifiers, ${pctWithFinancialData}% with financial data`
  );

  // Reportar errores críticos (pero no bloquear el proceso si hay datos válidos)
  if (
    validation.errors.length > 0 &&
    validation.stats.rowsWithInvalidFinancialData > parsedRows.length * 0.1
  ) {
    const ratio = Math.round(
      (validation.stats.rowsWithInvalidFinancialData / parsedRows.length) * 100
    );
    req.log?.warn?.(
      {
        fileId: fileRow.id,
        errors: validation.errors.slice(0, 3),
        totalErrors: validation.errors.length,
      },
      `${validation.errors.length} error(s) found (${ratio}% invalid financial data, showing first 3)`
    );
  }

  if (validation.warnings.length > 0) {
    req.log?.warn?.(
      {
        fileId: fileRow.id,
        warnings: validation.warnings.slice(0, 3),
        totalWarnings: validation.warnings.length,
        missingIdentifiers: validation.stats.rowsMissingIdentifiers,
      },
      `${validation.warnings.length} warning(s) found (${validation.stats.rowsMissingIdentifiers} missing identifiers, showing first 3)`
    );
  }

  // Get existing rows for duplicate detection
  const existingAccounts = new Map<string, ExistingAumAccountSnapshot[]>();
  const existingHolderNames = new Map<string, ExistingAumAccountSnapshot[]>();

  try {
    // Obtener filas existentes para matching por cuenta
    const existingResult = await dbi.execute(sql`
        SELECT r.account_number, r.id_cuenta, r.holder_name, r.advisor_raw, 
               r.matched_user_id, r.is_normalized, r.file_id, r.created_at
        FROM aum_import_rows r
        INNER JOIN aum_import_files f ON r.file_id = f.id
        WHERE (r.account_number IS NOT NULL OR r.id_cuenta IS NOT NULL)
          AND f.broker = ${broker as string}
      `);

    (existingResult.rows || []).forEach(
      (row: {
        account_number: string | null;
        id_cuenta: string | null;
        holder_name: string | null;
        advisor_raw: string | null;
        matched_user_id: string | null;
        is_normalized: boolean;
        file_id: string;
        created_at: Date;
      }) => {
        const snapshot: ExistingAumAccountSnapshot = {
          holderName: row.holder_name ?? null,
          advisorRaw: row.advisor_raw ?? null,
          matchedUserId: row.matched_user_id ?? null,
          isNormalized: row.is_normalized ?? false,
          createdAt: row.created_at,
        };

        if (row.account_number && typeof row.account_number === 'string') {
          const normalizedAccount = normalizeAccountNumber(row.account_number);
          if (normalizedAccount) {
            if (!existingAccounts.has(normalizedAccount)) {
              existingAccounts.set(normalizedAccount, []);
            }
            existingAccounts.get(normalizedAccount)!.push(snapshot);
          }
        }

        if (row.id_cuenta && row.id_cuenta.trim().length > 0) {
          const normalizedIdCuenta = row.id_cuenta.trim();
          if (!existingAccounts.has(normalizedIdCuenta)) {
            existingAccounts.set(normalizedIdCuenta, []);
          }
          existingAccounts.get(normalizedIdCuenta)!.push(snapshot);
        }
      }
    );

    // Obtener filas con solo holderName
    const existingHolderResult = await dbi.execute(sql`
        SELECT r.holder_name, r.advisor_raw, r.matched_user_id, r.is_normalized, r.file_id, r.created_at
        FROM aum_import_rows r
        INNER JOIN aum_import_files f ON r.file_id = f.id
        WHERE r.holder_name IS NOT NULL
          AND (r.account_number IS NULL OR r.account_number = '')
          AND (r.id_cuenta IS NULL OR r.id_cuenta = '')
          AND f.broker = ${broker as string}
      `);

    (existingHolderResult.rows || []).forEach(
      (row: {
        holder_name: string | null;
        advisor_raw: string | null;
        matched_user_id: string | null;
        is_normalized: boolean;
        file_id: string;
        created_at: Date;
      }) => {
        const normalizedName = row.holder_name?.toLowerCase().trim();
        if (normalizedName) {
          if (!existingHolderNames.has(normalizedName)) {
            existingHolderNames.set(normalizedName, []);
          }
          existingHolderNames.get(normalizedName)!.push({
            holderName: row.holder_name ?? null,
            advisorRaw: row.advisor_raw ?? null,
            matchedUserId: row.matched_user_id ?? null,
            isNormalized: row.is_normalized ?? false,
            createdAt: row.created_at,
          });
        }
      }
    );
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

    const normalizedAccountNumber = r.accountNumber
      ? normalizeAccountNumber(r.accountNumber)
      : null;

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
    let existingRowsForInheritance: ExistingAumAccountSnapshot[] = [];

    if (normalizedAccountNumber && existingAccounts.has(normalizedAccountNumber)) {
      existingRowsForInheritance = existingAccounts.get(normalizedAccountNumber)!;
      const hasConflict = shouldFlagConflict(
        existingRowsForInheritance,
        r.holderName ?? null,
        originalAdvisorRaw
      );
      if (hasConflict) {
        matchStatus = 'ambiguous';
        conflictDetected = true;
        conflictsDetected += 1;
        ambiguous += 1;
      }
    }

    if (r.idCuenta && r.idCuenta.trim().length > 0 && existingAccounts.has(r.idCuenta.trim())) {
      const idCuentaRows = existingAccounts.get(r.idCuenta.trim())!;
      if (existingRowsForInheritance.length > 0) {
        existingRowsForInheritance = [...existingRowsForInheritance, ...idCuentaRows];
      } else {
        existingRowsForInheritance = idCuentaRows;
      }
    }

    if (r.holderName && (!originalAdvisorRaw || originalAdvisorRaw.trim().length === 0)) {
      const normalizedHolderName = r.holderName.toLowerCase().trim();
      if (normalizedHolderName && existingHolderNames.has(normalizedHolderName)) {
        const holderNameRows = existingHolderNames.get(normalizedHolderName)!;
        if (existingRowsForInheritance.length > 0) {
          existingRowsForInheritance = [...existingRowsForInheritance, ...holderNameRows];
        } else {
          existingRowsForInheritance = holderNameRows;
        }
      }
    }

    const resolvedAdvisor = inheritAdvisorFromExisting(
      originalAdvisorRaw,
      existingRowsForInheritance
    );
    r.advisorRaw = resolvedAdvisor;

    if (!matchedUserId && !originalAdvisorRaw) {
      const inheritedUserId = inheritMatchedUserIdFromExisting(existingRowsForInheritance);
      if (inheritedUserId) {
        matchedUserId = inheritedUserId;
      }
    }

    // Match contact by account number
    if (!matchedContactId && !conflictDetected && normalizedAccountNumber) {
      const contactMatch = await matchContactByAccountNumber(
        broker as string,
        normalizedAccountNumber
      );
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
      cv7000: r.cv7000,
    });

    if (normalizedAccountNumber) {
      if (!existingAccounts.has(normalizedAccountNumber)) {
        existingAccounts.set(normalizedAccountNumber, []);
      }
      existingAccounts.get(normalizedAccountNumber)!.push({
        holderName: r.holderName ?? null,
        advisorRaw: r.advisorRaw ?? null,
        matchedUserId: matchedUserId ?? null,
        isNormalized: !!matchedUserId || !!r.advisorRaw,
        createdAt: new Date(),
      });
    }
  }

  // Upsert rows using service
  const upsertResult = await upsertAumRows(rowsToInsert, broker as string);

  if (!upsertResult.success) {
    try {
      await fs.unlink(file.path);
    } catch {}

    return res.status(500).json({
      error: 'Error al guardar los datos del archivo',
      details: upsertResult.error || 'Error desconocido',
    });
  }

  // Create monthly snapshots for monthly files
  let monthlySnapshotsResult: {
    success: boolean;
    stats: { inserted: number; updated: number; errors: number };
  } | null = null;

  if (fileMetadata.fileType === 'monthly' && fileMetadata.reportMonth && fileMetadata.reportYear) {
    const snapshotsToInsert: AumMonthlySnapshotInsert[] = rowsToInsert
      .filter((row) => row.accountNumber || row.idCuenta)
      .map((row) => ({
        fileId: fileRow.id,
        accountNumber: row.accountNumber ?? null,
        idCuenta: row.idCuenta ?? null,
        reportMonth: fileMetadata.reportMonth!,
        reportYear: fileMetadata.reportYear!,
        aumDollars: row.aumDollars,
        bolsaArg: row.bolsaArg,
        fondosArg: row.fondosArg,
        bolsaBci: row.bolsaBci,
        pesos: row.pesos,
        mep: row.mep,
        cable: row.cable,
        cv7000: row.cv7000,
      }));

    if (snapshotsToInsert.length > 0) {
      monthlySnapshotsResult = await upsertAumMonthlySnapshots(snapshotsToInsert);

      const { inserted, updated, errors } = monthlySnapshotsResult.stats;
      req.log?.info?.(
        {
          fileId: fileRow.id,
        },
        `Snapshots: ${inserted} created, ${updated} updated${errors > 0 ? `, ${errors} errors` : ''}`
      );
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

  const totalsRow = totalsQuery.rows?.[0] as TotalsRow | undefined;

  const totalParsed = totalsRow?.total !== undefined ? Number(totalsRow.total) : actualCount;
  const matchedRows = totalsRow?.matched !== undefined ? Number(totalsRow.matched) : matched;
  const ambiguousRows =
    totalsRow?.ambiguous !== undefined ? Number(totalsRow.ambiguous) : ambiguous;
  const conflictRows =
    totalsRow?.conflicts !== undefined ? Number(totalsRow.conflicts) : conflictsDetected;
  const unmatchedRows = Math.max(totalParsed - matchedRows - ambiguousRows, 0);

  await dbi.execute(sql`
      UPDATE aum_import_files
      SET status = 'parsed',
          total_parsed = ${totalParsed},
          total_matched = ${matchedRows},
          total_unmatched = ${unmatchedRows}
      WHERE id = ${fileRow.id}
    `);

  const snapshotsMsg = monthlySnapshotsResult
    ? `, snapshots: ${monthlySnapshotsResult.stats.inserted}+${monthlySnapshotsResult.stats.updated}`
    : '';
  req.log?.info?.(
    {
      fileId: fileRow.id,
      filename: file.originalname,
    },
    `Upload complete: ${upsertResult.stats.inserted} inserted, ${upsertResult.stats.updated} updated, ${matchedRows} matched, ${unmatchedRows} unmatched${snapshotsMsg}`
  );

  // Retornar respuesta con status 201 para creación de recursos
  // Mantenemos formato { ok: true, ... } para compatibilidad con frontend
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
      monthlySnapshots: monthlySnapshotsResult
        ? {
            inserted: monthlySnapshotsResult.stats.inserted,
            updated: monthlySnapshotsResult.stats.updated,
            errors: monthlySnapshotsResult.stats.errors,
          }
        : null,
    },
  });
});
