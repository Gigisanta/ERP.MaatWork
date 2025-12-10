import express from 'express';
import request from 'supertest';
import notesRouter from './notes';
import { signUserToken } from '../auth/jwt';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestApp } from '../../__tests__/helpers/test-server';

// Mock auth middleware
vi.mock('../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => {
    req.user = { id: '00000000-0000-0000-0000-000000000001', email: 't@e.st', role: 'advisor' };
    next();
  }),
}));

describe('Notes route validation', () => {
  const createTestAppWithRoutes = () => createTestApp([{ path: '/notes', router: notesRouter }]);

  it('returns 400 on invalid POST /notes payload (missing required fields)', async () => {
    const app = createTestAppWithRoutes();
    const token = await signUserToken({
      id: '00000000-0000-0000-0000-000000000001',
      email: 't@e.st',
      role: 'advisor',
    });

    const res = await request(app).post('/notes').set('Cookie', `token=${token}`).send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Validation error');
    expect(res.body).toHaveProperty('details');
  });
});
