/**
 * AUM Rows Routes
 * 
 * AI_DECISION: Modularizar endpoints de rows en archivo separado
 * Justificación: Separar responsabilidades, facilitar mantenimiento y testing
 * Impacto: Código más organizado y mantenible
 */

import { Router, type Request, type Response } from 'express';
import { db, aumImportRows, aumImportFiles, contacts, users, advisorAliases, aumMonthlySnapshots } from '@cactus/db';
import { eq, sql, type SQL } from 'drizzle-orm';
import { requireAuth } from '../../auth/middlewares';
import { validate } from '../../utils/validation';
import { normalizeAdvisorAlias } from '../../utils/aum-normalization';
import { matchContactByAccountNumber, matchContactByHolderName, matchAdvisor } from '../../services/aumMatcher';
import {
  aumRowsAllQuerySchema,
  aumAccountNumberParamsSchema,
  aumFileIdParamsSchema,
  aumMatchRowBodySchema,
  aumMonthlyHistoryQuerySchema
} from '../../utils/aum-validation';

const router = Router();

// Helper function to parse numeric values
// AI_DECISION: Asegurar que valores cero se parsean como 0, no null
// Justificación: Los valores cero son datos válidos y deben distinguirse de valores ausentes
// Impacto: Los valores cero se mostrarán como "0,00" en lugar de "--"
// Nota: PostgreSQL numeric(18,6) puede devolver valores como strings, especialmente cuando son exactamente 0
const parseNumeric = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    // Asegurar que 0 se retorna como 0, no null
    return isNaN(value) || !isFinite(value) ? null : value;
  }
  const strValue = String(value).trim();
  // Manejar valores vacíos y especiales
  if (strValue === '' || strValue === '-' || strValue === '--' || strValue === '—') {
    return null;
  }
  // Manejar explícitamente valores cero (incluyendo formatos con trailing zeros de PostgreSQL numeric)
  // PostgreSQL numeric(18,6) puede devolver "0.000000" o "0" como string
  const normalizedZero = strValue.replace(/^0+([.,]0+)?$/, '0');
  if (normalizedZero === '0' || 
      strValue === '0' || 
      strValue === '0.00' || 
      strValue === '0,00' || 
      strValue === '0.0' || 
      strValue === '0,0' || 
      strValue === '0.000000' ||
      strValue === '0,000000' ||
      /^0+([.,]0+)?$/.test(strValue)) {
    return 0;
  }
  const parsed = parseFloat(strValue.replace(',', '.'));
  // Asegurar que 0 se retorna como 0, no null (por si parseFloat retorna 0)
  if (parsed === 0) return 0;
  return isNaN(parsed) || !isFinite(parsed) ? null : parsed;
};

/**
 * GET /admin/aum/rows/all
 * Get all imported rows with pagination and filters
 */
router.get('/rows/all',
  requireAuth,
  validate({ query: aumRowsAllQuerySchema }),
  async (req: Request, res: Response) => {
    try {
      const limit = (req.query.limit as unknown as number) ?? 50;
      const offset = (req.query.offset as unknown as number) ?? 0;
      const broker = req.query.broker as string | undefined;
      const status = req.query.status as 'matched' | 'ambiguous' | 'unmatched' | undefined;
      const fileId = req.query.fileId as string | undefined;
      const preferredOnly = (req.query.preferredOnly as unknown as boolean) ?? false;
      const search = req.query.search as string | undefined;
      const onlyUpdated = (req.query.onlyUpdated as unknown as boolean) ?? false;
      const reportMonth = req.query.reportMonth as number | undefined;
      const reportYear = req.query.reportYear as number | undefined;

      req.log?.info?.({
        fileId,
        preferredOnly,
        broker,
        status,
        search,
        onlyUpdated,
        reportMonth,
        reportYear,
        limit,
        offset
      }, 'AUM rows GET: Parámetros de query recibidos');

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
      if (onlyUpdated) {
        conditions.push(sql`EXTRACT(EPOCH FROM (r.updated_at - r.created_at)) > 1`);
      }
      // AI_DECISION: Filtros por mes/año del reporte
      // Justificación: Permite filtrar filas por período mensual específico
      // Impacto: Habilita análisis temporal de datos AUM
      if (reportMonth !== undefined) {
        conditions.push(sql`f.report_month = ${reportMonth}`);
      }
      if (reportYear !== undefined) {
        conditions.push(sql`f.report_year = ${reportYear}`);
      }
      if (search) {
        const searchPattern = `%${search}%`;
        conditions.push(sql`(
          r.account_number ILIKE ${searchPattern} OR
          r.id_cuenta ILIKE ${searchPattern} OR
          r.holder_name ILIKE ${searchPattern} OR
          r.advisor_raw ILIKE ${searchPattern} OR
          aa.alias_normalized ILIKE ${searchPattern} OR
          u.full_name ILIKE ${searchPattern} OR
          u.email ILIKE ${searchPattern}
        )`);
      }
      const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

      const QUERY_TIMEOUT_MS = 30000; // 30 seconds

      // Count total rows (only when needed)
      let total = 0;
      const needsCount = offset === 0 || limit + offset < 1000;
      if (needsCount) {
        const countJoins = sql`
          LEFT JOIN contacts c ON r.matched_contact_id = c.id
          LEFT JOIN users u ON r.matched_user_id = u.id
          LEFT JOIN advisor_aliases aa ON r.matched_user_id IS NULL 
            AND r.advisor_raw IS NOT NULL 
            AND LOWER(TRIM(r.advisor_raw)) = aa.alias_normalized
        `;
        const countPromise = dbi.execute(sql`
          SELECT COUNT(*) as total
          FROM aum_import_rows r
          INNER JOIN aum_import_files f ON r.file_id = f.id
          ${countJoins}
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
        total = Number((countResult.rows?.[0] as CountResult | undefined)?.total || 0);

        req.log?.info?.({
          fileId,
          preferredOnly,
          total,
          conditionsCount: conditions.length
        }, 'AUM rows GET: Conteo obtenido del COUNT query');
      } else {
        total = limit + offset + 1; // Conservative estimate
      }

      // Get paginated rows with joined data
      type AumRowResult = {
        id: string;
        file_id: string;
        account_number: string | null;
        holder_name: string | null;
        id_cuenta: string | null;
        advisor_raw: string | null;
        matched_contact_id: string | null;
        matched_user_id: string | null;
        match_status: 'matched' | 'ambiguous' | 'unmatched';
        is_preferred: boolean;
        conflict_detected: boolean;
        needs_confirmation: boolean;
        row_created_at: Date;
        row_updated_at: Date;
        current_file_id: string;
        current_file_name: string;
        current_file_created_at: Date;
        file_type: string;
        file_report_month: number | null;
        file_report_year: number | null;
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

      const rowsPromise = dbi.execute(sql`
        SELECT 
          r.id,
          r.file_id,
          r.account_number,
          r.holder_name,
          r.id_cuenta,
          r.advisor_raw,
          r.matched_contact_id,
          r.matched_user_id,
          r.match_status,
          r.is_preferred,
          r.conflict_detected,
          r.needs_confirmation,
          r.created_at as row_created_at,
          r.updated_at as row_updated_at,
          r.file_id as current_file_id,
          f.original_filename as current_file_name,
          f.created_at as current_file_created_at,
          f.file_type as file_type,
          f.report_month as file_report_month,
          f.report_year as file_report_year,
          r.aum_dollars,
          r.bolsa_arg,
          r.fondos_arg,
          r.bolsa_bci,
          r.pesos,
          r.mep,
          r.cable,
          r.cv7000,
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
        idCuenta: r.id_cuenta,
        advisorRaw: r.advisor_raw,
        advisorNormalized: r.advisor_raw ? normalizeAdvisorAlias(r.advisor_raw) : null,
        matchedContactId: r.matched_contact_id,
        matchedUserId: r.matched_user_id,
        suggestedUserId: r.suggested_user_id || null,
        matchStatus: r.match_status,
        isPreferred: r.is_preferred,
        conflictDetected: r.conflict_detected,
        needsConfirmation: r.needs_confirmation,
        rowCreatedAt: r.row_created_at,
        rowUpdatedAt: r.row_updated_at,
        isUpdated: r.row_updated_at && r.row_created_at
          ? (new Date(r.row_updated_at).getTime() - new Date(r.row_created_at).getTime()) > 1000
          : false,
        updatedByFile: {
          id: r.current_file_id,
          name: r.current_file_name,
          createdAt: r.current_file_created_at,
          fileType: r.file_type,
          reportMonth: r.file_report_month,
          reportYear: r.file_report_year
        },
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
      req.log?.error?.({ err: error }, 'failed to get all rows');
      return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  }
);

/**
 * GET /admin/aum/rows/duplicates/:accountNumber
 * Get all rows with same account number
 */
router.get('/rows/duplicates/:accountNumber',
  requireAuth,
  validate({ params: aumAccountNumberParamsSchema }),
  async (req: Request, res: Response) => {
    try {
      const { accountNumber } = req.params;
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
        advisorNormalized: r.advisor_raw ? normalizeAdvisorAlias(r.advisor_raw) : null,
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
  }
);

/**
 * POST /admin/aum/uploads/:fileId/match
 * Manually match a row with contact and/or advisor
 */
router.post('/uploads/:fileId/match',
  requireAuth,
  validate({ params: aumFileIdParamsSchema, body: aumMatchRowBodySchema }),
  async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;
      const { rowId, matchedContactId, matchedUserId } = req.body;
      const userId = req.user?.id as string;
      const userRole = req.user?.role as 'admin' | 'manager' | 'advisor';

      if (!userId || !userRole) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const dbi = db();

      // Verify file exists
      const [file] = await dbi.select().from(aumImportFiles).where(eq(aumImportFiles.id, fileId)).limit(1);
      if (!file) return res.status(404).json({ error: 'File not found' });

      // Support isPreferred from body if provided (for backward compatibility)
      const isPreferred = (req.body as any).isPreferred;

      // Compute new match status: matched if we have a contact, otherwise unmatched
      const newStatus: 'matched' | 'ambiguous' | 'unmatched' = matchedContactId ? 'matched' : 'unmatched';

      // If setting this row as preferred, unset others for the same account_number within the same file
      if (isPreferred === true) {
        const [targetRow] = await dbi.select({ accountNumber: aumImportRows.accountNumber })
          .from(aumImportRows)
          .where(eq(aumImportRows.id, rowId))
          .limit(1);
        const accountNumber = (targetRow as any)?.accountNumber as string | null;
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
        .where(eq(aumImportRows.id, rowId));

      // Recompute file totals
      const totals = await dbi.execute(sql`
        SELECT 
          COUNT(*)::int as total_parsed,
          SUM(CASE WHEN match_status = 'matched' THEN 1 ELSE 0 END)::int as total_matched,
          SUM(CASE WHEN match_status <> 'matched' THEN 1 ELSE 0 END)::int as total_unmatched
        FROM aum_import_rows WHERE file_id = ${fileId}
      `);
      const row = totals.rows[0] as any;
      await dbi.update(aumImportFiles)
        .set({
          totalParsed: row.total_parsed,
          totalMatched: row.total_matched,
          totalUnmatched: row.total_unmatched
        })
        .where(eq(aumImportFiles.id, fileId));

      req.log?.info?.({
        fileId,
        rowId,
        matchedContactId,
        matchedUserId,
        matchStatus: newStatus
      }, 'AUM row matched manually');

      return res.json({ ok: true });
    } catch (error) {
      req.log?.error?.({ err: error, fileId: req.params.fileId }, 'failed to match row');
      return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  }
);

/**
 * Get monthly history for AUM accounts
 * Returns historical snapshots of financial values by month/year
 */
router.get('/rows/monthly-history',
  requireAuth,
  validate({ query: aumMonthlyHistoryQuerySchema }),
  async (req: Request, res: Response) => {
    try {
      const accountNumber = req.query.accountNumber as string | undefined;
      const idCuenta = req.query.idCuenta as string | undefined;
      const reportMonth = req.query.reportMonth as number | undefined;
      const reportYear = req.query.reportYear as number | undefined;
      const limit = (req.query.limit as unknown as number) ?? 100;

      req.log?.info?.({
        accountNumber,
        idCuenta,
        reportMonth,
        reportYear,
        limit
      }, 'AUM monthly history GET: Parámetros de query recibidos');

      // Validar que al menos uno de los identificadores esté presente
      if (!accountNumber && !idCuenta) {
        return res.status(400).json({
          error: 'Debe proporcionar accountNumber o idCuenta'
        });
      }

      const dbi = db();

      // Build WHERE conditions
      const conditions: SQL[] = [];
      
      if (accountNumber) {
        conditions.push(sql`s.account_number = ${accountNumber}`);
      } else {
        conditions.push(sql`s.account_number IS NULL`);
      }
      
      if (idCuenta) {
        conditions.push(sql`s.id_cuenta = ${idCuenta}`);
      } else {
        conditions.push(sql`s.id_cuenta IS NULL`);
      }
      
      if (reportMonth !== undefined) {
        conditions.push(sql`s.report_month = ${reportMonth}`);
      }
      
      if (reportYear !== undefined) {
        conditions.push(sql`s.report_year = ${reportYear}`);
      }

      const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

      // Query monthly snapshots
      const snapshotsResult = await dbi.execute(sql`
        SELECT 
          s.id,
          s.account_number,
          s.id_cuenta,
          s.report_month,
          s.report_year,
          s.file_id,
          f.original_filename as file_name,
          f.created_at as file_created_at,
          s.aum_dollars,
          s.bolsa_arg,
          s.fondos_arg,
          s.bolsa_bci,
          s.pesos,
          s.mep,
          s.cable,
          s.cv7000,
          s.created_at,
          s.updated_at
        FROM aum_monthly_snapshots s
        INNER JOIN aum_import_files f ON s.file_id = f.id
        ${whereClause}
        ORDER BY s.report_year DESC, s.report_month DESC
        LIMIT ${limit}
      `);

      const snapshots = (snapshotsResult.rows || []).map((row: any) => ({
        id: row.id,
        accountNumber: row.account_number,
        idCuenta: row.id_cuenta,
        reportMonth: row.report_month,
        reportYear: row.report_year,
        file: {
          id: row.file_id,
          name: row.file_name,
          createdAt: row.file_created_at
        },
        aumDollars: parseNumeric(row.aum_dollars),
        bolsaArg: parseNumeric(row.bolsa_arg),
        fondosArg: parseNumeric(row.fondos_arg),
        bolsaBci: parseNumeric(row.bolsa_bci),
        pesos: parseNumeric(row.pesos),
        mep: parseNumeric(row.mep),
        cable: parseNumeric(row.cable),
        cv7000: parseNumeric(row.cv7000),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      req.log?.info?.({
        accountNumber,
        idCuenta,
        snapshotsCount: snapshots.length
      }, 'AUM monthly history GET: Snapshots obtenidos');

      return res.status(200).json({
        ok: true,
        snapshots,
        total: snapshots.length
      });
    } catch (error) {
      req.log?.error?.({ err: error }, 'AUM monthly history GET failed');
      return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  }
);

export default router;

