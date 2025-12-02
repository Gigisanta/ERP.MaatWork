/**
 * Handler para historial de uploads AUM
 *
 * AI_DECISION: Extraer handler de history a módulo separado
 * Justificación: Separar responsabilidades mejora mantenibilidad
 * Impacto: Código más organizado
 */

import type { Request, Response } from 'express';
import { db, aumImportFiles } from '@cactus/db';
import { eq, inArray } from 'drizzle-orm';
import { getUserAccessScope } from '../../../../auth/authorization';

/**
 * GET /admin/aum/uploads/history
 * Get upload history
 */
export async function handleHistory(req: Request, res: Response) {
  try {
    const { limit = 50 } = req.query as { limit?: number };
    const userId = (req as any).user?.id as string;
    const userRole = (req as any).user?.role as string;

    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const dbi = db();

    // Filter files based on user role and access scope
    let whereClause;
    if (userRole === 'admin') {
      whereClause = undefined; // No filter
    } else if (userRole === 'advisor') {
      whereClause = eq(aumImportFiles.uploadedByUserId, userId);
    } else if (userRole === 'manager') {
      const accessScope = await getUserAccessScope(userId, userRole);
      const accessibleUserIds = [...new Set([...accessScope.accessibleAdvisorIds, userId])];
      whereClause = inArray(aumImportFiles.uploadedByUserId, accessibleUserIds);
    } else {
      return res.json({ ok: true, files: [] });
    }

    try {
      const rows = whereClause
        ? await dbi.select().from(aumImportFiles).where(whereClause).limit(limit)
        : await dbi.select().from(aumImportFiles).limit(limit);

      return res.json({ ok: true, files: rows });
    } catch (error: unknown) {
      // If table doesn't exist (migration not applied), return empty list
      type PostgresError = {
        code?: string;
      };
      const pgError = error as PostgresError;
      if (pgError?.code === '42P01') {
        req.log?.warn?.({ err: error }, 'AUM history table missing - returning empty list');
        return res.json({ ok: true, files: [] });
      }
      throw error;
    }
  } catch (error) {
    req.log?.error?.({ err: error }, 'AUM history failed');
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
