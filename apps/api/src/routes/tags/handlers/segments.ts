/**
 * Segments Handlers
 *
 * GET /segments - List segments
 * POST /segments - Create segment
 * POST /segments/:id/refresh - Refresh dynamic segment
 * GET /segments/:id/contacts - List segment contacts
 * GET /segments/:id/export - Export segment to CSV
 *
 * AI_DECISION: Migrado a createRouteHandler/createAsyncHandler para manejo automático de errores
 * Justificación: Consistencia con otros handlers, manejo automático de errores y formato de respuesta
 * Impacto: Código más limpio, menos duplicación, mejor manejo de errores
 */

import { Router, type Request, type Response } from 'express';
import { db, segments, segmentMembers, contacts } from '@maatwork/db';
import { eq, desc, sql, and, inArray, type InferSelectModel } from 'drizzle-orm';
import { requireAuth } from '../../../auth/middlewares';
import { getUserAccessScope, buildContactAccessFilter } from '../../../auth/authorization';
import { validate } from '../../../utils/validation';
import { idParamSchema } from '../../../utils/validation/common-schemas';
import { createRouteHandler, createAsyncHandler, HttpError } from '../../../utils/route-handler';
import { PAGINATION_LIMITS } from '../../../config/api-limits';
import {
  listSegmentsQuerySchema,
  segmentContactsQuerySchema,
  createSegmentSchema,
} from '../schemas';

const router = Router();

// GET /segments - List segments
router.get(
  '/',
  requireAuth,
  validate({ query: listSegmentsQuerySchema }),
  createRouteHandler(async (req: Request) => {
    const userId = req.user!.id;
    const { includeShared = 'true' } = req.query;

    const items = await db()
      .select()
      .from(segments)
      .where(sql`${segments.ownerId} = ${userId} OR ${segments.isShared} = true`)
      .orderBy(desc(segments.updatedAt));

    return items;
  })
);

// POST /segments - Create new segment
router.post(
  '/',
  requireAuth,
  validate({ body: createSegmentSchema }),
  createAsyncHandler(async (req: Request, res: Response) => {
    const validated = req.body;
    const userId = req.user!.id;

    const [newSegment] = await db()
      .insert(segments)
      .values({
        ...validated,
        ownerId: userId,
        contactCount: 0,
      })
      .returning();

    req.log.info({ segmentId: newSegment.id }, 'segment created');
    return res.status(201).json({ success: true, data: newSegment, requestId: req.requestId });
  })
);

// POST /segments/:id/refresh - Refresh dynamic segment
router.post(
  '/:id/refresh',
  requireAuth,
  validate({ params: idParamSchema }),
  createRouteHandler(async (req: Request) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const accessScope = await getUserAccessScope(userId, userRole);
    const accessFilter = buildContactAccessFilter(accessScope);

    const [segment] = await db().select().from(segments).where(eq(segments.id, id)).limit(1);

    if (!segment) {
      throw new HttpError(404, 'Segment not found');
    }

    if (!segment.isDynamic) {
      throw new HttpError(400, 'Segment is not dynamic');
    }

    // AI_DECISION: Evaluación de filtros de segmentos pendiente de implementación
    // Justificación: Funcionalidad compleja que requiere evaluación de condiciones dinámicas contra contactos
    // Impacto: Los segmentos dinámicos actualmente no evalúan filtros automáticamente
    // Estado: Funcionalidad futura - actualmente retorna lista vacía como stub
    // Referencias: Requiere diseño de motor de evaluación de condiciones dinámicas
    await db().delete(segmentMembers).where(eq(segmentMembers.segmentId, id));

    const matchedContactIds: string[] = [];

    // Update counter
    await db()
      .update(segments)
      .set({
        contactCount: matchedContactIds.length,
        lastRefreshedAt: new Date(),
      })
      .where(eq(segments.id, id));

    req.log.info({ segmentId: id, contacts: matchedContactIds.length }, 'segment refreshed');

    return {
      segmentId: id,
      contactCount: matchedContactIds.length,
    };
  })
);

// GET /segments/:id/contacts - List segment contacts
router.get(
  '/:id/contacts',
  requireAuth,
  validate({
    params: idParamSchema,
    query: segmentContactsQuerySchema,
  }),
  createRouteHandler(async (req: Request) => {
    const { id } = req.params;
    const { limit = String(PAGINATION_LIMITS.DEFAULT_PAGE_SIZE), offset = '0' } = req.query;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const accessScope = await getUserAccessScope(userId, userRole);
    const accessFilter = buildContactAccessFilter(accessScope);

    const members = await db()
      .select()
      .from(segmentMembers)
      .where(eq(segmentMembers.segmentId, id))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    type SegmentMember = InferSelectModel<typeof segmentMembers>;
    const contactIds = members.map((m: SegmentMember) => m.contactId);

    let contactsList: InferSelectModel<typeof contacts>[] = [];
    if (contactIds.length > 0) {
      contactsList = await db()
        .select()
        .from(contacts)
        .where(and(inArray(contacts.id, contactIds), accessFilter.whereClause));
    }

    return {
      data: contactsList,
      meta: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    };
  })
);

// GET /segments/:id/export - Export segment to CSV
router.get(
  '/:id/export',
  requireAuth,
  validate({ params: idParamSchema }),
  createAsyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const accessScope = await getUserAccessScope(userId, userRole);
    const accessFilter = buildContactAccessFilter(accessScope);

    const members = await db()
      .select()
      .from(segmentMembers)
      .where(eq(segmentMembers.segmentId, id));

    type SegmentMember = InferSelectModel<typeof segmentMembers>;
    const contactIds = members.map((m: SegmentMember) => m.contactId);

    let contactsList: InferSelectModel<typeof contacts>[] = [];
    if (contactIds.length > 0) {
      contactsList = await db()
        .select()
        .from(contacts)
        .where(and(inArray(contacts.id, contactIds), accessFilter.whereClause));
    }

    // Convert to simple CSV
    const headers = ['id', 'fullName', 'email', 'phone', 'pipelineStageId', 'assignedAdvisorId'];
    const csv = [
      headers.join(','),
      ...contactsList.map((item) =>
        headers.map((h) => item[h as keyof typeof item] || '').join(',')
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="segment_export_${id}_${new Date().toISOString()}.csv"`
    );
    res.send(csv);

    req.log.info({ segmentId: id, count: contactsList.length }, 'segment exported');
  })
);

export default router;
