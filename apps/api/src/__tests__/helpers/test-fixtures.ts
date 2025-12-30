import { db } from '@maatwork/db';
import { contacts, pipelineStages } from '@maatwork/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function createTestContact(overrides: Partial<any> = {}) {
  const [contact] = await db()
    .insert(contacts)
    .values({
      id: uuidv4(),
      firstName: 'Test',
      lastName: 'Contact',
      email: `contact-${uuidv4()}@example.com`,
      phone: '123456789',
      status: 'active',
      ownerId: uuidv4(), // Should be replaced by actual test user ID
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as any)
    .returning();
  return contact;
}

export async function cleanupTestFixtures(ids: { contacts?: string[] }) {
  if (ids.contacts && ids.contacts.length > 0) {
    await db().delete(contacts).where(inArray(contacts.id, ids.contacts));
  }
}

export async function createTestPipelineStage(overrides: Partial<any> = {}) {
  const [stage] = await db()
    .insert(pipelineStages)
    .values({
      id: uuidv4(),
      name: 'Test Stage',
      order: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as any)
    .returning();
  return stage;
}
