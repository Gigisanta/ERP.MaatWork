/**
 * Handler para matching manual de filas AUM
 */

import type { Request, Response } from 'express';
import { db, aumImportRows, aumImportFiles } from '@cactus/db';
import { eq, sql } from 'drizzle-orm';

/**
 * POST /admin/aum/uploads/:fileId/match
 * Manually match a row with contact and/or advisor
 */
export async function matchRow(req: Request, res: Response) {
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
    const [file] = await dbi
      .select()
      .from(aumImportFiles)
      .where(eq(aumImportFiles.id, fileId))
      .limit(1);
    if (!file) return res.status(404).json({ error: 'File not found' });

    // Support isPreferred from body if provided (for backward compatibility)
    const isPreferred = (req.body as { isPreferred?: boolean }).isPreferred;

    // Compute new match status: matched if we have a contact, otherwise unmatched
    const newStatus: 'matched' | 'ambiguous' | 'unmatched' = matchedContactId
      ? 'matched'
      : 'unmatched';

    // If setting this row as preferred, unset others for the same account_number within the same file
    if (isPreferred === true) {
      const [targetRow] = await dbi
        .select({ accountNumber: aumImportRows.accountNumber })
        .from(aumImportRows)
        .where(eq(aumImportRows.id, rowId))
        .limit(1);
      const accountNumber = (targetRow as { accountNumber: string | null } | undefined)
        ?.accountNumber;
      if (accountNumber) {
        await dbi.execute(sql`
          UPDATE aum_import_rows
          SET is_preferred = false
          WHERE file_id = ${fileId} AND account_number = ${accountNumber} AND id <> ${rowId}
        `);
      }
    }

    await dbi
      .update(aumImportRows)
      .set({
        matchedContactId: matchedContactId || null,
        matchedUserId: matchedUserId || null,
        matchStatus: newStatus,
        ...(typeof isPreferred === 'boolean' && { isPreferred }),
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
    const row = totals.rows[0] as {
      total_parsed: number;
      total_matched: number;
      total_unmatched: number;
    };
    await dbi
      .update(aumImportFiles)
      .set({
        totalParsed: row.total_parsed,
        totalMatched: row.total_matched,
        totalUnmatched: row.total_unmatched,
      })
      .where(eq(aumImportFiles.id, fileId));

    req.log?.info?.(
      {
        fileId,
        rowId,
        matchedContactId,
        matchedUserId,
        matchStatus: newStatus,
      },
      'AUM row matched manually'
    );

    return res.json({ ok: true });
  } catch (error) {
    req.log?.error?.({ err: error, fileId: req.params.fileId }, 'failed to match row');
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
