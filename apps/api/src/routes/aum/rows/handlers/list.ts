/**
 * Handler para listar todas las filas AUM
 *
 * AI_DECISION: Migrado a createRouteHandler para manejo automático de errores
 * Justificación: Consistencia con otros handlers, manejo de errores centralizado
 * Impacto: Código más limpio, mejor logging de errores, requestId automático
 */

import type { Request } from 'express';
import { db } from '@cactus/db';
import { sql, type SQL } from 'drizzle-orm';
import { normalizeAdvisorAlias } from '@/utils/aum-normalization';
import { getCacheKey, getCachedCount, setCachedCount } from '../cache';
import { parseNumeric, QUERY_TIMEOUT_MS } from '../utils';
import type { AumRowResult } from '../types';
import type { AumRowsAllQuery } from '@/utils/aum-validation';
import { createRouteHandler } from '@/utils/route-handler';

/**
 * GET /admin/aum/rows/all
 * Get all imported rows with pagination and filters
 *
 * Query params están validados por middleware validate() con aumRowsAllQuerySchema
 */
export const listAllRows = createRouteHandler(async (req: Request) => {
  // req.query ya está validado y tipado por el middleware validate()
  const query = req.query as unknown as AumRowsAllQuery;
  const limit = query.limit ?? 50;
  const offset = query.offset ?? 0;
  const broker = query.broker;
  const status = query.status;
  const fileId = query.fileId;
  const preferredOnly = query.preferredOnly ?? false;
  const search = query.search;
  const onlyUpdated = query.onlyUpdated ?? false;
  const reportMonth = query.reportMonth;
  const reportYear = query.reportYear;

  req.log?.info?.(
    {
      fileId,
      preferredOnly,
      broker,
      status,
      search,
      onlyUpdated,
      reportMonth,
      reportYear,
      limit,
      offset,
    },
    'AUM rows GET: Parámetros de query recibidos'
  );

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
  const whereClause =
    conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  // Count total rows (only when needed)
  let total = 0;
  const needsCount = offset === 0 || limit + offset < 1000;

  if (needsCount) {
    const cacheKey = getCacheKey({
      ...(broker !== undefined && { broker }),
      ...(status !== undefined && { status }),
      ...(fileId !== undefined && { fileId }),
      preferredOnly,
      ...(search !== undefined && { search }),
      onlyUpdated,
      ...(reportMonth !== undefined && { reportMonth }),
      ...(reportYear !== undefined && { reportYear }),
    });

    const cachedTotal = getCachedCount(cacheKey);
    if (cachedTotal !== null) {
      total = cachedTotal;
      req.log?.info?.(
        {
          fileId,
          preferredOnly,
          total,
          cached: true,
          conditionsCount: conditions.length,
        },
        'AUM rows GET: Conteo obtenido del cache'
      );
    } else {
      const needsSearchJoin = !!search;

      const countJoins = needsSearchJoin
        ? sql`
            LEFT JOIN contacts c ON r.matched_contact_id = c.id
            LEFT JOIN users u ON r.matched_user_id = u.id
            LEFT JOIN advisor_aliases aa ON r.matched_user_id IS NULL 
              AND r.advisor_raw IS NOT NULL 
              AND LOWER(TRIM(r.advisor_raw)) = aa.alias_normalized
          `
        : sql``;

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

      if (!search) {
        setCachedCount(cacheKey, total);
      }

      req.log?.info?.(
        {
          fileId,
          preferredOnly,
          total,
          cached: false,
          conditionsCount: conditions.length,
          needsSearchJoin,
        },
        'AUM rows GET: Conteo obtenido del COUNT query'
      );
    }
  } else {
    total = limit + offset + 100;
  }

  // Get paginated rows with joined data
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
        r.is_normalized,
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
    isNormalized: r.is_normalized ?? false,
    rowCreatedAt: r.row_created_at,
    rowUpdatedAt: r.row_updated_at,
    isUpdated:
      r.row_updated_at && r.row_created_at
        ? new Date(r.row_updated_at).getTime() - new Date(r.row_created_at).getTime() > 1000
        : false,
    updatedByFile: {
      id: r.current_file_id,
      name: r.current_file_name,
      createdAt: r.current_file_created_at,
      fileType: r.file_type,
      reportMonth: r.file_report_month,
      reportYear: r.file_report_year,
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
      createdAt: r.file_created_at,
    },
    contact: r.matched_contact_id
      ? {
          id: r.matched_contact_id,
          fullName: r.contact_name,
          firstName: r.contact_first_name,
          lastName: r.contact_last_name,
        }
      : null,
    user: r.matched_user_id
      ? {
          id: r.matched_user_id,
          name: r.user_name,
          email: r.user_email,
        }
      : null,
  }));

  // Retornar datos directamente - createRouteHandler los envuelve en { success: true, data: ... }
  // Mantenemos formato { ok: true, rows, pagination } para compatibilidad con frontend
  return {
    ok: true,
    rows,
    pagination: {
      total,
      limit,
      offset,
      hasMore: Number(offset) + rows.length < total,
    },
  };
});
