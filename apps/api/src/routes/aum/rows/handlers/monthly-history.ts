/**
 * Handler para historial mensual de AUM
 * 
 * AI_DECISION: Migrado a createRouteHandler para manejo automático de errores
 * Justificación: Consistencia con otros handlers, manejo de errores centralizado
 * Impacto: Código más limpio, mejor logging de errores, requestId automático
 */

import type { Request } from 'express';
import { db } from '@cactus/db';
import { sql, type SQL } from 'drizzle-orm';
import { parseNumeric } from '../utils';
import type { MonthlySnapshotRow } from '../types';
import type { AumMonthlyHistoryQuery } from '@/utils/aum-validation';
import { createRouteHandler, HttpError } from '@/utils/route-handler';

/**
 * GET /admin/aum/rows/monthly-history
 * Get monthly history for AUM accounts
 * Returns historical snapshots of financial values by month/year
 * 
 * Query params están validados por middleware validate() con aumMonthlyHistoryQuerySchema
 */
export const getMonthlyHistory = createRouteHandler(async (req: Request) => {
  // req.query ya está validado y tipado por el middleware validate()
  const query = req.query as unknown as AumMonthlyHistoryQuery;
  const accountNumber = query.accountNumber;
  const idCuenta = query.idCuenta;
  const reportMonth = query.reportMonth;
  const reportYear = query.reportYear;
  const limit = query.limit ?? 100;

  req.log?.info?.(
    {
      accountNumber,
      idCuenta,
      reportMonth,
      reportYear,
      limit,
    },
    'AUM monthly history GET: Parámetros de query recibidos'
  );

  // Validar que al menos uno de los identificadores esté presente
  if (!accountNumber && !idCuenta) {
    throw new HttpError(400, 'Debe proporcionar accountNumber o idCuenta');
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

    const whereClause =
      conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

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

    const snapshots = ((snapshotsResult.rows || []) as MonthlySnapshotRow[]).map((row) => ({
      id: row.id,
      accountNumber: row.account_number,
      idCuenta: row.id_cuenta,
      reportMonth: row.report_month,
      reportYear: row.report_year,
      file: {
        id: row.file_id,
        name: row.file_name,
        createdAt: row.file_created_at,
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
      updatedAt: row.updated_at,
    }));

    req.log?.info?.(
      {
        accountNumber,
        idCuenta,
        snapshotsCount: snapshots.length,
      },
      'AUM monthly history GET: Snapshots obtenidos'
    );

  // Retornar datos directamente - createRouteHandler los envuelve en { success: true, data: ... }
  // Mantenemos formato { ok: true, snapshots, total } para compatibilidad con frontend
  return {
    ok: true,
    snapshots,
    total: snapshots.length,
  };
});
