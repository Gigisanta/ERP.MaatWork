/**
 * Contacts Get Routes
 *
 * GET /contacts/:id - Get contact detail (basic)
 * GET /contacts/:id/detail - Get contact detail (consolidated with all related data)
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  db,
  contacts,
  contactTags,
  tags,
  tasks,
  attachments,
  pipelineStages,
  users,
  brokerAccounts,
  notes,
  clientPortfolioAssignments,
} from '@cactus/db';
import { eq, desc, and, isNull, sql, type InferSelectModel } from 'drizzle-orm';
import { requireAuth } from '../../auth/middlewares';
import { getUserAccessScope, buildContactAccessFilter } from '../../auth/authorization';
import { createDrizzleLogger, createOperationName } from '../../utils/db-logger';
import { validate } from '../../utils/validation';
import { idParamSchema } from '../../utils/common-schemas';
import { type Contact, type TimelineItem } from '../../types/contacts';
import { contactDetailQuerySchema } from './schemas';

const router = Router();

/**
 * GET /contacts/:id - Get basic contact detail with timeline
 */
router.get(
  '/:id',
  requireAuth,
  validate({
    params: idParamSchema,
    query: contactDetailQuerySchema,
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const { id } = req.params;
    const { includeTimeline = 'true' } = req.query;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    req.log.info(
      {
        userId,
        userRole,
        action: 'get_contact_detail',
        contactId: id,
        includeTimeline,
      },
      'Iniciando obtención de detalle de contacto'
    );

    try {
      const accessScope = await getUserAccessScope(userId, userRole);
      const accessFilter = buildContactAccessFilter(accessScope);

      const [contact] = await db()
        .select()
        .from(contacts)
        .where(and(eq(contacts.id, id), isNull(contacts.deletedAt), accessFilter.whereClause))
        .limit(1);

      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      // Parallel queries for related data
      const [tagsResult, recentTasks, attachmentsList] = await Promise.all([
        db()
          .select({
            id: tags.id,
            name: tags.name,
            color: tags.color,
            icon: tags.icon,
          })
          .from(contactTags)
          .innerJoin(tags, eq(contactTags.tagId, tags.id))
          .where(eq(contactTags.contactId, id)),

        includeTimeline === 'true'
          ? db()
              .select()
              .from(tasks)
              .where(and(eq(tasks.contactId, id), isNull(tasks.deletedAt)))
              .orderBy(desc(tasks.createdAt))
              .limit(10)
          : Promise.resolve([]),

        db()
          .select()
          .from(attachments)
          .where(and(eq(attachments.contactId, id), isNull(attachments.deletedAt)))
          .orderBy(desc(attachments.createdAt))
          .limit(20),
      ]);

      let timeline = null;
      if (includeTimeline === 'true' && recentTasks.length > 0) {
        type TaskForTimeline = InferSelectModel<typeof tasks>;
        timeline = recentTasks
          .map(
            (t: TaskForTimeline): TimelineItem => ({
              ...t,
              type: 'task',
              timestamp: t.createdAt,
            })
          )
          .sort(
            (a: TimelineItem, b: TimelineItem) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
      }

      const duration = Date.now() - startTime;
      req.log.info(
        {
          duration,
          contactId: id,
          userId,
          userRole,
          action: 'get_contact_detail',
          hasTimeline: !!timeline,
          attachmentsCount: attachmentsList.length,
        },
        'Obtención de detalle de contacto exitosa'
      );

      res.json({
        data: {
          ...contact,
          tags: tagsResult,
          timeline,
          attachments: attachmentsList,
        },
      });
    } catch (err) {
      const duration = Date.now() - startTime;
      req.log.error(
        {
          err,
          duration,
          contactId: id,
          userId,
          userRole,
          action: 'get_contact_detail',
        },
        'Error en obtención de detalle de contacto'
      );
      next(err);
    }
  }
);

/**
 * GET /contacts/:id/detail - Get consolidated contact detail with all related data
 */
router.get(
  '/:id/detail',
  requireAuth,
  validate({
    params: idParamSchema,
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    req.log.info(
      {
        userId,
        userRole,
        action: 'get_contact_detail_consolidated',
        contactId: id,
      },
      'Iniciando obtención de detalle consolidado de contacto'
    );

    try {
      const accessScope = await getUserAccessScope(userId, userRole);
      const accessFilter = buildContactAccessFilter(accessScope);
      const dbLogger = createDrizzleLogger(req.log);
      const operationName = createOperationName('get_contact_detail_consolidated', id);

      type ContactDetailResult = Array<{
        contact: Contact;
        tags: Array<{ id: string; name: string; color: string; icon: string | null }>;
        tasks: Array<{
          id: string;
          title: string;
          description: string | null;
          status: string;
          dueDate: string | null;
          priority: string;
          assignedToUserId: string;
          createdAt: string;
        }>;
        notes: Array<{
          id: string;
          content: string;
          source: string;
          noteType: string;
          createdAt: string;
        }>;
        brokerAccounts: Array<{
          id: string;
          broker: string;
          accountNumber: string;
          holderName: string | null;
          status: string;
        }>;
        portfolioAssignments: Array<{
          id: string;
          templateId: string;
          status: string;
          startDate: string;
          endDate: string | null;
        }>;
      }>;

      const [contactResult, stagesResult, advisorsResult] = await Promise.all([
        dbLogger.select(operationName, () =>
          db()
            .select({
              contact: {
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
                createdAt: contacts.createdAt,
                updatedAt: contacts.updatedAt,
              },
              tags: sql<Array<{ id: string; name: string; color: string; icon: string | null }>>`
              COALESCE(
                (
                  SELECT json_agg(
                    json_build_object(
                      'id', t.id,
                      'name', t.name,
                      'color', t.color,
                      'icon', t.icon
                    )
                  )
                  FROM ${contactTags} ct
                  INNER JOIN ${tags} t ON ct.tag_id = t.id
                  WHERE ct.contact_id = ${contacts.id}
                ),
                '[]'::json
              )
            `,
              tasks: sql<
                Array<{
                  id: string;
                  title: string;
                  description: string | null;
                  status: string;
                  dueDate: string | null;
                  priority: string;
                  assignedToUserId: string;
                  createdAt: string;
                }>
              >`
              COALESCE(
                (
                  SELECT json_agg(
                    json_build_object(
                      'id', tk.id,
                      'title', tk.title,
                      'description', tk.description,
                      'status', tk.status,
                      'dueDate', tk.due_date,
                      'priority', tk.priority,
                      'assignedToUserId', tk.assigned_to_user_id,
                      'createdAt', tk.created_at
                    )
                    ORDER BY tk.created_at DESC
                  )
                  FROM ${tasks} tk
                  WHERE tk.contact_id = ${contacts.id}
                    AND tk.deleted_at IS NULL
                  LIMIT 50
                ),
                '[]'::json
              )
            `,
              notes: sql<
                Array<{
                  id: string;
                  content: string;
                  source: string;
                  noteType: string;
                  createdAt: string;
                }>
              >`
              COALESCE(
                (
                  SELECT json_agg(
                    json_build_object(
                      'id', n.id,
                      'content', n.content,
                      'source', n.source,
                      'noteType', n.note_type,
                      'createdAt', n.created_at
                    )
                    ORDER BY n.created_at DESC
                  )
                  FROM ${notes} n
                  WHERE n.contact_id = ${contacts.id}
                    AND n.deleted_at IS NULL
                  LIMIT 50
                ),
                '[]'::json
              )
            `,
              brokerAccounts: sql<
                Array<{
                  id: string;
                  broker: string;
                  accountNumber: string;
                  holderName: string | null;
                  status: string;
                }>
              >`
              COALESCE(
                (
                  SELECT json_agg(
                    json_build_object(
                      'id', ba.id,
                      'broker', ba.broker,
                      'accountNumber', ba.account_number,
                      'holderName', ba.holder_name,
                      'status', ba.status
                    )
                  )
                  FROM ${brokerAccounts} ba
                  WHERE ba.contact_id = ${contacts.id}
                    AND ba.deleted_at IS NULL
                ),
                '[]'::json
              )
            `,
              portfolioAssignments: sql<
                Array<{
                  id: string;
                  templateId: string;
                  status: string;
                  startDate: string;
                  endDate: string | null;
                }>
              >`
              COALESCE(
                (
                  SELECT json_agg(
                    json_build_object(
                      'id', cpa.id,
                      'templateId', cpa.template_id,
                      'status', cpa.status,
                      'startDate', cpa.start_date,
                      'endDate', cpa.end_date
                    )
                    ORDER BY cpa.created_at DESC
                  )
                  FROM ${clientPortfolioAssignments} cpa
                  WHERE cpa.contact_id = ${contacts.id}
                ),
                '[]'::json
              )
            `,
            })
            .from(contacts)
            .where(and(eq(contacts.id, id), isNull(contacts.deletedAt), accessFilter.whereClause))
            .limit(1)
        ),
        dbLogger.select('get_pipeline_stages', () =>
          db()
            .select()
            .from(pipelineStages)
            .where(eq(pipelineStages.isActive, true))
            .orderBy(pipelineStages.order)
        ),
        dbLogger.select('get_advisors', () =>
          db()
            .select({
              id: users.id,
              email: users.email,
              fullName: users.fullName,
            })
            .from(users)
            .where(and(eq(users.role, 'advisor'), eq(users.isActive, true)))
        ),
      ]);

      const contactResultTyped = contactResult as ContactDetailResult;
      if (contactResultTyped.length === 0 || !contactResultTyped[0]) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      const contactDetail = contactResultTyped[0];
      const {
        contact,
        tags: contactTagsData,
        tasks: contactTasks,
        notes: contactNotes,
        brokerAccounts: contactBrokerAccounts,
        portfolioAssignments: contactPortfolioAssignments,
      } = contactDetail;

      const duration = Date.now() - startTime;
      req.log.info(
        {
          duration,
          contactId: id,
          userId,
          userRole,
          action: 'get_contact_detail_consolidated',
          tagsCount: contactTagsData?.length || 0,
          tasksCount: contactTasks?.length || 0,
          notesCount: contactNotes?.length || 0,
          brokerAccountsCount: contactBrokerAccounts?.length || 0,
          portfolioAssignmentsCount: contactPortfolioAssignments?.length || 0,
        },
        'Obtención de detalle consolidado de contacto exitosa'
      );

      res.json({
        data: {
          contact: {
            ...contact,
            tags: contactTagsData || [],
          },
          stages: stagesResult || [],
          advisors: advisorsResult || [],
          brokerAccounts: contactBrokerAccounts || [],
          portfolioAssignments: contactPortfolioAssignments || [],
          tasks: contactTasks || [],
          notes: contactNotes || [],
        },
      });
    } catch (err) {
      const duration = Date.now() - startTime;
      req.log.error(
        {
          err,
          duration,
          contactId: id,
          userId,
          userRole,
          action: 'get_contact_detail_consolidated',
        },
        'Error en obtención de detalle consolidado de contacto'
      );
      next(err);
    }
  }
);

export default router;
