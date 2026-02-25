/**
 * Tests para contact-access middleware
 *
 * AI_DECISION: Tests unitarios para middleware de acceso a contactos
 * Justificación: Validación crítica de seguridad y acceso
 * Impacto: Prevenir accesos no autorizados
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { canAccessContact } from '../auth/authorization';
import { requireContactAccess } from './contact-access';

// Mock dependencies
vi.mock('../auth/authorization', () => ({
  canAccessContact: vi.fn(),
}));

const mockCanAccessContact = vi.mocked(canAccessContact);

describe('requireContactAccess', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123', role: 'advisor' },
      params: {},
      body: {},
      query: {},
      log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería retornar 401 cuando usuario no autenticado', async () => {
    mockReq.user = undefined;

    await requireContactAccess(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Usuario no autenticado' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('debería buscar contactId en params.id', async () => {
    mockReq.params = { id: 'contact-123' };
    mockCanAccessContact.mockResolvedValue(true);

    await requireContactAccess(mockReq as Request, mockRes as Response, mockNext);

    expect(mockCanAccessContact).toHaveBeenCalledWith('user-123', 'advisor', 'contact-123');
    expect(mockNext).toHaveBeenCalled();
  });

  it('debería buscar contactId en params.contactId', async () => {
    mockReq.params = { contactId: 'contact-456' };
    mockCanAccessContact.mockResolvedValue(true);

    await requireContactAccess(mockReq as Request, mockRes as Response, mockNext);

    expect(mockCanAccessContact).toHaveBeenCalledWith('user-123', 'advisor', 'contact-456');
    expect(mockNext).toHaveBeenCalled();
  });

  it('debería buscar contactId en body.contactId', async () => {
    mockReq.body = { contactId: 'contact-789' };
    mockCanAccessContact.mockResolvedValue(true);

    await requireContactAccess(mockReq as Request, mockRes as Response, mockNext);

    expect(mockCanAccessContact).toHaveBeenCalledWith('user-123', 'advisor', 'contact-789');
    expect(mockNext).toHaveBeenCalled();
  });

  it('debería buscar contactId en query.contactId', async () => {
    mockReq.query = { contactId: 'contact-999' };
    mockCanAccessContact.mockResolvedValue(true);

    await requireContactAccess(mockReq as Request, mockRes as Response, mockNext);

    expect(mockCanAccessContact).toHaveBeenCalledWith('user-123', 'advisor', 'contact-999');
    expect(mockNext).toHaveBeenCalled();
  });

  it('debería retornar 400 cuando contactId no está presente', async () => {
    mockReq.params = {};
    mockReq.body = {};
    mockReq.query = {};

    await requireContactAccess(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'contactId is required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('debería retornar 403 cuando no tiene acceso', async () => {
    mockReq.params = { id: 'contact-123' };
    mockCanAccessContact.mockResolvedValue(false);

    await requireContactAccess(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'No tienes acceso a este contacto' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('debería retornar 500 cuando hay error', async () => {
    mockReq.params = { id: 'contact-123' };
    const error = new Error('Database error');
    mockCanAccessContact.mockRejectedValue(error);

    await requireContactAccess(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.log?.error).toHaveBeenCalledWith(
      { err: error, contactId: 'contact-123' },
      'Error checking contact access'
    );
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' });
  });

  it('debería guardar contactId en req.contactId cuando tiene acceso', async () => {
    mockReq.params = { id: 'contact-123' };
    mockCanAccessContact.mockResolvedValue(true);

    await requireContactAccess(mockReq as Request, mockRes as Response, mockNext);

    expect((mockReq as any).contactId).toBe('contact-123');
    expect(mockNext).toHaveBeenCalled();
  });
});
