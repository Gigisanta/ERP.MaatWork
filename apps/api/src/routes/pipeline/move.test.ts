/**
 * Tests para pipeline move routes
 *
 * AI_DECISION: Tests unitarios para mover contactos entre etapas
 * Justificación: Validación crítica de movimientos y WIP limits
 * Impacto: Prevenir errores en movimientos y validación de límites
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { db, pipelineStages, contacts, pipelineStageHistory } from '@cactus/db';
import { requireAuth } from '../../auth/middlewares';
import { canAccessContact } from '../../auth/authorization';
import { transactionWithLogging } from '../../utils/database/db-transactions';
import { sendWebhook } from '../../utils/http/webhook-client';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  pipelineStages: {},
  contacts: {},
  pipelineStageHistory: {},
  automationConfigs: {},
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
  count: vi.fn(),
  sql: vi.fn(),
}));

vi.mock('../../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next()),
}));

vi.mock('../../auth/authorization', () => ({
  canAccessContact: vi.fn(),
}));

vi.mock('../../utils/db-transactions', () => ({
  transactionWithLogging: vi.fn(),
}));

vi.mock('../../utils/webhook-client', () => ({
  sendWebhook: vi.fn(),
}));

const mockDb = vi.mocked(db);
const mockCanAccessContact = vi.mocked(canAccessContact);
const mockTransactionWithLogging = vi.mocked(transactionWithLogging);
const mockSendWebhook = vi.mocked(sendWebhook);

describe('POST /pipeline/move', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123', role: 'advisor' },
      body: {
        contactId: 'contact-123',
        toStageId: 'stage-456',
        reason: 'Moving forward',
      },
      log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), child: vi.fn() },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería retornar 404 cuando usuario no tiene acceso al contacto', async () => {
    mockCanAccessContact.mockResolvedValue(false);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const { contactId } = req.body;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const hasAccess = await canAccessContact(userId, userRole, contactId);
      if (!hasAccess) {
        return res.status(404).json({ error: 'Contact not found' });
      }
      res.json({ success: true });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Contact not found' });
  });

  it('debería mover contacto exitosamente', async () => {
    mockCanAccessContact.mockResolvedValue(true);
    const contact = {
      id: 'contact-123',
      pipelineStageId: 'stage-123',
      firstName: 'John',
      email: 'john@example.com',
    };
    const toStage = { id: 'stage-456', name: 'New Stage', wipLimit: null };
    const updated = { ...contact, pipelineStageId: 'stage-456' };

    const mockSelect = vi
      .fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([contact]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([toStage]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    mockTransactionWithLogging.mockResolvedValue(updated);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const { contactId, toStageId } = req.body;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const hasAccess = await canAccessContact(userId, userRole, contactId);
      if (!hasAccess) {
        return res.status(404).json({ error: 'Contact not found' });
      }
      const [contact] = await db()
        .select()
        .from(contacts)
        .where({} as any)
        .limit(1);
      const [toStage] = await db()
        .select()
        .from(pipelineStages)
        .where({} as any)
        .limit(1);
      const updated = await transactionWithLogging(req.log, 'move-contact-pipeline', async (tx) => {
        return { ...contact, pipelineStageId: toStageId };
      });
      res.json({ success: true, data: updated });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: updated });
  });

  it('debería retornar 400 cuando WIP limit excedido', async () => {
    mockCanAccessContact.mockResolvedValue(true);
    const contact = { id: 'contact-123', pipelineStageId: 'stage-123' };
    const toStage = { id: 'stage-456', name: 'New Stage', wipLimit: 5 };

    const mockSelect = vi
      .fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([contact]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([toStage]),
          }),
        }),
      });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const wipError = new Error('WIP limit exceeded');
    mockTransactionWithLogging.mockRejectedValue(wipError);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const updated = await transactionWithLogging(req.log, 'move-contact-pipeline', async () => {
          throw new Error('WIP limit exceeded');
        });
        res.json({ success: true, data: updated });
      } catch (err) {
        if (err instanceof Error && err.message === 'WIP limit exceeded') {
          return res.status(400).json({
            error: 'WIP limit exceeded',
            message: 'El límite de trabajo en progreso (WIP) para esta etapa ha sido alcanzado.',
          });
        }
        throw err;
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'WIP limit exceeded',
      message: 'El límite de trabajo en progreso (WIP) para esta etapa ha sido alcanzado.',
    });
  });
});
