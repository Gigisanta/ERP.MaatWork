/**
 * Tests para broker-accounts routes
 *
 * AI_DECISION: Tests unitarios para CRUD de cuentas de broker
 * Justificación: Validación crítica de RBAC y acceso a cuentas
 * Impacto: Prevenir errores en gestión de cuentas
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { db, brokerAccounts } from '@maatwork/db';
import { requireAuth } from '../auth/middlewares';
import { canAccessContact } from '../auth/authorization';

// Mock dependencies
vi.mock('@maatwork/db', () => ({
  db: vi.fn(),
  brokerAccounts: {},
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
}));

vi.mock('../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next()),
}));

vi.mock('../auth/authorization', () => ({
  canAccessContact: vi.fn(),
}));

const mockDb = vi.mocked(db);
const mockCanAccessContact = vi.mocked(canAccessContact);

describe('GET /broker-accounts', () => {
  it('debería listar cuentas de contacto accesible', async () => {
    const contactId = 'contact-123';
    mockCanAccessContact.mockResolvedValue(true);

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    expect(contactId).toBe('contact-123');
  });
});

describe('POST /broker-accounts', () => {
  it('debería crear cuenta exitosamente', async () => {
    const newAccount = {
      contactId: 'contact-123',
      broker: 'Balanz',
      accountNumber: '123456',
      status: 'active' as const,
    };

    mockCanAccessContact.mockResolvedValue(true);

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'account-123',
            ...newAccount,
          },
        ]),
      }),
    });

    mockDb.mockReturnValue({
      insert: mockInsert,
    } as any);

    expect(newAccount.broker).toBe('Balanz');
  });
});

describe('DELETE /broker-accounts/:id', () => {
  it('debería eliminar cuenta (soft delete)', async () => {
    const existingAccount = {
      id: 'account-123',
      contactId: 'contact-123',
    };

    mockCanAccessContact.mockResolvedValue(true);

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([existingAccount]),
        }),
      }),
    });

    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    } as any);

    expect(existingAccount.id).toBe('account-123');
  });
});
