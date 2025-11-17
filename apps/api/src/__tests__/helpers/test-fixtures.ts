/**
 * Test fixtures and factories
 * 
 * Provides factories to create test data for various entities
 */

import { db } from '@cactus/db';
import {
  contacts,
  tags,
  tasks,
  notes,
  teams,
  portfolioTemplates,
  benchmarkDefinitions,
  pipelineStages,
} from '@cactus/db/schema';
import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

/**
 * Create a test contact
 */
export async function createTestContact(overrides?: Partial<{
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  assignedAdvisorId: string;
  pipelineStageId: string;
}>): Promise<InferSelectModel<typeof contacts>> {
  const testContact = {
    id: overrides?.id || `test-contact-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    firstName: overrides?.firstName || 'Test',
    lastName: overrides?.lastName || 'Contact',
    email: overrides?.email || `test-contact-${Date.now()}@example.com`,
    phone: overrides?.phone || '+1234567890',
    assignedAdvisorId: overrides?.assignedAdvisorId || null,
    pipelineStageId: overrides?.pipelineStageId || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const [created] = await db()
    .insert(contacts)
    .values(testContact)
    .returning();

  return created;
}

/**
 * Create a test tag
 */
export async function createTestTag(overrides?: Partial<{
  id: string;
  name: string;
  color: string;
  icon: string;
}>): Promise<InferSelectModel<typeof tags>> {
  const testTag = {
    id: overrides?.id || `test-tag-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name: overrides?.name || `Test Tag ${Date.now()}`,
    color: overrides?.color || '#FF0000',
    icon: overrides?.icon || 'tag',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const [created] = await db()
    .insert(tags)
    .values(testTag)
    .returning();

  return created;
}

/**
 * Create a test task
 */
export async function createTestTask(overrides?: Partial<{
  id: string;
  contactId: string;
  title: string;
  description: string;
  dueDate: Date;
  assignedToUserId: string;
  createdByUserId: string;
  status: string;
  priority: string;
}>): Promise<InferSelectModel<typeof tasks>> {
  const testTask = {
    id: overrides?.id || `test-task-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    contactId: overrides?.contactId || '',
    title: overrides?.title || `Test Task ${Date.now()}`,
    description: overrides?.description || null,
    dueDate: overrides?.dueDate || null,
    assignedToUserId: overrides?.assignedToUserId || '',
    createdByUserId: overrides?.createdByUserId || overrides?.assignedToUserId || '',
    status: overrides?.status || 'pending',
    priority: overrides?.priority || 'medium',
    createdFrom: 'manual',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const [created] = await db()
    .insert(tasks)
    .values(testTask)
    .returning();

  return created;
}

/**
 * Create a test note
 */
export async function createTestNote(overrides?: Partial<{
  id: string;
  contactId: string;
  content: string;
  authorUserId: string;
  source: string;
  noteType: string;
}>): Promise<InferSelectModel<typeof notes>> {
  const testNote = {
    id: overrides?.id || `test-note-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    contactId: overrides?.contactId || '',
    content: overrides?.content || 'Test note content',
    authorUserId: overrides?.authorUserId || null,
    source: overrides?.source || 'manual',
    noteType: overrides?.noteType || 'general',
    createdAt: new Date(),
  };

  const [created] = await db()
    .insert(notes)
    .values(testNote)
    .returning();

  return created;
}

/**
 * Create a test team
 */
export async function createTestTeam(overrides?: Partial<{
  id: string;
  name: string;
  managerUserId: string;
  calendarUrl: string;
}>): Promise<InferSelectModel<typeof teams>> {
  const testTeam = {
    id: overrides?.id || `test-team-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name: overrides?.name || `Test Team ${Date.now()}`,
    managerUserId: overrides?.managerUserId || null,
    calendarUrl: overrides?.calendarUrl || null,
    createdAt: new Date(),
  };

  const [created] = await db()
    .insert(teams)
    .values(testTeam)
    .returning();

  return created;
}

/**
 * Create a test pipeline stage
 */
export async function createTestPipelineStage(overrides?: Partial<{
  id: string;
  name: string;
  order: number;
  color: string;
  wipLimit: number;
}>): Promise<InferSelectModel<typeof pipelineStages>> {
  const testStage = {
    id: overrides?.id || `test-stage-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name: overrides?.name || `Test Stage ${Date.now()}`,
    order: overrides?.order ?? 0,
    color: overrides?.color || '#000000',
    wipLimit: overrides?.wipLimit || null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const [created] = await db()
    .insert(pipelineStages)
    .values(testStage)
    .returning();

  return created;
}

/**
 * Create multiple test contacts
 */
export async function createTestContacts(count: number): Promise<InferSelectModel<typeof contacts>[]> {
  const created: InferSelectModel<typeof contacts>[] = [];
  
  for (let i = 0; i < count; i++) {
    const contact = await createTestContact({
      firstName: `Test${i}`,
      lastName: `Contact${i}`,
      email: `test-contact-${i}-${Date.now()}@example.com`,
    });
    created.push(contact);
  }
  
  return created;
}

/**
 * Clean up test fixtures
 */
export async function cleanupTestFixtures(ids: {
  contacts?: string[];
  tags?: string[];
  tasks?: string[];
  notes?: string[];
  teams?: string[];
  pipelineStages?: string[];
}): Promise<void> {
  if (ids.contacts?.length) {
    for (const id of ids.contacts) {
      await db().delete(contacts).where(eq(contacts.id, id));
    }
  }
  
  if (ids.tags?.length) {
    for (const id of ids.tags) {
      await db().delete(tags).where(eq(tags.id, id));
    }
  }
  
  if (ids.tasks?.length) {
    for (const id of ids.tasks) {
      await db().delete(tasks).where(eq(tasks.id, id));
    }
  }
  
  if (ids.notes?.length) {
    for (const id of ids.notes) {
      await db().delete(notes).where(eq(notes.id, id));
    }
  }
  
  if (ids.teams?.length) {
    for (const id of ids.teams) {
      await db().delete(teams).where(eq(teams.id, id));
    }
  }
  
  if (ids.pipelineStages?.length) {
    for (const id of ids.pipelineStages) {
      await db().delete(pipelineStages).where(eq(pipelineStages.id, id));
    }
  }
}

