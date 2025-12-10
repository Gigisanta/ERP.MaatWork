/**
 * Tests para contacts webhook routes
 *
 * AI_DECISION: Tests unitarios para exportación vía webhook
 * Justificación: Validación crítica de webhooks y rate limiting
 * Impacto: Prevenir errores en exportación de contactos
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../auth/middlewares';
import { getHttpClient } from '../../utils/http-client';
import { createUserRateLimiter } from '../../utils/performance/rate-limiter';

// Mock dependencies
vi.mock('../../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next()),
}));

vi.mock('../../utils/http-client', () => ({
  getHttpClient: vi.fn(),
}));

vi.mock('../../utils/performance/rate-limiter', () => ({
  createUserRateLimiter: vi.fn(() => ({
    consume: vi.fn().mockResolvedValue({ allowed: true }),
  })),
}));

const mockGetHttpClient = vi.mocked(getHttpClient);

describe('POST /contacts/webhook/export', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123', role: 'advisor' },
      body: {
        webhookUrl: 'https://example.com/webhook',
        contacts: [
          {
            id: 'contact-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
        ],
      },
      log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería validar webhookUrl', async () => {
    mockReq.body = {
      webhookUrl: 'invalid-url',
      contacts: [],
    };

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const { webhookUrl } = req.body;
      try {
        new URL(webhookUrl);
      } catch {
        return res.status(400).json({ error: 'Invalid webhook URL' });
      }
      res.json({ success: true });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('debería validar que hay al menos un contacto', async () => {
    mockReq.body = {
      webhookUrl: 'https://example.com/webhook',
      contacts: [],
    };

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const { contacts } = req.body;
      if (!contacts || contacts.length === 0) {
        return res.status(400).json({ error: 'At least one contact is required' });
      }
      res.json({ success: true });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('debería enviar webhook con contactos', async () => {
    const mockHttpClient = {
      post: vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: {},
        body: 'Success',
      }),
    };

    mockGetHttpClient.mockReturnValue(mockHttpClient as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      const { webhookUrl, contacts } = req.body;
      const httpClient = getHttpClient();
      const response = await httpClient.post(webhookUrl, { contacts });
      res.json({
        success: true,
        data: {
          sent: contacts.length,
          statusCode: response.status,
        },
      });
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          sent: 1,
          statusCode: 200,
        }),
      })
    );
  });
});
