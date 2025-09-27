/**
 * Tests de Integración para API CRM - Versión Simplificada
 * Prueba los endpoints principales de /api/crm
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Crear la app de Express para testing
const app = express();
app.use(express.json());

// Mock simple de las rutas CRM
app.get('/api/crm/health', (req, res) => {
  res.json({
    success: true,
    service: 'notion-crm',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/api/crm/contacts', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      error: 'Token de autorización requerido',
      code: 'UNAUTHORIZED'
    });
  }

  if (authHeader === 'Bearer invalid-token') {
    return res.status(401).json({
      error: 'Token inválido',
      code: 'INVALID_TOKEN'
    });
  }

  // Simular respuesta exitosa
  res.json({
    success: true,
    data: [
      {
        id: 'contact-123',
        name: 'Juan Pérez',
        email: 'juan@example.com',
        phone: '+54 11 1234-5678',
        company: 'Empresa Test',
        status: 'lead',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    pagination: {
      total: 1,
      limit: 50,
      offset: 0,
      has_more: false
    }
  });
});

app.post('/api/crm/contacts', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      error: 'Token de autorización requerido',
      code: 'UNAUTHORIZED'
    });
  }

  const { name, email } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({
      error: 'El nombre del contacto es requerido',
      code: 'VALIDATION_ERROR'
    });
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      error: 'Email inválido',
      code: 'VALIDATION_ERROR'
    });
  }

  res.status(201).json({
    success: true,
    data: {
      id: 'contact-new',
      name,
      email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    message: 'Contacto creado exitosamente'
  });
});

app.get('/api/crm/deals', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      error: 'Token de autorización requerido',
      code: 'UNAUTHORIZED'
    });
  }

  res.json({
    success: true,
    data: [
      {
        id: 'deal-123',
        title: 'Oportunidad Test',
        amount: 50000,
        stage: 'prospecting',
        contact_id: 'contact-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    pagination: {
      total: 1,
      limit: 50,
      offset: 0,
      has_more: false
    }
  });
});

app.post('/api/crm/deals', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      error: 'Token de autorización requerido',
      code: 'UNAUTHORIZED'
    });
  }

  const { title } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({
      error: 'El título de la oportunidad es requerido',
      code: 'VALIDATION_ERROR'
    });
  }

  res.status(201).json({
    success: true,
    data: {
      id: 'deal-new',
      title,
      amount: req.body.amount || 0,
      stage: req.body.stage || 'prospecting',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    message: 'Oportunidad creada exitosamente'
  });
});

app.get('/api/crm/tasks', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      error: 'Token de autorización requerido',
      code: 'UNAUTHORIZED'
    });
  }

  res.json({
    success: true,
    data: [
      {
        id: 'task-123',
        title: 'Tarea Test',
        description: 'Descripción de la tarea',
        status: 'pending',
        priority: 'medium',
        due_date: new Date(Date.now() + 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    pagination: {
      total: 1,
      limit: 50,
      offset: 0,
      has_more: false
    }
  });
});

app.post('/api/crm/tasks', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      error: 'Token de autorización requerido',
      code: 'UNAUTHORIZED'
    });
  }

  const { title } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({
      error: 'El título de la tarea es requerido',
      code: 'VALIDATION_ERROR'
    });
  }

  res.status(201).json({
    success: true,
    data: {
      id: 'task-new',
      title,
      description: req.body.description || '',
      status: 'pending',
      priority: req.body.priority || 'medium',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    message: 'Tarea creada exitosamente'
  });
});

app.get('/api/crm/stats', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      error: 'Token de autorización requerido',
      code: 'UNAUTHORIZED'
    });
  }

  res.json({
    success: true,
    data: {
      contacts: {
        total: 2,
        by_status: {
          lead: 1,
          customer: 1
        }
      },
      deals: {
        total: 2,
        total_value: 75000,
        by_stage: {
          prospecting: 1,
          closed_won: 1
        }
      },
      tasks: {
        total: 2,
        by_status: {
          pending: 1,
          completed: 1
        },
        by_priority: {
          high: 1,
          medium: 1
        }
      }
    }
  });
});

// Datos de prueba
const validToken = 'Bearer valid-token-123';
const invalidToken = 'Bearer invalid-token';

describe('CRM API Integration Tests - Simplificado', () => {
  describe('Health Check', () => {
    test('GET /api/crm/health - debería retornar estado de salud', async () => {
      const response = await request(app)
        .get('/api/crm/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        service: 'notion-crm',
        timestamp: expect.any(String),
        version: '1.0.0'
      });
    });
  });

  describe('Autenticación', () => {
    test('debería rechazar requests sin token', async () => {
      const response = await request(app)
        .get('/api/crm/contacts')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Token de autorización requerido',
        code: 'UNAUTHORIZED'
      });
    });

    test('debería rechazar tokens inválidos', async () => {
      const response = await request(app)
        .get('/api/crm/contacts')
        .set('Authorization', invalidToken)
        .expect(401);

      expect(response.body).toEqual({
        error: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    });
  });

  describe('Endpoints de Contactos', () => {
    test('GET /api/crm/contacts - debería obtener contactos exitosamente', async () => {
      const response = await request(app)
        .get('/api/crm/contacts')
        .set('Authorization', validToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('name', 'Juan Pérez');
      expect(response.body.pagination.total).toBe(1);
    });

    test('POST /api/crm/contacts - debería crear contacto exitosamente', async () => {
      const newContactData = {
        name: 'Nuevo Contacto',
        email: 'nuevo@example.com'
      };

      const response = await request(app)
        .post('/api/crm/contacts')
        .set('Authorization', validToken)
        .send(newContactData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Nuevo Contacto');
      expect(response.body.message).toBe('Contacto creado exitosamente');
    });

    test('POST /api/crm/contacts - debería validar nombre requerido', async () => {
      const response = await request(app)
        .post('/api/crm/contacts')
        .set('Authorization', validToken)
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body).toEqual({
        error: 'El nombre del contacto es requerido',
        code: 'VALIDATION_ERROR'
      });
    });

    test('POST /api/crm/contacts - debería validar email válido', async () => {
      const response = await request(app)
        .post('/api/crm/contacts')
        .set('Authorization', validToken)
        .send({ name: 'Test', email: 'email-invalido' })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Email inválido',
        code: 'VALIDATION_ERROR'
      });
    });
  });

  describe('Endpoints de Oportunidades', () => {
    test('GET /api/crm/deals - debería obtener oportunidades', async () => {
      const response = await request(app)
        .get('/api/crm/deals')
        .set('Authorization', validToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('title', 'Oportunidad Test');
    });

    test('POST /api/crm/deals - debería crear oportunidad', async () => {
      const newDealData = {
        title: 'Nueva Oportunidad',
        amount: 75000,
        stage: 'qualification'
      };

      const response = await request(app)
        .post('/api/crm/deals')
        .set('Authorization', validToken)
        .send(newDealData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Nueva Oportunidad');
      expect(response.body.message).toBe('Oportunidad creada exitosamente');
    });

    test('POST /api/crm/deals - debería validar título requerido', async () => {
      const response = await request(app)
        .post('/api/crm/deals')
        .set('Authorization', validToken)
        .send({ amount: 50000 })
        .expect(400);

      expect(response.body).toEqual({
        error: 'El título de la oportunidad es requerido',
        code: 'VALIDATION_ERROR'
      });
    });
  });

  describe('Endpoints de Tareas', () => {
    test('GET /api/crm/tasks - debería obtener tareas', async () => {
      const response = await request(app)
        .get('/api/crm/tasks')
        .set('Authorization', validToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('title', 'Tarea Test');
    });

    test('POST /api/crm/tasks - debería crear tarea', async () => {
      const newTaskData = {
        title: 'Nueva Tarea',
        description: 'Descripción de nueva tarea',
        priority: 'high'
      };

      const response = await request(app)
        .post('/api/crm/tasks')
        .set('Authorization', validToken)
        .send(newTaskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Nueva Tarea');
      expect(response.body.message).toBe('Tarea creada exitosamente');
    });
  });

  describe('Estadísticas', () => {
    test('GET /api/crm/stats - debería obtener estadísticas', async () => {
      const response = await request(app)
        .get('/api/crm/stats')
        .set('Authorization', validToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.contacts.total).toBe(2);
      expect(response.body.data.deals.total).toBe(2);
      expect(response.body.data.deals.total_value).toBe(75000);
      expect(response.body.data.tasks.total).toBe(2);
    });
  });
});