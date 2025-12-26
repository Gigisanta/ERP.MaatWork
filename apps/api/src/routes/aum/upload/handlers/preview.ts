/**
 * Handler para preview de archivos AUM
 *
 * AI_DECISION: Extraer handler de preview a módulo separado
 * Justificación: Separar responsabilidades mejora mantenibilidad
 * Impacto: Código más organizado
 *
 * AI_DECISION: Migrado a createRouteHandler para manejo automático de errores
 * Justificación: Consistencia con otros handlers, manejo de errores centralizado
 * Impacto: Código más limpio, mejor logging de errores, requestId automático
 */

import type { Request } from 'express';
import { db, aumImportFiles, aumImportRows } from '@maatwork/db';
import { eq } from 'drizzle-orm';
import { canAccessAumFile } from '@/auth/authorization';
import { createRouteHandler, HttpError } from '@/utils/route-handler';

/**
 * GET /admin/aum/uploads/:fileId/preview
 * Preview rows from uploaded file
 *
 * Params están validados por middleware validate() con aumFileIdParamsSchema
 */
export const handlePreview = createRouteHandler(async (req: Request) => {
  // req.params ya está validado y tipado por el middleware validate()
  const { fileId } = req.params;
  const query = req.query as { limit?: string };
  const limit = query.limit ? Number(query.limit) : 50;
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

  const rows = await dbi
    .select()
    .from(aumImportRows)
    .where(eq(aumImportRows.fileId, fileId))
    .limit(limit);

  // Retornar datos directamente - createRouteHandler los envuelve en { success: true, data: ... }
  // Mantenemos formato { ok: true, file, rows } para compatibilidad con frontend
  return {
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
  };
});
