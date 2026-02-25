import { db } from '@maatwork/db';
import { users } from '@maatwork/db/schema';
import { eq } from 'drizzle-orm';
import { signUserToken } from '../../auth/jwt';
import { v4 as uuidv4 } from 'uuid';

export async function createTestUser(overrides: Partial<any> = {}) {
  const [user] = await db()
    .insert(users)
    .values({
      id: uuidv4(),
      email: `test-${uuidv4()}@example.com`,
      fullName: 'Test User',
      password: 'hashed-password',
      role: 'advisor',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as any)
    .returning();
  return user;
}

export async function deleteTestUser(userId: string) {
  await db().delete(users).where(eq(users.id, userId));
}

export async function createTestToken(user: any) {
  return signUserToken({
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName || user.name,
  });
}
