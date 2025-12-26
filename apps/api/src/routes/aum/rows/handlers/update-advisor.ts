/**
 * Handler para actualizar asesor de fila AUM
 */

import type { Request, Response } from 'express';
import { db, aumImportRows, users } from '@maatwork/db';
import { eq } from 'drizzle-orm';

/**
 * PATCH /admin/aum/rows/:rowId
 * Update advisor for a specific AUM row and mark as normalized
 *
 * AI_DECISION: Endpoint dedicado para actualización de asesor con validaciones robustas
 * Justificación: Separar lógica de actualización de asesor permite mejor validación y logging
 * Impacto: Mejor integridad de datos y trazabilidad de cambios manuales
 */
export async function updateAdvisor(req: Request, res: Response) {
  try {
    const { rowId } = req.params;
    const { advisorRaw, matchedUserId } = req.body;
    const userId = req.user?.id as string;
    const userRole = req.user?.role as 'admin' | 'manager' | 'advisor';

    // Validar autenticación
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const dbi = db();

    // Verificar que la fila existe
    const [row] = await dbi
      .select({
        id: aumImportRows.id,
        matchedContactId: aumImportRows.matchedContactId,
      })
      .from(aumImportRows)
      .where(eq(aumImportRows.id, rowId))
      .limit(1);

    if (!row) {
      return res.status(404).json({ error: 'Fila no encontrada' });
    }

    // Verificar que el usuario existe y tiene rol de asesor
    // AI_DECISION: Validar que el usuario existe y es advisor antes de actualizar
    // Justificación: Previene asignaciones inválidas y mejora la integridad de datos
    // Impacto: Mejor validación y mensajes de error más claros
    const [user] = await dbi
      .select({
        id: users.id,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, matchedUserId))
      .limit(1);

    if (!user) {
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }

    if (user.role !== 'advisor') {
      return res.status(400).json({ error: 'El usuario debe tener rol de asesor' });
    }

    if (!user.isActive) {
      return res.status(400).json({ error: 'El asesor no está activo' });
    }

    // Actualizar fila con asesor y marcar como normalizada
    // AI_DECISION: Marcar automáticamente como normalizada cuando se asigna manualmente
    // Justificación: Las asignaciones manuales deben preservarse en futuras importaciones
    // Impacto: Preserva asignaciones manuales de asesores
    await dbi
      .update(aumImportRows)
      .set({
        advisorRaw: advisorRaw.trim(),
        matchedUserId,
        isNormalized: true,
        matchStatus: row.matchedContactId ? 'matched' : 'unmatched',
        updatedAt: new Date(),
      })
      .where(eq(aumImportRows.id, rowId));

    req.log?.info?.(
      {
        rowId,
        advisorRaw: advisorRaw.trim(),
        matchedUserId,
        updatedBy: userId,
        previousAdvisorRaw: row.matchedContactId ? 'tenía contacto' : 'sin contacto',
      },
      'AUM row advisor updated and marked as normalized'
    );

    return res.json({ ok: true });
  } catch (error) {
    req.log?.error?.(
      {
        err: error,
        rowId: req.params.rowId,
        userId: req.user?.id,
      },
      'failed to update row advisor'
    );

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Error interno del servidor',
    });
  }
}








