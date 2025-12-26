/**
 * Handler para matching manual de filas AUM
 */

import type { Request, Response } from 'express';
import { db, aumImportRows, aumImportFiles } from '@maatwork/db';
import { eq, sql } from 'drizzle-orm';
import { createAsyncHandler, HttpError } from '@/utils/route-handler';
import { addContactAlias } from '@/services/alias';

/**
 * POST /admin/aum/uploads/:fileId/match
 * Manually match a row with contact and/or advisor
 */
export const matchRow = createAsyncHandler(async (req: Request, res: Response) => {
  const { fileId } = req.params;
  const { rowId, matchedContactId, matchedUserId } = req.body;
  const userId = req.user?.id as string;
  const userRole = req.user?.role as 'admin' | 'manager' | 'advisor';

  if (!userId || !userRole) {
    throw new HttpError(401, 'Unauthorized');
  }

  const dbi = db();

  // Verify file exists
  const [file] = await dbi
    .select()
    .from(aumImportFiles)
    .where(eq(aumImportFiles.id, fileId))
    .limit(1);
  if (!file) throw new HttpError(404, 'File not found');

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

  // AI_DECISION: Auto-learn contact alias on manual match
  // Justification: If user manually links a row with holder_name "Juan Perez" to contact "J. Perez", we should learn this alias.
  if (matchedContactId) {
    const [row] = await dbi
      .select({ holderName: aumImportRows.holderName })
      .from(aumImportRows)
      .where(eq(aumImportRows.id, rowId))
      .limit(1);

    if (row?.holderName) {
      await addContactAlias(matchedContactId, row.holderName, 'manual', true);
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
  const resultRows = totals.rows as unknown as Array<{
    total_parsed: number;
    total_matched: number;
    total_unmatched: number;
  }>;
  const rowResult = resultRows[0];
  if (rowResult) {
    await dbi
      .update(aumImportFiles)
      .set({
        totalParsed: rowResult.total_parsed,
        totalMatched: rowResult.total_matched,
        totalUnmatched: rowResult.total_unmatched,
      })
      .where(eq(aumImportFiles.id, fileId));
  }

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
});
