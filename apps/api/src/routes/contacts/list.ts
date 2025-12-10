/**
 * Contacts List Route
 *
 * GET /contacts - List contacts with filters and pagination
 */
import { Router, type Request, type Response } from 'express';
import { db, contacts, contactTags, tags } from '@cactus/db';
import { eq, desc, and, isNull, sql, inArray } from 'drizzle-orm';
import { requireAuth, requireContactAccess } from '../../auth/middlewares';
import { getUserAccessScope } from '../../auth/authorization';
import { createDrizzleLogger } from '../../utils/database/db-logger';
import { validate } from '../../utils/validation';
import {
  type Contact,
  type ContactTag,
  type ContactTagWithInfo,
  type ContactWithTags,
} from '../../types/contacts';
import { contactsListCacheUtil, normalizeCacheKey } from '../../utils/performance/cache';
import { listContactsQuerySchema } from './schemas';
import { cache } from '../../middleware/cache';
import { REDIS_TTL } from '../../config/redis';
import { buildCacheKey } from '../../config/redis';
import { formatPaginatedResponse } from '../../utils/pagination';
import { createAsyncHandler } from '../../utils/route-handler';

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
  createAsyncHandler(async (req: Request, res: Response) => {
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

    const { limit = '50', offset = '0', pipelineStageId, assignedAdvisorId } = req.query;

    // Get user access scope for data isolation
    req.log.info({ userId, userRole }, 'Getting user access scope');
    const accessScope = await getUserAccessScope(userId, userRole);
    req.log.info(
      {
        accessScope: {
          userId: accessScope.userId,
          role: accessScope.role,
          accessibleAdvisorIdsCount: accessScope.accessibleAdvisorIds.length,
          canSeeUnassigned: accessScope.canSeeUnassigned,
        },
      },
      'User access scope obtained'
    );

    // If filtering by assignedAdvisorId, validate access first
    if (assignedAdvisorId) {
      const advisorIdStr = assignedAdvisorId as string;

      req.log.info(
        {
          userId,
          userRole,
          requestedAdvisorId: advisorIdStr,
          accessibleAdvisorIdsCount: accessScope.accessibleAdvisorIds.length,
          accessibleAdvisorIds: accessScope.accessibleAdvisorIds,
          canSeeUnassigned: accessScope.canSeeUnassigned,
          action: 'filter_by_assigned_advisor_initiated',
        },
        'Filtering contacts by assignedAdvisorId - initializing'
      );

      // For non-admin users, validate that the advisor is accessible
      if (userRole !== 'admin') {
        const hasAccess =
          accessScope.accessibleAdvisorIds.length === 0 ||
          accessScope.accessibleAdvisorIds.includes(advisorIdStr);

        req.log.info(
          {
            userId,
            userRole,
            requestedAdvisorId: advisorIdStr,
            accessibleAdvisorIds: accessScope.accessibleAdvisorIds,
            hasAccess,
            action: 'access_check_for_advisor_filter',
          },
          `Access check for advisor filter: ${hasAccess ? 'GRANTED' : 'DENIED'}`
        );

        if (!hasAccess && accessScope.accessibleAdvisorIds.length > 0) {
          req.log.warn(
            {
              userId,
              userRole,
              requestedAdvisorId: advisorIdStr,
              accessibleAdvisorIds: accessScope.accessibleAdvisorIds,
              reason: 'advisor_not_in_accessible_list',
              action: 'access_denied_advisor_filter',
            },
            'User attempted to filter by advisor they do not have access to'
          );

          const limitNum = parseInt(limit as string) || 50;
          const offsetNum = parseInt(offset as string) || 0;
          const paginatedResponse = formatPaginatedResponse([], 0, {
            limit: limitNum,
            offset: offsetNum,
          });
          return res.json({
            success: true,
            ...paginatedResponse,
            requestId: req.requestId,
          });
        }
      }

      // Build a more specific access filter that excludes unassigned contacts
      const specificAccessFilter =
        accessScope.role === 'admin'
          ? sql`1=1`
          : accessScope.accessibleAdvisorIds.length > 0
            ? inArray(contacts.assignedAdvisorId, accessScope.accessibleAdvisorIds)
            : sql`1=0`;

      const conditions = [
        isNull(contacts.deletedAt),
        specificAccessFilter,
        eq(contacts.assignedAdvisorId, advisorIdStr),
      ];

      if (pipelineStageId) {
        if (pipelineStageId === 'null' || pipelineStageId === '') {
          conditions.push(isNull(contacts.pipelineStageId));
        } else {
          conditions.push(eq(contacts.pipelineStageId, pipelineStageId as string));
        }
      }

      const dbLogger = createDrizzleLogger(req.log);
      const items = await dbLogger.select('list_contacts_main_query', () =>
        db()
          .select({
            id: contacts.id,
            firstName: contacts.firstName,
            lastName: contacts.lastName,
            fullName: contacts.fullName,
            email: contacts.email,
            phone: contacts.phone,
            country: contacts.country,
            dni: contacts.dni,
            pipelineStageId: contacts.pipelineStageId,
            source: contacts.source,
            riskProfile: contacts.riskProfile,
            assignedAdvisorId: contacts.assignedAdvisorId,
            assignedTeamId: contacts.assignedTeamId,
            nextStep: contacts.nextStep,
            notes: contacts.notes,
            queSeDedica: contacts.queSeDedica,
            familia: contacts.familia,
            expectativas: contacts.expectativas,
            objetivos: contacts.objetivos,
            requisitosPlanificacion: contacts.requisitosPlanificacion,
            prioridades: contacts.prioridades,
            preocupaciones: contacts.preocupaciones,
            ingresos: contacts.ingresos,
            gastos: contacts.gastos,
            excedente: contacts.excedente,
            customFields: contacts.customFields,
            contactLastTouchAt: contacts.contactLastTouchAt,
            pipelineStageUpdatedAt: contacts.pipelineStageUpdatedAt,
            deletedAt: contacts.deletedAt,
            version: contacts.version,
            createdAt: contacts.createdAt,
            updatedAt: contacts.updatedAt,
            total: sql<number>`COUNT(*) OVER()`.as('total'),
          })
          .from(contacts)
          .where(and(...conditions))
          .limit(parseInt(limit as string))
          .offset(parseInt(offset as string))
          .orderBy(desc(contacts.updatedAt))
      );

      type ContactWithTotal = Contact & { total: number };
      const itemsTyped = items as ContactWithTotal[];
      const total = itemsTyped.length > 0 ? Number(itemsTyped[0].total) : 0;

      const contactsList = itemsTyped.map(
        ({ total: _total, ...contact }: ContactWithTotal) => contact
      ) as Contact[];

      // Fetch tags for contacts
      const contactIds = contactsList.map((c: Contact) => c.id);
      const contactTagsMap = new Map<string, ContactTag[]>();

      if (contactIds.length > 0) {
        const contactTagsList = (await dbLogger.select('list_contacts_tags_query', () =>
          db()
            .select({
              contactId: contactTags.contactId,
              id: tags.id,
              name: tags.name,
              color: tags.color,
              icon: tags.icon,
            })
            .from(contactTags)
            .innerJoin(tags, eq(contactTags.tagId, tags.id))
            .where(inArray(contactTags.contactId, contactIds))
        )) as ContactTagWithInfo[];

        contactTagsList.forEach((ct: ContactTagWithInfo) => {
          if (ct.contactId) {
            if (!contactTagsMap.has(ct.contactId)) {
              contactTagsMap.set(ct.contactId, []);
            }
            contactTagsMap.get(ct.contactId)!.push({
              id: ct.id,
              name: ct.name,
              color: ct.color,
              icon: ct.icon,
            });
          }
        });
      }

      const itemsWithTags = contactsList.map(
        (contact: Contact): ContactWithTags => ({
          ...contact,
          tags: contactTagsMap.get(contact.id) || [],
        })
      );

      const duration = Date.now() - startTime;
      req.log.info(
        {
          duration,
          count: itemsWithTags.length,
          userId,
          userRole,
          requestedAdvisorId: advisorIdStr,
          action: 'list_contacts_filtered_by_advisor',
        },
        'Listado de contactos exitoso - filtrado por advisor'
      );

      const limitNum = parseInt(limit as string) || 50;
      const offsetNum = parseInt(offset as string) || 0;
      const paginatedResponse = formatPaginatedResponse(itemsWithTags, total, {
        limit: limitNum,
        offset: offsetNum,
      });
      return res.json({
        success: true,
        ...paginatedResponse,
        requestId: req.requestId,
      });
    }

    // Default behavior - show only user's own contacts
    req.log.info(
      {
        userId,
        userRole,
        action: 'default_contacts_list_own_only',
        message: "Showing only user's own contacts (no advisorId filter provided)",
      },
      "Building default filter - user's own contacts only"
    );

    const conditions = [isNull(contacts.deletedAt), eq(contacts.assignedAdvisorId, userId)];

    if (pipelineStageId) {
      if (pipelineStageId === 'null' || pipelineStageId === '') {
        conditions.push(isNull(contacts.pipelineStageId));
      } else {
        conditions.push(eq(contacts.pipelineStageId, pipelineStageId as string));
      }
    }

    // Redis cache is handled by middleware, but we keep NodeCache as fallback
    const limitNum =
      typeof limit === 'string' ? parseInt(limit) : typeof limit === 'number' ? limit : 20;
    const offsetNum =
      typeof offset === 'string' ? parseInt(offset) : typeof offset === 'number' ? offset : 0;
    const assignedAdvisorIdStr = typeof assignedAdvisorId === 'string' ? assignedAdvisorId : 'all';
    const pipelineStageIdStr = typeof pipelineStageId === 'string' ? pipelineStageId : 'all';
    const cacheKey = normalizeCacheKey(
      'contacts',
      'list',
      assignedAdvisorIdStr,
      pipelineStageIdStr,
      limitNum,
      offsetNum
    );

    // Fallback to NodeCache if Redis cache missed (middleware already tried Redis)
    const cachedResult = contactsListCacheUtil.get(cacheKey);
    if (cachedResult) {
      req.log.info({ cacheKey }, 'Serving contacts list from NodeCache fallback');
      return res.json({
        ...cachedResult,
        requestId: req.requestId,
      });
    }

    const dbLogger = createDrizzleLogger(req.log);

    const items = await dbLogger.select('list_contacts_main_query', () =>
      db()
        .select({
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          fullName: contacts.fullName,
          email: contacts.email,
          phone: contacts.phone,
          country: contacts.country,
          dni: contacts.dni,
          pipelineStageId: contacts.pipelineStageId,
          source: contacts.source,
          riskProfile: contacts.riskProfile,
          assignedAdvisorId: contacts.assignedAdvisorId,
          assignedTeamId: contacts.assignedTeamId,
          nextStep: contacts.nextStep,
          notes: contacts.notes,
          queSeDedica: contacts.queSeDedica,
          familia: contacts.familia,
          expectativas: contacts.expectativas,
          objetivos: contacts.objetivos,
          requisitosPlanificacion: contacts.requisitosPlanificacion,
          prioridades: contacts.prioridades,
          preocupaciones: contacts.preocupaciones,
          ingresos: contacts.ingresos,
          gastos: contacts.gastos,
          excedente: contacts.excedente,
          customFields: contacts.customFields,
          contactLastTouchAt: contacts.contactLastTouchAt,
          pipelineStageUpdatedAt: contacts.pipelineStageUpdatedAt,
          deletedAt: contacts.deletedAt,
          version: contacts.version,
          createdAt: contacts.createdAt,
          updatedAt: contacts.updatedAt,
          total: sql<number>`COUNT(*) OVER()`.as('total'),
        })
        .from(contacts)
        .where(and(...conditions))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string))
        .orderBy(desc(contacts.updatedAt))
    );

    type ContactWithTotal = Contact & { total: number };
    const itemsTyped = items as ContactWithTotal[];
    const total = itemsTyped.length > 0 ? Number(itemsTyped[0].total) : 0;

    const contactsListMain = itemsTyped.map(
      ({ total: _total, ...contact }: ContactWithTotal) => contact
    ) as Contact[];

    // Fetch tags
    const contactIdsMain = contactsListMain.map((c: Contact) => c.id);
    const contactTagsMapMain = new Map<string, ContactTag[]>();

    if (contactIdsMain.length > 0) {
      const contactTagsListMain = (await dbLogger.select('list_contacts_tags_query', () =>
        db()
          .select({
            contactId: contactTags.contactId,
            id: tags.id,
            name: tags.name,
            color: tags.color,
            icon: tags.icon,
          })
          .from(contactTags)
          .innerJoin(tags, eq(contactTags.tagId, tags.id))
          .where(inArray(contactTags.contactId, contactIdsMain))
      )) as ContactTagWithInfo[];

      contactTagsListMain.forEach((ct: ContactTagWithInfo) => {
        if (ct.contactId) {
          if (!contactTagsMapMain.has(ct.contactId)) {
            contactTagsMapMain.set(ct.contactId, []);
          }
          contactTagsMapMain.get(ct.contactId)!.push({
            id: ct.id,
            name: ct.name,
            color: ct.color,
            icon: ct.icon,
          });
        }
      });
    }

    const itemsWithTags = contactsListMain.map(
      (contact: Contact): ContactWithTags => ({
        ...contact,
        tags: contactTagsMapMain.get(contact.id) || [],
      })
    );

    const duration = Date.now() - startTime;
    req.log.info(
      {
        duration,
        count: itemsWithTags.length,
        userId,
        userRole,
        action: 'list_contacts',
      },
      'Listado de contactos exitoso'
    );

    const paginatedResponse = formatPaginatedResponse(itemsWithTags, total, {
      limit: limitNum,
      offset: offsetNum,
    });

    const response = {
      success: true,
      ...paginatedResponse,
      requestId: req.requestId,
    };

    // Cache first page only
    if (offsetNum === 0) {
      contactsListCacheUtil.set(cacheKey, response);
    }

    return res.json(response);
  })
);

export default router;
