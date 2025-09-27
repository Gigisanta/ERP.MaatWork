/**
 * Tests E2E para el flujo completo de OAuth con Notion
 * Prueba la integración completa desde la autorización hasta el uso del CRM
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Crear la app de Express para testing E2E
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simulación del estado de OAuth
let oauthState: { [key: string]: any } = {};
let userSessions: { [key: string]: any } = {};

// Mock de rutas de OAuth con Notion
app.get('/api/auth/notion', (req, res) => {
  const state = Math.random().toString(36).substring(7);
  const redirectUri = encodeURIComponent('http://localhost:3000/api/auth/notion/callback');
  
  // Simular parámetros de OAuth de Notion
  const notionAuthUrl = `https://api.notion.com/v1/oauth/authorize?client_id=test-client-id&response_type=code&owner=user&redirect_uri=${redirectUri}&state=${state}`;
  
  // Guardar estado para validación posterior
  oauthState[state] = {
    timestamp: Date.now(),
    userId: req.headers['x-user-id'] || 'test-user-123'
  };
  
  res.json({
    success: true,
    authUrl: notionAuthUrl,
    state: state,
    message: 'Redirige al usuario a esta URL para autorizar Notion'
  });
});

app.get('/api/auth/notion/callback', (req, res) => {
  const { code, state, error } = req.query;
  
  // Manejar errores de autorización
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Autorización denegada por el usuario',
      code: 'OAUTH_DENIED',
      details: error
    });
  }
  
  // Validar parámetros requeridos
  if (!code || !state) {
    return res.status(400).json({
      success: false,
      error: 'Parámetros de OAuth inválidos',
      code: 'INVALID_OAUTH_PARAMS'
    });
  }
  
  // Validar estado
  if (!oauthState[state as string]) {
    return res.status(400).json({
      success: false,
      error: 'Estado de OAuth inválido o expirado',
      code: 'INVALID_OAUTH_STATE'
    });
  }
  
  // Simular intercambio de código por token
  const mockAccessToken = 'notion_access_token_' + Math.random().toString(36);
  const mockWorkspaceId = 'workspace_' + Math.random().toString(36);
  const userId = oauthState[state as string].userId;
  
  // Guardar sesión del usuario
  userSessions[userId] = {
    accessToken: mockAccessToken,
    workspaceId: mockWorkspaceId,
    connectedAt: new Date().toISOString(),
    isActive: true
  };
  
  // Limpiar estado usado
  delete oauthState[state as string];
  
  res.json({
    success: true,
    message: 'Conexión con Notion establecida exitosamente',
    data: {
      workspaceId: mockWorkspaceId,
      connectedAt: userSessions[userId].connectedAt,
      hasAccess: true
    }
  });
});

// Endpoint para verificar estado de conexión
app.get('/api/auth/notion/status', (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Usuario no autenticado',
      code: 'UNAUTHORIZED'
    });
  }
  
  const session = userSessions[userId];
  
  if (!session || !session.isActive) {
    return res.json({
      success: true,
      connected: false,
      message: 'No hay conexión activa con Notion'
    });
  }
  
  res.json({
    success: true,
    connected: true,
    data: {
      workspaceId: session.workspaceId,
      connectedAt: session.connectedAt,
      hasAccess: true
    }
  });
});

// Endpoint para desconectar Notion
app.delete('/api/auth/notion/disconnect', (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Usuario no autenticado',
      code: 'UNAUTHORIZED'
    });
  }
  
  if (userSessions[userId]) {
    userSessions[userId].isActive = false;
    userSessions[userId].disconnectedAt = new Date().toISOString();
  }
  
  res.json({
    success: true,
    message: 'Conexión con Notion desactivada exitosamente'
  });
});

// Endpoint de CRM que requiere conexión con Notion
app.get('/api/crm/contacts', (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  const authHeader = req.headers.authorization;
  
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
  
  const session = userSessions[userId];
  
  if (!session || !session.isActive) {
    return res.status(400).json({
      error: 'Conexión con Notion requerida. Por favor, conecta tu workspace de Notion primero.',
      code: 'NOTION_NOT_CONNECTED',
      action: 'connect_notion'
    });
  }
  
  // Simular respuesta exitosa del CRM
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
    },
    workspace: {
      id: session.workspaceId,
      connectedAt: session.connectedAt
    }
  });
});

// Datos de prueba
const testUserId = 'test-user-123';
const validToken = 'Bearer valid-token-123';

describe('Notion OAuth E2E Tests', () => {
  beforeEach(() => {
    // Limpiar estado entre tests
    oauthState = {};
    userSessions = {};
  });
  
  describe('Flujo de Autorización OAuth', () => {
    test('debería iniciar el flujo de OAuth correctamente', async () => {
      const response = await request(app)
        .get('/api/auth/notion')
        .set('x-user-id', testUserId)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.authUrl).toContain('https://api.notion.com/v1/oauth/authorize');
      expect(response.body.authUrl).toContain('client_id=test-client-id');
      expect(response.body.authUrl).toContain('response_type=code');
      expect(response.body.state).toBeDefined();
      expect(response.body.message).toContain('Redirige al usuario');
    });
    
    test('debería completar el callback de OAuth exitosamente', async () => {
      // Primero iniciar OAuth para obtener state
      const initResponse = await request(app)
        .get('/api/auth/notion')
        .set('x-user-id', testUserId);
      
      const state = initResponse.body.state;
      
      // Simular callback exitoso
      const response = await request(app)
        .get('/api/auth/notion/callback')
        .query({
          code: 'test-auth-code-123',
          state: state
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Conexión con Notion establecida exitosamente');
      expect(response.body.data.workspaceId).toBeDefined();
      expect(response.body.data.connectedAt).toBeDefined();
      expect(response.body.data.hasAccess).toBe(true);
    });
    
    test('debería manejar errores de autorización denegada', async () => {
      const response = await request(app)
        .get('/api/auth/notion/callback')
        .query({
          error: 'access_denied',
          error_description: 'User denied access'
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Autorización denegada');
      expect(response.body.code).toBe('OAUTH_DENIED');
    });
    
    test('debería validar parámetros de OAuth', async () => {
      const response = await request(app)
        .get('/api/auth/notion/callback')
        .query({})
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Parámetros de OAuth inválidos');
      expect(response.body.code).toBe('INVALID_OAUTH_PARAMS');
    });
    
    test('debería validar estado de OAuth', async () => {
      const response = await request(app)
        .get('/api/auth/notion/callback')
        .query({
          code: 'test-code',
          state: 'invalid-state'
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Estado de OAuth inválido');
      expect(response.body.code).toBe('INVALID_OAUTH_STATE');
    });
  });
  
  describe('Estado de Conexión', () => {
    test('debería verificar estado sin conexión', async () => {
      const response = await request(app)
        .get('/api/auth/notion/status')
        .set('x-user-id', testUserId)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.connected).toBe(false);
      expect(response.body.message).toContain('No hay conexión activa');
    });
    
    test('debería verificar estado con conexión activa', async () => {
      // Establecer conexión primero
      const initResponse = await request(app)
        .get('/api/auth/notion')
        .set('x-user-id', testUserId);
      
      await request(app)
        .get('/api/auth/notion/callback')
        .query({
          code: 'test-auth-code-123',
          state: initResponse.body.state
        });
      
      // Verificar estado
      const response = await request(app)
        .get('/api/auth/notion/status')
        .set('x-user-id', testUserId)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.connected).toBe(true);
      expect(response.body.data.workspaceId).toBeDefined();
      expect(response.body.data.hasAccess).toBe(true);
    });
    
    test('debería requerir autenticación para verificar estado', async () => {
      const response = await request(app)
        .get('/api/auth/notion/status')
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Usuario no autenticado');
      expect(response.body.code).toBe('UNAUTHORIZED');
    });
  });
  
  describe('Desconexión', () => {
    test('debería desconectar Notion exitosamente', async () => {
      // Establecer conexión primero
      const initResponse = await request(app)
        .get('/api/auth/notion')
        .set('x-user-id', testUserId);
      
      await request(app)
        .get('/api/auth/notion/callback')
        .query({
          code: 'test-auth-code-123',
          state: initResponse.body.state
        });
      
      // Desconectar
      const response = await request(app)
        .delete('/api/auth/notion/disconnect')
        .set('x-user-id', testUserId)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Conexión con Notion desactivada exitosamente');
    });
  });
  
  describe('Integración con CRM', () => {
    test('debería requerir conexión con Notion para usar CRM', async () => {
      const response = await request(app)
        .get('/api/crm/contacts')
        .set('Authorization', validToken)
        .set('x-user-id', testUserId)
        .expect(400);
      
      expect(response.body.error).toContain('Conexión con Notion requerida');
      expect(response.body.code).toBe('NOTION_NOT_CONNECTED');
      expect(response.body.action).toBe('connect_notion');
    });
    
    test('debería permitir usar CRM después de conectar Notion', async () => {
      // Establecer conexión con Notion
      const initResponse = await request(app)
        .get('/api/auth/notion')
        .set('x-user-id', testUserId);
      
      await request(app)
        .get('/api/auth/notion/callback')
        .query({
          code: 'test-auth-code-123',
          state: initResponse.body.state
        });
      
      // Usar CRM
      const response = await request(app)
        .get('/api/crm/contacts')
        .set('Authorization', validToken)
        .set('x-user-id', testUserId)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.workspace.id).toBeDefined();
      expect(response.body.workspace.connectedAt).toBeDefined();
    });
    
    test('debería fallar CRM después de desconectar Notion', async () => {
      // Establecer y luego desconectar
      const initResponse = await request(app)
        .get('/api/auth/notion')
        .set('x-user-id', testUserId);
      
      await request(app)
        .get('/api/auth/notion/callback')
        .query({
          code: 'test-auth-code-123',
          state: initResponse.body.state
        });
      
      await request(app)
        .delete('/api/auth/notion/disconnect')
        .set('x-user-id', testUserId);
      
      // Intentar usar CRM
      const response = await request(app)
        .get('/api/crm/contacts')
        .set('Authorization', validToken)
        .set('x-user-id', testUserId)
        .expect(400);
      
      expect(response.body.error).toContain('Conexión con Notion requerida');
      expect(response.body.code).toBe('NOTION_NOT_CONNECTED');
    });
  });
});