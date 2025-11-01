import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { mockUsers, getAuthHeaders } from '@cactus/testing';

describe('CRM API', () => {
  const authHeaders = getAuthHeaders(mockUsers.advisor);

  describe('GET /api/crm/contacts', () => {
    it('should fetch contacts for authenticated user', async () => {
      const response = await request(app)
        .get('/api/crm/contacts')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/crm/contacts');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/crm/contacts', () => {
    it('should create a new contact', async () => {
      const newContact = {
        name: 'Test Contact',
        email: 'test@example.com',
        phone: '+1234567890',
      };

      const response = await request(app)
        .post('/api/crm/contacts')
        .set(authHeaders)
        .send(newContact);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/crm/contacts')
        .set(authHeaders)
        .send({ name: 'Incomplete Contact' });

      expect(response.status).toBe(400);
    });
  });
});

