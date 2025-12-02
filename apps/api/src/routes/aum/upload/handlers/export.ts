/**
 * Handler para exportación de archivos AUM
 *
 * AI_DECISION: Extraer handler de export a módulo separado
 * Justificación: Separar responsabilidades mejora mantenibilidad
 * Impacto: Código más organizado
 */

import type { Request, Response } from 'express';
import { db, aumImportFiles, aumImportRows } from '@cactus/db';
import { eq, sql } from 'drizzle-orm';
import { canAccessAumFile } from '../../../../auth/authorization';
import type { AumImportRow, ContactResult } from '../types';

/**
 * GET /admin/aum/uploads/:fileId/export
 * Export rows from uploaded file as CSV
 */
export async function handleExport(req: Request, res: Response) {
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
    const [file] = await dbi
      .select()
      .from(aumImportFiles)
      .where(eq(aumImportFiles.id, fileId))
      .limit(1);
    if (!file) return res.status(404).json({ error: 'File not found' });

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
  } catch (error) {
    req.log?.error?.({ err: error }, 'AUM export failed');
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
