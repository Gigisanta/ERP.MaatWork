import express from 'express';
import request from 'supertest';
import notesRouter from './notes';
import { signUserToken } from '../auth/jwt';

describe('Notes route validation', () => {
  function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use('/notes', notesRouter);
    return app;
  }

  it('returns 400 on invalid POST /notes payload (missing required fields)', async () => {
    const app = createTestApp();
    const token = await signUserToken({ id: '00000000-0000-0000-0000-000000000001', email: 't@e.st', role: 'advisor' });

    const res = await request(app)
      .post('/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Validation error');
    expect(res.body).toHaveProperty('details');
  });
});


