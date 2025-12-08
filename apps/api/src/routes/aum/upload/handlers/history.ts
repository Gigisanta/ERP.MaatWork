/**
 * Handler para historial de uploads AUM
 *
 * AI_DECISION: Extraer handler de history a módulo separado
 * Justificación: Separar responsabilidades mejora mantenibilidad
 * Impacto: Código más organizado
 *
 * AI_DECISION: Migrado a createRouteHandler para manejo automático de errores
 * Justificación: Consistencia con otros handlers, manejo de errores centralizado
 * Impacto: Código más limpio, mejor logging de errores, requestId automático
 */

import type { Request } from 'express';
import { db, aumImportFiles } from '@cactus/db';
import { eq, inArray } from 'drizzle-orm';
import { getUserAccessScope } from '@/auth/authorization';
import { createRouteHandler, HttpError } from '@/utils/route-handler';
import type { AumHistoryQuery } from '@/utils/aum-validation';

/**
 * GET /admin/aum/uploads/history
 * Get upload history
 *
 * Query params están validados por middleware validate() con aumHistoryQuerySchema
 */
export const handleHistory = createRouteHandler(async (req: Request) => {
  // req.query ya está validado y tipado por el middleware validate()
  const query = req.query as unknown as AumHistoryQuery;
  const limit = query.limit ?? 50;
  const userId = req.user?.id as string;
  const userRole = req.user?.role as string;

  if (!userId || !userRole) {
    throw new HttpError(401, 'Unauthorized');
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
    return { ok: true, files: [] };
  }

  try {
    const rows = whereClause
      ? await dbi.select().from(aumImportFiles).where(whereClause).limit(limit)
      : await dbi.select().from(aumImportFiles).limit(limit);

    // Retornar datos directamente - createRouteHandler los envuelve en { success: true, data: ... }
    // Mantenemos formato { ok: true, files } para compatibilidad con frontend
    return { ok: true, files: rows };
  } catch (error: unknown) {
    // If table doesn't exist (migration not applied), return empty list
    type PostgresError = {
      code?: string;
    };
    const pgError = error as PostgresError;
    if (pgError?.code === '42P01') {
      req.log?.warn?.({ err: error }, 'AUM history table missing - returning empty list');
      return { ok: true, files: [] };
    }
    throw error;
  }
});
