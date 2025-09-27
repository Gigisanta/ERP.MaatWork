import { describe, it, expect, vi, beforeEach } from 'vitest';
import notionService from '../../api/services/notionService';

// Mock completo de Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: 'No workspace' })
    }))
  }))
}));

// Mock completo de Notion Client
vi.mock('@notionhq/client', () => ({
  Client: vi.fn(() => ({
    databases: {
      query: vi.fn().mockResolvedValue({ results: [] }),
      create: vi.fn().mockResolvedValue({ id: 'test-id' })
    },
    pages: {
      create: vi.fn().mockResolvedValue({ id: 'test-page-id' }),
      update: vi.fn().mockResolvedValue({ id: 'test-page-id' })
    }
  }))
}));

describe('NotionService - Tests Unitarios', () => {
  const testUserId = 'test-user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Inicialización del Servicio', () => {
    it('debería tener una instancia del servicio disponible', () => {
      expect(notionService).toBeDefined();
      expect(typeof notionService).toBe('object');
    });

    it('debería tener todos los métodos definidos', () => {
      expect(typeof notionService.getContacts).toBe('function');
      expect(typeof notionService.createContact).toBe('function');
      expect(typeof notionService.updateContact).toBe('function');
      expect(typeof notionService.deleteContact).toBe('function');
      expect(typeof notionService.getDeals).toBe('function');
      expect(typeof notionService.createDeal).toBe('function');
      expect(typeof notionService.updateDeal).toBe('function');
      expect(typeof notionService.deleteDeal).toBe('function');
      expect(typeof notionService.getTasks).toBe('function');
      expect(typeof notionService.createTask).toBe('function');
      expect(typeof notionService.updateTask).toBe('function');
      expect(typeof notionService.deleteTask).toBe('function');
    });
  });

  describe('Manejo de Errores', () => {
    it('debería manejar errores de workspace no encontrado', async () => {
      await expect(notionService.getContacts(testUserId))
        .rejects.toThrow('No se encontró workspace de Notion activo');
    });

    it('debería manejar errores en operaciones de contactos', async () => {
      const contactData = { name: 'Test Contact', email: 'test@example.com' };
      await expect(notionService.createContact(testUserId, contactData))
        .rejects.toThrow('No se encontró workspace de Notion activo');
    });

    it('debería manejar errores en operaciones de deals', async () => {
      const dealData = { title: 'Test Deal', amount: 1000 };
      await expect(notionService.createDeal(testUserId, dealData))
        .rejects.toThrow('No se encontró workspace de Notion activo');
    });

    it('debería manejar errores en operaciones de tasks', async () => {
      const taskData = { title: 'Test Task', description: 'Test description' };
      await expect(notionService.createTask(testUserId, taskData))
        .rejects.toThrow('No se encontró workspace de Notion activo');
    });
  });

  describe('Validación de Estructura', () => {
    it('debería validar que el servicio tenga la estructura correcta', () => {
      const methods = [
        'getContacts', 'createContact', 'updateContact', 'deleteContact',
        'getDeals', 'createDeal', 'updateDeal', 'deleteDeal',
        'getTasks', 'createTask', 'updateTask', 'deleteTask',
        'getNotionClient', 'migrateFromSupabase'
      ];

      methods.forEach(method => {
        expect(notionService).toHaveProperty(method);
        expect(typeof (notionService as any)[method]).toBe('function');
      });
    });
  });
});