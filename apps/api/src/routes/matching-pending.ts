/**
 * API para gestión de la bandeja de pendientes
 * Implementa STORY 5 - KAN-126
 */

import { Router, type Request, type Response } from 'express';
import { db, matchingAudit, dimClient, stgComisiones, users } from '@cactus/db';
import { eq, and, or, inArray, sql } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/matching-pending
 * Lista de registros pendientes de matching
 * 
 * Query params:
 * - status: matched | multi_match | no_match | pending (default: all)
 * - limit: number (default: 50, max: 200)
 * - offset: number (default: 0)
 * 
 * Returns:
 * - items: array de pendientes con detalles
 * - total: total de registros
 * - pagination: info de paginación
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { 
      status, 
      limit = '50', 
      offset = '0' 
    } = req.query;
    
    const limitNum = Math.min(parseInt(limit as string, 10), 200);
    const offsetNum = parseInt(offset as string, 10);
    
    // Construir WHERE clause
    let whereClause = sql`1=1`;
    
    if (status && status !== 'all') {
      whereClause = eq(matchingAudit.matchStatus, status as string);
    } else {
      // Por defecto, solo pendientes y no_match
      whereClause = or(
        eq(matchingAudit.matchStatus, 'pending'),
        eq(matchingAudit.matchStatus, 'no_match'),
        eq(matchingAudit.matchStatus, 'multi_match')
      )!;
    }
    
    // Obtener registros
    const items = await db()
      .select({
        id: matchingAudit.id,
        sourceTable: matchingAudit.sourceTable,
        sourceRecordId: matchingAudit.sourceRecordId,
        matchStatus: matchingAudit.matchStatus,
        matchRule: matchingAudit.matchRule,
        confidence: matchingAudit.confidence,
        context: matchingAudit.context,
        resolvedByUserId: matchingAudit.resolvedByUserId,
        resolvedAt: matchingAudit.resolvedAt,
        createdAt: matchingAudit.createdAt
      })
      .from(matchingAudit)
      .where(whereClause)
      .orderBy(matchingAudit.createdAt)
      .limit(limitNum)
      .offset(offsetNum);
    
    // Contar total
    const countResult = await db()
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(matchingAudit)
      .where(whereClause);
    
    const count = countResult[0]?.count || 0;
    
    // Enriquecer con datos de staging
    const enrichedItems = await Promise.all(
      items.map(async (item: any) => {
        let stagingData = null;
        
        if (item.sourceTable === 'stg_comisiones') {
          const [staging] = await db()
            .select()
            .from(stgComisiones)
            .where(eq(stgComisiones.id, item.sourceRecordId))
            .limit(1);
          
          stagingData = staging || null;
        }
        
        return {
          ...item,
          stagingData
        };
      })
    );
    
    return res.json({
      items: enrichedItems,
      total: count,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < count
      }
    });
    
  } catch (error) {
    req.log.error({ err: error }, 'Error obteniendo pendientes');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/matching-pending/:id/candidates
 * Obtiene candidatos para un registro pendiente
 * 
 * Returns:
 * - candidates: array de clientes candidatos con scores
 */
router.get('/:id/candidates', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Obtener el registro de auditoría
    const [auditRecord] = await db()
      .select()
      .from(matchingAudit)
      .where(eq(matchingAudit.id, id))
      .limit(1);
    
    if (!auditRecord) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    
    // Extraer candidatos del context
    const candidateIds = (auditRecord.context as any)?.candidates || [];
    
    if (candidateIds.length === 0) {
      return res.json({ candidates: [] });
    }
    
    // Obtener detalles de los candidatos
    const candidates = await db()
      .select()
      .from(dimClient)
      .where(inArray(dimClient.id, candidateIds.map((c: any) => c.id)));
    
    // Combinar con scores
    const enrichedCandidates = candidates.map((client: any) => {
      const candidate = candidateIds.find((c: any) => c.id === client.id);
      return {
        ...client,
        score: candidate?.score || 0
      };
    });
    
    return res.json({ candidates: enrichedCandidates });
    
  } catch (error) {
    req.log.error({ err: error }, 'Error obteniendo candidatos');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/matching-pending/:id/resolve
 * Resuelve un registro pendiente asignándolo a un cliente
 * 
 * Body:
 * - clientId: UUID del cliente (o null para "ignorar")
 * - action: "assign" | "create" | "ignore"
 * - comment: string (OBLIGATORIO según superprompt)
 * 
 * Returns:
 * - success: boolean
 */
router.post('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { clientId, action, comment } = req.body;
    
    // Validar comentario obligatorio
    if (!comment || comment.trim() === '') {
      return res.status(400).json({
        error: 'El comentario es obligatorio para resolver una incidencia'
      });
    }
    
    // TODO: Obtener userId del token JWT (por ahora usar body)
    const userId = req.body.userId || null;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    // Obtener registro
    const [auditRecord] = await db()
      .select()
      .from(matchingAudit)
      .where(eq(matchingAudit.id, id))
      .limit(1);
    
    if (!auditRecord) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    
    // 1. Crear registro WORM en matching_resolutions
    // TODO: Implementar tabla matching_resolutions cuando esté disponible
    // const { matchingResolutions } = await import('@cactus/db');
    // await db().insert(matchingResolutions).values({
    //   matchingAuditId: id,
    //   action: action || 'assign',
    //   targetIds: clientId ? [clientId] : [],
    //   comment: comment.trim(),
    //   resolvedByUserId: userId
    // });
    
    // 2. Actualizar matching_audit
    await db()
      .update(matchingAudit)
      .set({
        matchStatus: action === 'ignore' ? 'no_match' : 'matched',
        targetClientId: clientId,
        resolvedByUserId: userId,
        resolvedAt: new Date(),
        resolutionComment: comment.trim(),
        context: {
          ...(auditRecord.context as any),
          manualResolution: true,
          action,
          resolvedAt: new Date().toISOString()
        }
      })
      .where(eq(matchingAudit.id, id));
    
    req.log.info(
      { auditId: id, action, clientId, userId, commentLength: comment.length },
      'Pendiente resuelto manualmente con comentario'
    );
    
    return res.json({ success: true });
    
  } catch (error) {
    req.log.error({ err: error }, 'Error resolviendo pendiente');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/matching-pending/bulk-resolve
 * Resuelve múltiples pendientes en batch
 * Según superprompt: cada resolución DEBE tener comentario obligatorio
 * 
 * Body:
 * - resolutions: Array<{ id: string, clientId: string, action: string, comment: string }>
 * 
 * Returns:
 * - resolved: number
 * - errors: Array<{id, error}>
 */
router.post('/bulk-resolve', async (req: Request, res: Response) => {
  try {
    const { resolutions } = req.body;
    const userId = req.body.userId || null;
    
    if (!Array.isArray(resolutions) || resolutions.length === 0) {
      return res.status(400).json({ error: 'resolutions debe ser un array no vacío' });
    }
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    let resolved = 0;
    const errors: Array<{ id: string; error: string }> = [];
    
    // TODO: Implementar tabla matching_resolutions cuando esté disponible
    // const { matchingResolutions } = await import('@cactus/db');
    
    for (const resolution of resolutions) {
      try {
        const { id, clientId, action, comment } = resolution;
        
        // Validar comentario obligatorio
        if (!comment || comment.trim() === '') {
          errors.push({
            id,
            error: 'Comentario obligatorio'
          });
          continue;
        }
        
        // 1. Crear registro WORM en matching_resolutions
        // await db().insert(matchingResolutions).values({
        //   matchingAuditId: id,
        //   action: action || 'assign',
        //   targetIds: clientId ? [clientId] : [],
        //   comment: comment.trim(),
        //   resolvedByUserId: userId
        // });
        
        // 2. Actualizar matching_audit
        await db()
          .update(matchingAudit)
          .set({
            matchStatus: action === 'ignore' ? 'no_match' : 'matched',
            targetClientId: clientId,
            resolvedByUserId: userId,
            resolvedAt: new Date(),
            resolutionComment: comment.trim(),
            context: sql`${matchingAudit.context} || ${JSON.stringify({
              manualResolution: true,
              action
            })}::jsonb`
          })
          .where(eq(matchingAudit.id, id));
        
        resolved++;
      } catch (error) {
        errors.push({
          id: resolution.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    req.log.info(
      { resolved, errors: errors.length },
      'Bulk resolve completado (con comentarios obligatorios)'
    );
    
    return res.json({ resolved, errors });
    
  } catch (error) {
    req.log.error({ err: error }, 'Error en bulk resolve');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/matching-pending/stats
 * Estadísticas de la bandeja de pendientes
 * 
 * Returns:
 * - byStatus: object con conteos por estado
 * - totalPending: number
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await db()
      .select({
        matchStatus: matchingAudit.matchStatus,
        count: sql<number>`COUNT(*)::int`
      })
      .from(matchingAudit)
      .groupBy(matchingAudit.matchStatus);
    
    const byStatus = stats.reduce((acc: any, { matchStatus, count }: any) => {
      acc[matchStatus] = count;
      return acc;
    }, {} as Record<string, number>);
    
    const totalPending =
      (byStatus.pending || 0) +
      (byStatus.no_match || 0) +
      (byStatus.multi_match || 0);
    
    return res.json({
      byStatus,
      totalPending
    });
    
  } catch (error) {
    req.log.error({ err: error }, 'Error obteniendo stats');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

export default router;




