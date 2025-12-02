/**
 * Handler para preview de archivos AUM
 *
 * AI_DECISION: Extraer handler de preview a módulo separado
 * Justificación: Separar responsabilidades mejora mantenibilidad
 * Impacto: Código más organizado
 */

import type { Request, Response } from 'express';
import { db, aumImportFiles, aumImportRows } from '@cactus/db';
import { eq } from 'drizzle-orm';
import { canAccessAumFile } from '../../../../auth/authorization';

/**
 * GET /admin/aum/uploads/:fileId/preview
 * Preview rows from uploaded file
 */
export async function handlePreview(req: Request, res: Response) {
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
    const [file] = await dbi
      .select()
      .from(aumImportFiles)
      .where(eq(aumImportFiles.id, fileId))
      .limit(1);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const rows = await dbi
      .select()
      .from(aumImportRows)
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
          unmatched: file.totalUnmatched,
        },
        createdAt: file.createdAt,
      },
      rows,
    });
  } catch (error) {
    req.log?.error?.({ err: error }, 'AUM preview failed');
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
