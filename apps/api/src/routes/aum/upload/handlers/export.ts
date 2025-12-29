/**
 * Handler para exportación de archivos AUM
 *
 * AI_DECISION: Extraer handler de export a módulo separado
 * Justificación: Separar responsabilidades mejora mantenibilidad
 * Impacto: Código más organizado
 *
 * AI_DECISION: Migrado a createAsyncHandler para headers personalizados y manejo automático de errores
 * Justificación: Necesita headers Content-Type y Content-Disposition para CSV, manejo de errores centralizado
 * Impacto: Código más limpio, mejor logging de errores, requestId automático
 */

import type { Request, Response } from 'express';
import { db, aumImportFiles, aumImportRows } from '@maatwork/db';
import { eq, sql } from 'drizzle-orm';
import { canAccessAumFile } from '@/auth/authorization';
import type { AumImportRow, ContactResult } from '../types';
import { createAsyncHandler, HttpError } from '@/utils/route-handler';

/**
 * GET /admin/aum/uploads/:fileId/export
 * Export rows from uploaded file as CSV
 *
 * Params están validados por middleware validate() con aumFileIdParamsSchema
 */
export const handleExport = createAsyncHandler(async (req: Request, res: Response) => {
  // req.params ya está validado y tipado por el middleware validate()
  const { fileId } = req.params;
  const userId = req.user?.id as string;
  const userRole = req.user?.role as 'admin' | 'manager' | 'advisor';

  if (!userId || !userRole) {
    throw new HttpError(401, 'Unauthorized');
  }

  // Verify user has access to this file
  const hasAccess = await canAccessAumFile(userId, userRole, fileId);
  if (!hasAccess) {
    throw new HttpError(404, 'File not found');
  }

  const dbi = db();
  const [file] = await dbi
    .select()
    .from(aumImportFiles)
    .where(eq(aumImportFiles.id, fileId))
    .limit(1);

  if (!file) {
    throw new HttpError(404, 'File not found');
  }

  const rows = await dbi.select().from(aumImportRows).where(eq(aumImportRows.fileId, fileId));

  const headers = [
    'account_number',
    'broker_holder_name',
    'crm_contact_id',
    'crm_contact_full_name',
    'matched_user_id',
    'advisor_raw',
    'match_status',
  ];

  // Fetch contact names for matched rows
  const contactIdSet = new Set<string>();
  rows.forEach((r: AumImportRow) => {
    if (r.matchedContactId) contactIdSet.add(r.matchedContactId);
  });
  const contactIds = Array.from(contactIdSet);
  const contactMap = new Map<string, string>();
  if (contactIds.length > 0) {
    for (const cid of contactIds) {
      try {
        const r = await dbi.execute(
          sql`SELECT id, full_name FROM contacts WHERE id = ${cid} LIMIT 1`
        );
        const rec = (r.rows && r.rows[0]) as ContactResult | undefined;
        if (rec && rec.id) {
          contactMap.set(rec.id, rec.full_name || '');
        }
      } catch {}
    }
  }

  const csvLines: string[] = [];
  csvLines.push(headers.join(','));
  for (const r of rows) {
    const values = [
      r.accountNumber || '',
      r.holderName || '',
      r.matchedContactId || '',
      r.matchedContactId ? contactMap.get(r.matchedContactId) || '' : '',
      r.matchedUserId || '',
      r.advisorRaw || '',
      r.matchStatus || '',
    ];
    const escaped = values.map((v) => {
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? '"' + s.replace(/"/g, '""') + '"'
        : s;
    });
    csvLines.push(escaped.join(','));
  }

  const csv = csvLines.join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=aup_export_${fileId}.csv`);
  return res.send(csv);
});
