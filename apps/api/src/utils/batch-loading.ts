/**
 * Batch Loading Utilities
 * 
 * Provides typed utilities for loading relations in batch to avoid N+1 queries
 * 
 * AI_DECISION: Create generic batch loading utilities with proper typing
 * Justificación: Reusable batch loading functions reduce code duplication and prevent N+1 queries
 * Impacto: Better performance, type safety, and consistent patterns across the codebase
 */

import { db } from '@cactus/db';
import { contactTags, tags, tasks, notes, brokerAccounts, clientPortfolioAssignments } from '@cactus/db/schema';
import { eq, inArray, and, isNull, desc } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

// Type definitions
export type ContactTag = InferSelectModel<typeof tags>;
export type Task = InferSelectModel<typeof tasks>;
export type Note = InferSelectModel<typeof notes>;
export type BrokerAccount = InferSelectModel<typeof brokerAccounts>;
export type PortfolioAssignment = InferSelectModel<typeof clientPortfolioAssignments>;

export interface ContactTagWithContactId extends ContactTag {
  contactId: string;
}

/**
 * Batch load contact tags for multiple contacts
 * @param contactIds - Array of contact IDs
 * @returns Map of contactId -> tags array
 */
export async function batchLoadContactTags(
  contactIds: string[]
): Promise<Map<string, ContactTag[]>> {
  if (contactIds.length === 0) {
    return new Map();
  }

  const results = await db()
    .select({
      contactId: contactTags.contactId,
      id: tags.id,
      name: tags.name,
      color: tags.color,
      icon: tags.icon,
      scope: tags.scope,
      description: tags.description
    })
    .from(contactTags)
    .innerJoin(tags, eq(contactTags.tagId, tags.id))
    .where(inArray(contactTags.contactId, contactIds));

  const tagsMap = new Map<string, ContactTag[]>();
  
  for (const result of results) {
    if (!result.contactId) continue;
    
    if (!tagsMap.has(result.contactId)) {
      tagsMap.set(result.contactId, []);
    }
    
    tagsMap.get(result.contactId)!.push({
      id: result.id,
      name: result.name,
      color: result.color,
      icon: result.icon,
      scope: result.scope,
      description: result.description,
      businessLine: null, // Not selected, but type requires it
      isSystem: false, // Not selected, but type requires it
      createdByUserId: null, // Not selected, but type requires it
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // Ensure all contactIds have an entry (even if empty)
  for (const contactId of contactIds) {
    if (!tagsMap.has(contactId)) {
      tagsMap.set(contactId, []);
    }
  }

  return tagsMap;
}

/**
 * Batch load tasks for multiple contacts
 * @param contactIds - Array of contact IDs
 * @param options - Optional filters (limit, includeCompleted, includeDeleted)
 * @returns Map of contactId -> tasks array
 */
export async function batchLoadTasks(
  contactIds: string[],
  options: {
    limit?: number;
    includeCompleted?: boolean;
    includeDeleted?: boolean;
  } = {}
): Promise<Map<string, Task[]>> {
  if (contactIds.length === 0) {
    return new Map();
  }

  const { limit = 50, includeCompleted = false, includeDeleted = false } = options;

  const conditions = [inArray(tasks.contactId, contactIds)];

  if (!includeCompleted) {
    conditions.push(isNull(tasks.completedAt));
  }

  if (!includeDeleted) {
    conditions.push(isNull(tasks.deletedAt));
  }

  const results = await db()
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(desc(tasks.createdAt))
    .limit(limit * contactIds.length); // Rough limit, will be refined per contact

  const tasksMap = new Map<string, Task[]>();

  for (const task of results) {
    if (!task.contactId) continue;

    if (!tasksMap.has(task.contactId)) {
      tasksMap.set(task.contactId, []);
    }

    const contactTasks = tasksMap.get(task.contactId)!;
    if (contactTasks.length < limit) {
      contactTasks.push(task);
    }
  }

  // Ensure all contactIds have an entry (even if empty)
  for (const contactId of contactIds) {
    if (!tasksMap.has(contactId)) {
      tasksMap.set(contactId, []);
    }
  }

  return tasksMap;
}

/**
 * Batch load notes for multiple contacts
 * @param contactIds - Array of contact IDs
 * @param options - Optional filters (limit, includeDeleted)
 * @returns Map of contactId -> notes array
 */
export async function batchLoadNotes(
  contactIds: string[],
  options: {
    limit?: number;
    includeDeleted?: boolean;
  } = {}
): Promise<Map<string, Note[]>> {
  if (contactIds.length === 0) {
    return new Map();
  }

  const { limit = 50, includeDeleted = false } = options;

  const conditions = [inArray(notes.contactId, contactIds)];

  if (!includeDeleted) {
    conditions.push(isNull(notes.deletedAt));
  }

  const results = await db()
    .select()
    .from(notes)
    .where(and(...conditions))
    .orderBy(desc(notes.createdAt))
    .limit(limit * contactIds.length); // Rough limit, will be refined per contact

  const notesMap = new Map<string, Note[]>();

  for (const note of results) {
    if (!note.contactId) continue;

    if (!notesMap.has(note.contactId)) {
      notesMap.set(note.contactId, []);
    }

    const contactNotes = notesMap.get(note.contactId)!;
    if (contactNotes.length < limit) {
      contactNotes.push(note);
    }
  }

  // Ensure all contactIds have an entry (even if empty)
  for (const contactId of contactIds) {
    if (!notesMap.has(contactId)) {
      notesMap.set(contactId, []);
    }
  }

  return notesMap;
}

/**
 * Batch load broker accounts for multiple contacts
 * @param contactIds - Array of contact IDs
 * @param options - Optional filters (includeDeleted)
 * @returns Map of contactId -> broker accounts array
 */
export async function batchLoadBrokerAccounts(
  contactIds: string[],
  options: {
    includeDeleted?: boolean;
  } = {}
): Promise<Map<string, BrokerAccount[]>> {
  if (contactIds.length === 0) {
    return new Map();
  }

  const { includeDeleted = false } = options;

  const conditions = [inArray(brokerAccounts.contactId, contactIds)];

  if (!includeDeleted) {
    conditions.push(isNull(brokerAccounts.deletedAt));
  }

  const results = await db()
    .select()
    .from(brokerAccounts)
    .where(and(...conditions));

  const accountsMap = new Map<string, BrokerAccount[]>();

  for (const account of results) {
    if (!account.contactId) continue;

    if (!accountsMap.has(account.contactId)) {
      accountsMap.set(account.contactId, []);
    }

    accountsMap.get(account.contactId)!.push(account);
  }

  // Ensure all contactIds have an entry (even if empty)
  for (const contactId of contactIds) {
    if (!accountsMap.has(contactId)) {
      accountsMap.set(contactId, []);
    }
  }

  return accountsMap;
}

/**
 * Batch load portfolio assignments for multiple contacts
 * @param contactIds - Array of contact IDs
 * @param options - Optional filters (status)
 * @returns Map of contactId -> portfolio assignments array
 */
export async function batchLoadPortfolioAssignments(
  contactIds: string[],
  options: {
    status?: 'active' | 'paused' | 'ended';
  } = {}
): Promise<Map<string, PortfolioAssignment[]>> {
  if (contactIds.length === 0) {
    return new Map();
  }

  const { status } = options;

  const conditions = [inArray(clientPortfolioAssignments.contactId, contactIds)];

  if (status) {
    conditions.push(eq(clientPortfolioAssignments.status, status));
  }

  const results = await db()
    .select()
    .from(clientPortfolioAssignments)
    .where(and(...conditions))
    .orderBy(desc(clientPortfolioAssignments.createdAt));

  const assignmentsMap = new Map<string, PortfolioAssignment[]>();

  for (const assignment of results) {
    if (!assignment.contactId) continue;

    if (!assignmentsMap.has(assignment.contactId)) {
      assignmentsMap.set(assignment.contactId, []);
    }

    assignmentsMap.get(assignment.contactId)!.push(assignment);
  }

  // Ensure all contactIds have an entry (even if empty)
  for (const contactId of contactIds) {
    if (!assignmentsMap.has(contactId)) {
      assignmentsMap.set(contactId, []);
    }
  }

  return assignmentsMap;
}

/**
 * Batch load all relations for multiple contacts in parallel
 * @param contactIds - Array of contact IDs
 * @param options - Options for each relation type
 * @returns Object with maps for each relation type
 */
export async function batchLoadAllContactRelations(
  contactIds: string[],
  options: {
    tags?: boolean;
    tasks?: { limit?: number; includeCompleted?: boolean };
    notes?: { limit?: number };
    brokerAccounts?: boolean;
    portfolioAssignments?: { status?: 'active' | 'paused' | 'ended' };
  } = {}
): Promise<{
  tags: Map<string, ContactTag[]>;
  tasks: Map<string, Task[]>;
  notes: Map<string, Note[]>;
  brokerAccounts: Map<string, BrokerAccount[]>;
  portfolioAssignments: Map<string, PortfolioAssignment[]>;
}> {
  const {
    tags: loadTags = true,
    tasks: tasksOptions,
    notes: notesOptions,
    brokerAccounts: loadBrokerAccounts = true,
    portfolioAssignments: portfolioOptions
  } = options;

  const promises: Promise<unknown>[] = [];
  const results: {
    tags?: Map<string, ContactTag[]>;
    tasks?: Map<string, Task[]>;
    notes?: Map<string, Note[]>;
    brokerAccounts?: Map<string, BrokerAccount[]>;
    portfolioAssignments?: Map<string, PortfolioAssignment[]>;
  } = {};

  if (loadTags) {
    promises.push(
      batchLoadContactTags(contactIds).then(tags => {
        results.tags = tags;
      })
    );
  }

  if (tasksOptions !== undefined) {
    promises.push(
      batchLoadTasks(contactIds, tasksOptions).then(tasks => {
        results.tasks = tasks;
      })
    );
  }

  if (notesOptions !== undefined) {
    promises.push(
      batchLoadNotes(contactIds, notesOptions).then(notes => {
        results.notes = notes;
      })
    );
  }

  if (loadBrokerAccounts) {
    promises.push(
      batchLoadBrokerAccounts(contactIds).then(accounts => {
        results.brokerAccounts = accounts;
      })
    );
  }

  if (portfolioOptions !== undefined) {
    promises.push(
      batchLoadPortfolioAssignments(contactIds, portfolioOptions).then(assignments => {
        results.portfolioAssignments = assignments;
      })
    );
  }

  await Promise.all(promises);

  return {
    tags: results.tags || new Map(),
    tasks: results.tasks || new Map(),
    notes: results.notes || new Map(),
    brokerAccounts: results.brokerAccounts || new Map(),
    portfolioAssignments: results.portfolioAssignments || new Map()
  };
}

