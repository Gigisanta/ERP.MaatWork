/**
 * Contact Service - Business logic for contacts domain
 */
import { db, contacts, contactTags, tags, contactStageInteractions, users, teams } from '@maatwork/db';
import { eq, desc, and, isNull, sql, inArray } from 'drizzle-orm';
import type { Logger } from 'pino';
import {
  type Contact,
  type ContactTag,
  type ContactTagWithInfo,
  type ContactWithTags,
  type UserRole,
  type PaginatedResponse,
} from '@maatwork/types';
import { getUserAccessScope, buildContactAccessFilter } from '../auth/authorization';
import { createDrizzleLogger } from '../utils/database/db-logger';
import { formatPaginatedResponse } from '../utils/pagination';

interface ListContactsParams {
  userId: string;
  userRole: UserRole;
  limit: number;
  offset: number;
  pipelineStageId?: string;
  assignedAdvisorId?: string;
  log: Logger;
}

/**
 * List contacts with filters, pagination and access control
 */
export async function listContacts({
  userId,
  userRole,
  limit,
  offset,
  pipelineStageId,
  assignedAdvisorId,
  log,
}: ListContactsParams): Promise<PaginatedResponse<ContactWithTags>> {
  const dbLogger = createDrizzleLogger(log);

  // 1. Get user access scope
  const accessScope = await getUserAccessScope(userId, userRole);
  const accessFilter = buildContactAccessFilter(accessScope);
  
  // 2. Build additional filters
  const conditions = [isNull(contacts.deletedAt), accessFilter.whereClause];
  
  if (assignedAdvisorId) {
    conditions.push(eq(contacts.assignedAdvisorId, assignedAdvisorId));
  }
  
  if (pipelineStageId) {
    if (pipelineStageId === 'null' || pipelineStageId === '') {
      conditions.push(isNull(contacts.pipelineStageId));
    } else {
      conditions.push(eq(contacts.pipelineStageId, pipelineStageId));
    }
  }

  // 3. Main Query with Joins for Advisor and Team info
  const items = await dbLogger.select('list_contacts_service_query', () =>
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
        assignedAdvisorName: users.fullName,
        assignedTeamId: contacts.assignedTeamId,
        assignedTeamName: teams.name,
        nextStep: contacts.nextStep,
        contactLastTouchAt: contacts.contactLastTouchAt,
        pipelineStageUpdatedAt: contacts.pipelineStageUpdatedAt,
        deletedAt: contacts.deletedAt,
        meetingStatus: contacts.meetingStatus,
        version: contacts.version,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
        interactionCount: contactStageInteractions.interactionCount,
        total: sql<number>`COUNT(*) OVER()`.as('total'),
      })
      .from(contacts)
      .leftJoin(users, eq(contacts.assignedAdvisorId, users.id))
      .leftJoin(teams, eq(contacts.assignedTeamId, teams.id))
      .leftJoin(
        contactStageInteractions,
        and(
          eq(contactStageInteractions.contactId, contacts.id),
          eq(contactStageInteractions.pipelineStageId, contacts.pipelineStageId)
        )
      )
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(contacts.updatedAt))
  );

  type ContactWithTotal = Contact & { total: number; interactionCount: number | null };
  const itemsTyped = items as ContactWithTotal[];
  const total = itemsTyped.length > 0 ? Number(itemsTyped[0].total) : 0;

  const contactsList = itemsTyped.map(
    ({ total: _total, ...contact }: ContactWithTotal) => contact
  ) as (Contact & { interactionCount: number | null })[];

  // 5. Fetch Tags
  const contactIds = contactsList.map((c: Contact) => c.id);
  const contactTagsMap = new Map<string, ContactTag[]>();

  if (contactIds.length > 0) {
    const contactTagsList = (await dbLogger.select('list_contacts_service_tags_query', () =>
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

  // 6. Merge Tags and Return
  const itemsWithTags = contactsList.map(
    (contact): ContactWithTags => ({
      ...contact,
      tags: contactTagsMap.get(contact.id) || [],
    })
  );

  return formatPaginatedResponse(itemsWithTags, total, { limit, offset });
}



