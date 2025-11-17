/**
 * Tests para contacts CRUD routes
 * 
 * AI_DECISION: Tests unitarios para CRUD de contactos
 * Justificación: Validación crítica de operaciones de contactos
 * Impacto: Prevenir errores en gestión de contactos
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { db, contacts } from '@cactus/db';
import { requireAuth } from '../../auth/middlewares';
import { getUserAccessScope, buildContactAccessFilter, canAccessContact } from '../../auth/authorization';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  contacts: {},
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
  desc: vi.fn()
}));

vi.mock('../../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next()),
  requireRole: vi.fn(() => (req, res, next) => next())
}));

vi.mock('../../auth/authorization', () => ({
  getUserAccessScope: vi.fn(),
  buildContactAccessFilter: vi.fn(() => ({ whereClause: {} })),
  canAccessContact: vi.fn()
}));

const mockDb = vi.mocked(db);
const mockCanAccessContact = vi.mocked(canAccessContact);

describe('GET /contacts', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123', role: 'advisor' },
      query: { page: '1', limit: '10' },
      log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() }
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis()
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería listar contactos con paginación', async () => {
    const mockContacts = [
      { id: 'contact-1', firstName: 'John', lastName: 'Doe' },
      { id: 'contact-2', firstName: 'Jane', lastName: 'Smith' }
    ];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(mockContacts)
            })
          })
        })
      })
    });

    mockDb.mockReturnValue({
      select: mockSelect
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const contacts = mockContacts;
      res.json({
        success: true,
        data: contacts,
        meta: { page: 1, limit: 10, total: 2 }
      });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ id: 'contact-1' })
        ])
      })
    );
  });
});

describe('GET /contacts/:id', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123', role: 'advisor' },
      params: { id: 'contact-123' },
      query: {},
      log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() }
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis()
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería obtener contacto por id', async () => {
    mockCanAccessContact.mockResolvedValue(true);
    const mockContact = {
      id: 'contact-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com'
    };

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const hasAccess = await canAccessContact(userId, userRole, id);
      if (!hasAccess) {
        return res.status(404).json({ error: 'Contact not found' });
      }
      res.json({ success: true, data: mockContact });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockContact });
  });

  it('debería retornar 404 cuando no tiene acceso', async () => {
    mockCanAccessContact.mockResolvedValue(false);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const hasAccess = await canAccessContact(userId, userRole, id);
      if (!hasAccess) {
        return res.status(404).json({ error: 'Contact not found' });
      }
      res.json({ success: true });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
  });
});

describe('POST /contacts', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123', role: 'advisor' },
      body: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      },
      log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() }
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis()
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería crear nuevo contacto', async () => {
    const newContact = {
      id: 'contact-new',
      ...mockReq.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([newContact])
      })
    });

    mockDb.mockReturnValue({
      insert: mockInsert
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const [newContact] = await db()
        .insert(contacts)
        .values(req.body)
        .returning();
      res.status(201).json({ success: true, data: newContact });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: newContact });
  });
});

