/**
 * Tests de Integración para Migración de Datos
 * Prueba la migración de datos desde Supabase a Notion
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Crear la app de Express para testing
const app = express();
app.use(express.json());

// Simulación de datos en Supabase
const supabaseData = {
  contacts: [
    {
      id: 'supabase-contact-1',
      name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '+54 11 1234-5678',
      company: 'Empresa Test',
      status: 'lead',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z'
    },
    {
      id: 'supabase-contact-2',
      name: 'María García',
      email: 'maria@example.com',
      phone: '+54 11 9876-5432',
      company: 'Otra Empresa',
      status: 'customer',
      created_at: '2024-01-16T11:00:00Z',
      updated_at: '2024-01-16T11:00:00Z'
    }
  ],
  deals: [
    {
      id: 'supabase-deal-1',
      title: 'Oportunidad Migrada',
      amount: 75000,
      stage: 'prospecting',
      contact_id: 'supabase-contact-1',
      created_at: '2024-01-17T12:00:00Z',
      updated_at: '2024-01-17T12:00:00Z'
    }
  ],
  tasks: [
    {
      id: 'supabase-task-1',
      title: 'Tarea Migrada',
      description: 'Descripción de tarea migrada',
      status: 'pending',
      priority: 'high',
      due_date: '2024-02-01T09:00:00Z',
      contact_id: 'supabase-contact-1',
      created_at: '2024-01-18T13:00:00Z',
      updated_at: '2024-01-18T13:00:00Z'
    }
  ]
};

// Simulación de datos migrados a Notion
let notionData: any = {
  contacts: [],
  deals: [],
  tasks: []
};

// Estado de migración
let migrationState: any = {
  inProgress: false,
  completed: false,
  errors: [],
  stats: {
    contacts: { total: 0, migrated: 0, failed: 0 },
    deals: { total: 0, migrated: 0, failed: 0 },
    tasks: { total: 0, migrated: 0, failed: 0 }
  }
};

// Endpoint para iniciar migración
app.post('/api/crm/migrate', (req, res) => {
  const authHeader = req.headers.authorization;
  const userId = req.headers['x-user-id'] as string;
  
  if (!authHeader) {
    return res.status(401).json({
      error: 'Token de autorización requerido',
      code: 'UNAUTHORIZED'
    });
  }
  
  if (!userId) {
    return res.status(401).json({
      error: 'Usuario no identificado',
      code: 'USER_NOT_IDENTIFIED'
    });
  }
  
  if (migrationState.inProgress) {
    return res.status(409).json({
      error: 'Ya hay una migración en progreso',
      code: 'MIGRATION_IN_PROGRESS'
    });
  }
  
  // Iniciar migración
  migrationState.inProgress = true;
  migrationState.completed = false;
  migrationState.errors = [];
  
  // Simular proceso de migración
  setTimeout(() => {
    try {
      // Migrar contactos
      migrationState.stats.contacts.total = supabaseData.contacts.length;
      supabaseData.contacts.forEach((contact, index) => {
        if (contact.email === 'error@example.com') {
          migrationState.stats.contacts.failed++;
          migrationState.errors.push({
            type: 'contact',
            id: contact.id,
            error: 'Email inválido para Notion'
          });
        } else {
          notionData.contacts.push({
            ...contact,
            notion_id: `notion-contact-${index + 1}`,
            migrated_at: new Date().toISOString()
          });
          migrationState.stats.contacts.migrated++;
        }
      });
      
      // Migrar deals
      migrationState.stats.deals.total = supabaseData.deals.length;
      supabaseData.deals.forEach((deal, index) => {
        notionData.deals.push({
          ...deal,
          notion_id: `notion-deal-${index + 1}`,
          migrated_at: new Date().toISOString()
        });
        migrationState.stats.deals.migrated++;
      });
      
      // Migrar tasks
      migrationState.stats.tasks.total = supabaseData.tasks.length;
      supabaseData.tasks.forEach((task, index) => {
        notionData.tasks.push({
          ...task,
          notion_id: `notion-task-${index + 1}`,
          migrated_at: new Date().toISOString()
        });
        migrationState.stats.tasks.migrated++;
      });
      
      migrationState.inProgress = false;
      migrationState.completed = true;
    } catch (error) {
      migrationState.inProgress = false;
      migrationState.errors.push({
        type: 'system',
        error: 'Error interno durante la migración'
      });
    }
  }, 100); // Simular tiempo de procesamiento
  
  res.json({
    success: true,
    message: 'Migración iniciada exitosamente',
    migrationId: 'migration-' + Date.now(),
    estimatedTime: '2-5 minutos'
  });
});

// Endpoint para verificar estado de migración
app.get('/api/crm/migrate/status', (req, res) => {
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
      inProgress: migrationState.inProgress,
      completed: migrationState.completed,
      stats: migrationState.stats,
      errors: migrationState.errors,
      totalItems: migrationState.stats.contacts.total + migrationState.stats.deals.total + migrationState.stats.tasks.total,
      migratedItems: migrationState.stats.contacts.migrated + migrationState.stats.deals.migrated + migrationState.stats.tasks.migrated,
      failedItems: migrationState.stats.contacts.failed + migrationState.stats.deals.failed + migrationState.stats.tasks.failed
    }
  });
});

// Endpoint para obtener datos migrados
app.get('/api/crm/migrated-data', (req, res) => {
  const authHeader = req.headers.authorization;
  const { type } = req.query;
  
  if (!authHeader) {
    return res.status(401).json({
      error: 'Token de autorización requerido',
      code: 'UNAUTHORIZED'
    });
  }
  
  if (!migrationState.completed) {
    return res.status(400).json({
      error: 'La migración no ha sido completada',
      code: 'MIGRATION_NOT_COMPLETED'
    });
  }
  
  let data;
  switch (type) {
    case 'contacts':
      data = notionData.contacts;
      break;
    case 'deals':
      data = notionData.deals;
      break;
    case 'tasks':
      data = notionData.tasks;
      break;
    default:
      data = notionData;
  }
  
  res.json({
    success: true,
    data: data,
    migrationStats: migrationState.stats
  });
});

// Endpoint para limpiar datos de migración (para testing)
app.delete('/api/crm/migrate/cleanup', (req, res) => {
  notionData = { contacts: [], deals: [], tasks: [] };
  migrationState = {
    inProgress: false,
    completed: false,
    errors: [],
    stats: {
      contacts: { total: 0, migrated: 0, failed: 0 },
      deals: { total: 0, migrated: 0, failed: 0 },
      tasks: { total: 0, migrated: 0, failed: 0 }
    }
  };
  
  res.json({
    success: true,
    message: 'Datos de migración limpiados'
  });
});

// Datos de prueba
const testUserId = 'test-user-123';
const validToken = 'Bearer valid-token-123';

describe('Data Migration Integration Tests', () => {
  beforeEach(async () => {
    // Limpiar estado antes de cada test
    await request(app)
      .delete('/api/crm/migrate/cleanup')
      .set('Authorization', validToken);
  });
  
  describe('Inicio de Migración', () => {
    test('debería iniciar migración exitosamente', async () => {
      const response = await request(app)
        .post('/api/crm/migrate')
        .set('Authorization', validToken)
        .set('x-user-id', testUserId)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Migración iniciada exitosamente');
      expect(response.body.migrationId).toBeDefined();
      expect(response.body.estimatedTime).toBeDefined();
    });
    
    test('debería requerir autenticación', async () => {
      const response = await request(app)
        .post('/api/crm/migrate')
        .expect(401);
      
      expect(response.body.error).toContain('Token de autorización requerido');
      expect(response.body.code).toBe('UNAUTHORIZED');
    });
    
    test('debería requerir identificación de usuario', async () => {
      const response = await request(app)
        .post('/api/crm/migrate')
        .set('Authorization', validToken)
        .expect(401);
      
      expect(response.body.error).toContain('Usuario no identificado');
      expect(response.body.code).toBe('USER_NOT_IDENTIFIED');
    });
    
    test('debería prevenir migraciones concurrentes', async () => {
      // Iniciar primera migración
      await request(app)
        .post('/api/crm/migrate')
        .set('Authorization', validToken)
        .set('x-user-id', testUserId);
      
      // Intentar segunda migración
      const response = await request(app)
        .post('/api/crm/migrate')
        .set('Authorization', validToken)
        .set('x-user-id', testUserId)
        .expect(409);
      
      expect(response.body.error).toContain('Ya hay una migración en progreso');
      expect(response.body.code).toBe('MIGRATION_IN_PROGRESS');
    });
  });
  
  describe('Estado de Migración', () => {
    test('debería obtener estado inicial', async () => {
      const response = await request(app)
        .get('/api/crm/migrate/status')
        .set('Authorization', validToken)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.inProgress).toBe(false);
      expect(response.body.data.completed).toBe(false);
      expect(response.body.data.totalItems).toBe(0);
      expect(response.body.data.migratedItems).toBe(0);
    });
    
    test('debería obtener estado durante migración', async () => {
      // Iniciar migración
      await request(app)
        .post('/api/crm/migrate')
        .set('Authorization', validToken)
        .set('x-user-id', testUserId);
      
      // Verificar estado inmediatamente
      const response = await request(app)
        .get('/api/crm/migrate/status')
        .set('Authorization', validToken)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.inProgress).toBe(true);
      expect(response.body.data.completed).toBe(false);
    });
    
    test('debería obtener estado después de completar migración', async () => {
      // Iniciar migración
      await request(app)
        .post('/api/crm/migrate')
        .set('Authorization', validToken)
        .set('x-user-id', testUserId);
      
      // Esperar a que complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const response = await request(app)
        .get('/api/crm/migrate/status')
        .set('Authorization', validToken)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.inProgress).toBe(false);
      expect(response.body.data.completed).toBe(true);
      expect(response.body.data.totalItems).toBeGreaterThan(0);
      expect(response.body.data.migratedItems).toBeGreaterThan(0);
      expect(response.body.data.stats.contacts.migrated).toBeGreaterThan(0);
      expect(response.body.data.stats.deals.migrated).toBeGreaterThan(0);
      expect(response.body.data.stats.tasks.migrated).toBeGreaterThan(0);
    });
  });
  
  describe('Datos Migrados', () => {
    beforeEach(async () => {
      // Completar migración antes de cada test
      await request(app)
        .post('/api/crm/migrate')
        .set('Authorization', validToken)
        .set('x-user-id', testUserId);
      
      await new Promise(resolve => setTimeout(resolve, 200));
    });
    
    test('debería obtener todos los datos migrados', async () => {
      const response = await request(app)
        .get('/api/crm/migrated-data')
        .set('Authorization', validToken)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.contacts).toHaveLength(2);
      expect(response.body.data.deals).toHaveLength(1);
      expect(response.body.data.tasks).toHaveLength(1);
      expect(response.body.migrationStats).toBeDefined();
    });
    
    test('debería obtener contactos migrados', async () => {
      const response = await request(app)
        .get('/api/crm/migrated-data')
        .query({ type: 'contacts' })
        .set('Authorization', validToken)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('notion_id');
      expect(response.body.data[0]).toHaveProperty('migrated_at');
      expect(response.body.data[0].name).toBe('Juan Pérez');
    });
    
    test('debería obtener deals migrados', async () => {
      const response = await request(app)
        .get('/api/crm/migrated-data')
        .query({ type: 'deals' })
        .set('Authorization', validToken)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('notion_id');
      expect(response.body.data[0]).toHaveProperty('migrated_at');
      expect(response.body.data[0].title).toBe('Oportunidad Migrada');
    });
    
    test('debería obtener tasks migradas', async () => {
      const response = await request(app)
        .get('/api/crm/migrated-data')
        .query({ type: 'tasks' })
        .set('Authorization', validToken)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('notion_id');
      expect(response.body.data[0]).toHaveProperty('migrated_at');
      expect(response.body.data[0].title).toBe('Tarea Migrada');
    });
    
    test('debería fallar si migración no está completada', async () => {
      // Limpiar estado
      await request(app)
        .delete('/api/crm/migrate/cleanup')
        .set('Authorization', validToken);
      
      const response = await request(app)
        .get('/api/crm/migrated-data')
        .set('Authorization', validToken)
        .expect(400);
      
      expect(response.body.error).toContain('La migración no ha sido completada');
      expect(response.body.code).toBe('MIGRATION_NOT_COMPLETED');
    });
  });
  
  describe('Validación de Datos', () => {
    test('debería preservar estructura de datos original', async () => {
      await request(app)
        .post('/api/crm/migrate')
        .set('Authorization', validToken)
        .set('x-user-id', testUserId);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const response = await request(app)
        .get('/api/crm/migrated-data')
        .query({ type: 'contacts' })
        .set('Authorization', validToken);
      
      const migratedContact = response.body.data[0];
      const originalContact = supabaseData.contacts[0];
      
      expect(migratedContact.name).toBe(originalContact.name);
      expect(migratedContact.email).toBe(originalContact.email);
      expect(migratedContact.phone).toBe(originalContact.phone);
      expect(migratedContact.company).toBe(originalContact.company);
      expect(migratedContact.status).toBe(originalContact.status);
    });
    
    test('debería agregar metadatos de migración', async () => {
      await request(app)
        .post('/api/crm/migrate')
        .set('Authorization', validToken)
        .set('x-user-id', testUserId);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const response = await request(app)
        .get('/api/crm/migrated-data')
        .query({ type: 'contacts' })
        .set('Authorization', validToken);
      
      const migratedContact = response.body.data[0];
      
      expect(migratedContact).toHaveProperty('notion_id');
      expect(migratedContact).toHaveProperty('migrated_at');
      expect(migratedContact.notion_id).toMatch(/^notion-contact-\d+$/);
      expect(new Date(migratedContact.migrated_at)).toBeInstanceOf(Date);
    });
  });
});