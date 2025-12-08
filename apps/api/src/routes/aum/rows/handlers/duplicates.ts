/**
 * Handler para obtener duplicados de filas AUM
 *
 * AI_DECISION: Migrado a createRouteHandler para manejo automático de errores
 * Justificación: Consistencia con otros handlers, manejo de errores centralizado
 * Impacto: Código más limpio, mejor logging de errores, requestId automático
 */

import type { Request } from 'express';
import { db } from '@cactus/db';
import { sql } from 'drizzle-orm';
import { normalizeAdvisorAlias } from '@/utils/aum-normalization';
import type { AumRowResultDuplicate } from '../types';
import { createRouteHandler } from '@/utils/route-handler';

/**
 * GET /admin/aum/rows/duplicates/:accountNumber
 * Get all rows with same account number
 *
 * Params están validados por middleware validate() con aumAccountNumberParamsSchema
 */
export const getDuplicates = createRouteHandler(async (req: Request) => {
  // req.params ya está validado y tipado por el middleware validate()
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
      createdAt: r.file_created_at,
    },
    contact: r.matched_contact_id
      ? {
          id: r.matched_contact_id,
          fullName: r.contact_name,
        }
      : null,
    user: r.matched_user_id
      ? {
          id: r.matched_user_id,
          name: r.user_name,
        }
      : null,
  }));

  // Retornar datos directamente - createRouteHandler los envuelve en { success: true, data: ... }
  // Mantenemos formato { ok: true, accountNumber, rows, hasConflicts } para compatibilidad con frontend
  return {
    ok: true,
    accountNumber,
    rows,
    hasConflicts: rows.some((r) => r.conflictDetected),
  };
});
