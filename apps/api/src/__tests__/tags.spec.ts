import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { db } from '@cactus/db';

// Mock de autenticación
vi.mock('../auth/middlewares', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id' };
    next();
  },
  requireRole: () => (req: any, res: any, next: any) => {
    next();
  }
}));

describe('Tags API', () => {
  beforeEach(async () => {
    // Limpiar datos de prueba
    await db().delete(require('@cactus/db').contactTags);
    await db().delete(require('@cactus/db').tags);
  });

  afterEach(async () => {
    // Limpiar después de cada test
    await db().delete(require('@cactus/db').contactTags);
    await db().delete(require('@cactus/db').tags);
  });

  describe('GET /tags', () => {
    it('should list tags with autocomplete', async () => {
      // Crear etiquetas de prueba
      const { tags } = require('@cactus/db');
      await db().insert(tags).values([
        { scope: 'contact', name: 'VIP', color: '#ff0000' },
        { scope: 'contact', name: 'Cliente', color: '#00ff00' },
        { scope: 'meeting', name: 'Reunión', color: '#0000ff' }
      ]);

      const response = await request(app)
        .get('/tags?scope=contact&q=vi&limit=10')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('VIP');
    });

    it('should return empty array when no matches', async () => {
      const response = await request(app)
        .get('/tags?q=nonexistent')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('POST /tags', () => {
    it('should create new tag', async () => {
      const response = await request(app)
        .post('/tags')
        .send({
          scope: 'contact',
          name: 'Test Tag',
          color: '#ff0000'
        })
        .expect(201);

      expect(response.body.data.name).toBe('Test Tag');
      expect(response.body.data.scope).toBe('contact');
    });

    it('should return existing tag if already exists (idempotent)', async () => {
      const { tags } = require('@cactus/db');
      
      // Crear etiqueta existente
      await db().insert(tags).values({
        scope: 'contact',
        name: 'Existing Tag',
        color: '#ff0000'
      });

      const response = await request(app)
        .post('/tags')
        .send({
          scope: 'contact',
          name: 'existing tag', // case insensitive
          color: '#00ff00'
        })
        .expect(200);

      expect(response.body.data.name).toBe('Existing Tag');
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/tags')
        .send({
          scope: 'contact'
          // name missing
        })
        .expect(400);
    });
  });

  describe('GET /tags/contacts/:id', () => {
    it('should list contact tags', async () => {
      const { tags, contactTags, contacts } = require('@cactus/db');
      
      // Crear contacto de prueba
      const [contact] = await db().insert(contacts).values({
        firstName: 'Test',
        lastName: 'Contact',
        fullName: 'Test Contact'
      }).returning();

      // Crear etiquetas
      const [tag1] = await db().insert(tags).values({
        scope: 'contact',
        name: 'VIP',
        color: '#ff0000'
      }).returning();

      const [tag2] = await db().insert(tags).values({
        scope: 'contact',
        name: 'Cliente',
        color: '#00ff00'
      }).returning();

      // Asignar etiquetas al contacto
      await db().insert(contactTags).values([
        { contactId: contact.id, tagId: tag1.id },
        { contactId: contact.id, tagId: tag2.id }
      ]);

      const response = await request(app)
        .get(`/tags/contacts/${contact.id}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.map((t: any) => t.name)).toContain('VIP');
      expect(response.body.data.map((t: any) => t.name)).toContain('Cliente');
    });

    it('should return empty array for contact without tags', async () => {
      const { contacts } = require('@cactus/db');
      
      const [contact] = await db().insert(contacts).values({
        firstName: 'Test',
        lastName: 'Contact',
        fullName: 'Test Contact'
      }).returning();

      const response = await request(app)
        .get(`/tags/contacts/${contact.id}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('PUT /tags/contacts/:id', () => {
    it('should update contact tags', async () => {
      const { tags, contacts } = require('@cactus/db');
      
      // Crear contacto de prueba
      const [contact] = await db().insert(contacts).values({
        firstName: 'Test',
        lastName: 'Contact',
        fullName: 'Test Contact'
      }).returning();

      // Crear etiqueta existente
      const [existingTag] = await db().insert(tags).values({
        scope: 'contact',
        name: 'VIP',
        color: '#ff0000'
      }).returning();

      const response = await request(app)
        .put(`/tags/contacts/${contact.id}`)
        .send({
          add: [existingTag.id, 'New Tag'], // ID existente + nombre nuevo
          remove: []
        })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.map((t: any) => t.name)).toContain('VIP');
      expect(response.body.data.map((t: any) => t.name)).toContain('New Tag');
    });

    it('should remove tags', async () => {
      const { tags, contactTags, contacts } = require('@cactus/db');
      
      // Crear contacto de prueba
      const [contact] = await db().insert(contacts).values({
        firstName: 'Test',
        lastName: 'Contact',
        fullName: 'Test Contact'
      }).returning();

      // Crear etiquetas
      const [tag1] = await db().insert(tags).values({
        scope: 'contact',
        name: 'VIP',
        color: '#ff0000'
      }).returning();

      const [tag2] = await db().insert(tags).values({
        scope: 'contact',
        name: 'Cliente',
        color: '#00ff00'
      }).returning();

      // Asignar ambas etiquetas
      await db().insert(contactTags).values([
        { contactId: contact.id, tagId: tag1.id },
        { contactId: contact.id, tagId: tag2.id }
      ]);

      // Remover una etiqueta
      const response = await request(app)
        .put(`/tags/contacts/${contact.id}`)
        .send({
          add: [],
          remove: [tag1.id]
        })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Cliente');
    });

    it('should handle empty arrays', async () => {
      const { contacts } = require('@cactus/db');
      
      const [contact] = await db().insert(contacts).values({
        firstName: 'Test',
        lastName: 'Contact',
        fullName: 'Test Contact'
      }).returning();

      const response = await request(app)
        .put(`/tags/contacts/${contact.id}`)
        .send({
          add: [],
          remove: []
        })
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });
});


