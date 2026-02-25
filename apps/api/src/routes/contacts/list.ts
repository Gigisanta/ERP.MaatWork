/**
 * Contacts List Route
 *
 * GET /contacts - List contacts with filters and pagination
 */
import { Router, type Request, type Response } from 'express';
import { requireAuth, requireContactAccess } from '../../auth/middlewares';
import { validate } from '../../utils/validation';
import { listContactsQuerySchema } from './schemas';
import { cache } from '../../middleware/cache';
import { REDIS_TTL } from '../../config/redis';
import { buildCacheKey } from '../../config/redis';
import { createRouteHandler } from '../../utils/route-handler';
import * as contactService from '../../services/contact-service';

const router = Router();

/**
 * GET /contacts - List contacts with filters
 *
 * Supports pagination, filtering by pipelineStageId and assignedAdvisorId.
 * Results are cached for performance using Redis.
 */
router.get(
  '/',
  requireAuth,
  requireContactAccess, // Bloquear acceso a Owner
  validate({ query: listContactsQuerySchema }),
  cache({
    ttl: REDIS_TTL.CONTACTS,
    keyPrefix: 'contacts',
    keyBuilder: (req) => {
      const userId = req.user!.id;
      const { limit = '50', offset = '0', pipelineStageId, assignedAdvisorId } = req.query;
      const limitStr = typeof limit === 'string' ? limit : String(limit);
      const offsetStr = typeof offset === 'string' ? offset : String(offset);
      const pipelineStageIdStr = typeof pipelineStageId === 'string' ? pipelineStageId : 'all';
      const assignedAdvisorIdStr =
        typeof assignedAdvisorId === 'string' ? assignedAdvisorId : 'all';
      return buildCacheKey(
        'contacts',
        userId,
        limitStr,
        offsetStr,
        pipelineStageIdStr,
        assignedAdvisorIdStr
      );
    },
  }),
  createRouteHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    const userId = req.user!.id;
    const userRole = req.user!.role;

    req.log.info(
      {
        userId,
        userRole,
        action: 'list_contacts',
        query: req.query,
      },
      'Iniciando listado de contactos'
    );

    // AI_DECISION: Prevent browser caching for contacts list
    // Justificación: Interaction counts and states change frequently, we want fresh data on navigation/reload
    // Impacto: Prevents stale data issues (e.g. reverted interaction counts)
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const { limit = '50', offset = '0', pipelineStageId, assignedAdvisorId } = req.query;
    const limitNum = parseInt(limit as string) || 50;
    const offsetNum = parseInt(offset as string) || 0;

    const result = await contactService.listContacts({
      userId,
      userRole,
      limit: limitNum,
      offset: offsetNum,
      pipelineStageId: pipelineStageId as string,
      assignedAdvisorId: assignedAdvisorId as string,
      log: req.log,
    });

    const duration = Date.now() - startTime;
    req.log.info(
      {
        duration,
        count: result.data.length,
        userId,
        userRole,
        action: 'list_contacts_complete',
      },
      'Listado de contactos exitoso'
    );

    return result;
  })
);

export default router;
