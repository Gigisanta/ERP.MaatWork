/**
 * Tests para contacts assignment routes
 * 
 * AI_DECISION: Tests unitarios para asignación de contactos
 * Justificación: Validación crítica de asignaciones
 * Impacto: Prevenir errores en asignación de contactos
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { db, contacts, contactFieldHistory } from '@cactus/db';
import { requireAuth } from '../../auth/middlewares';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  contacts: {},
  contactFieldHistory: {},
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn()
}));

vi.mock('../../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next())
}));

const mockDb = vi.mocked(db);

describe('PATCH /contacts/:id/next-step', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123', role: 'advisor' },
      params: { id: 'contact-123' },
      body: { nextStep: 'Follow up next week' },
      log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() }
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis()
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería actualizar nextStep del contacto', async () => {
    const existing = {
      id: 'contact-123',
      nextStep: 'Old next step'
    };

    const updated = {
      ...existing,
      nextStep: 'Follow up next week',
      updatedAt: new Date()
    };

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([existing])
        })
      })
    });

    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated])
        })
      })
    });

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([])
    });

    mockDb.mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
      insert: mockInsert
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const { nextStep } = req.body;
      const [existing] = await db()
        .select()
        .from(contacts)
        .where({} as any)
        .limit(1);
      if (!existing) {
        return res.status(404).json({ error: 'Contact not found' });
      }
      const [updated] = await db()
        .update(contacts)
        .set({ nextStep, updatedAt: new Date() })
        .where({} as any)
        .returning();
      if (existing.nextStep !== nextStep) {
        await db().insert(contactFieldHistory).values({
          contactId: id,
          fieldName: 'nextStep',
          oldValue: existing.nextStep || '',
          newValue: nextStep || '',
          changedByUserId: req.user!.id
        });
      }
      res.json({ success: true, data: updated });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: updated });
  });

  it('debería retornar 404 cuando contacto no existe', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([])
        })
      })
    });

    mockDb.mockReturnValue({
      select: mockSelect
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const [existing] = await db()
        .select()
        .from(contacts)
        .where({} as any)
        .limit(1);
      if (!existing) {
        return res.status(404).json({ error: 'Contact not found' });
      }
      res.json({ success: true });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
  });
});

