import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { db, users } from '@cactus/db';
import { eq } from 'drizzle-orm';

describe('Auth API — username login', () => {
  const uniqueSuffix = Date.now();
  const email = `user-${uniqueSuffix}@example.com`;
  const username = `tester${uniqueSuffix}`.toLowerCase();
  const password = 'secret123';
  let createdUserId: string | undefined;

  afterAll(async () => {
    if (createdUserId) {
      await db().delete(users).where(eq(users.id, createdUserId));
    }
  });

  it('should register user with username', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        email,
        fullName: 'Test User',
        username,
        password,
        role: 'manager'
      })
      .expect(201);

    expect(res.body).toHaveProperty('userId');
    createdUserId = res.body.userId;

    const row = await db().select().from(users).where(eq(users.id, createdUserId!)).limit(1);
    expect(row[0].username).toBe(username);
    expect(row[0].usernameNormalized).toBe(username);
  });

  it('should reject duplicate username', async () => {
    await request(app)
      .post('/auth/register')
      .send({
        email: `other-${uniqueSuffix}@example.com`,
        fullName: 'Other User',
        username, // duplicate
        password,
        role: 'advisor'
      })
      .expect(409);
  });

  it('should allow login using username after activation', async () => {
    // Activate the user to allow login
    await db().update(users).set({ isActive: true }).where(eq(users.id, createdUserId!));

    const loginByUsername = await request(app)
      .post('/auth/login')
      .send({ identifier: username, password })
      .expect(200);

    expect(loginByUsername.body).toHaveProperty('token');

    const loginByEmail = await request(app)
      .post('/auth/login')
      .send({ identifier: email, password })
      .expect(200);

    expect(loginByEmail.body).toHaveProperty('token');
  });
});







