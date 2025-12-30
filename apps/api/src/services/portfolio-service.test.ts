/**
 * Tests para portfolio-service
 *
 * AI_DECISION: Tests unitarios para funciones de portfolio service
 * Justificación: Validación crítica de acceso y joins
 * Impacto: Prevenir errores en acceso a portfolios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@maatwork/db';
import { canAccessContact } from '../auth/authorization';
import { getPortfolioTemplateLines, getAssignmentWithAccessCheck } from './portfolio-service';

// Mock dependencies
vi.mock('@maatwork/db', async () => {
  const actual = await vi.importActual('@maatwork/db');
  return {
    ...actual,
    db: vi.fn(),
  };
});

vi.mock('../auth/authorization', () => ({
  canAccessContact: vi.fn(),
}));

const mockDb = vi.mocked(db);
const mockCanAccessContact = vi.mocked(canAccessContact);

// Helper to create a chainable mock
const createChainableMock = (finalValue: unknown) => {
  const mock = vi.fn().mockImplementation(() => mock) as any;

  mock.select = vi.fn().mockReturnValue(mock);
  mock.from = vi.fn().mockReturnValue(mock);
  mock.where = vi.fn().mockReturnValue(mock);
  mock.orderBy = vi.fn().mockReturnValue(mock);
  mock.limit = vi.fn().mockReturnValue(mock);
  mock.offset = vi.fn().mockReturnValue(mock);
  mock.innerJoin = vi.fn().mockReturnValue(mock);
  mock.leftJoin = vi.fn().mockReturnValue(mock);
  mock.groupBy = vi.fn().mockReturnValue(mock);
  mock.insert = vi.fn().mockReturnValue(mock);
  mock.values = vi.fn().mockReturnValue(mock);
  mock.update = vi.fn().mockReturnValue(mock);
  mock.set = vi.fn().mockReturnValue(mock);
  mock.delete = vi.fn().mockReturnValue(mock);
  mock.returning = vi.fn().mockReturnValue(mock);

  mock.then = (onRes: (value: unknown) => void, onRej: (reason: unknown) => void) =>
    Promise.resolve(finalValue).then(onRes, onRej);

  return mock as unknown as ReturnType<typeof db>;
};

describe('getPortfolioTemplateLines', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería obtener líneas de template con metadata', async () => {
    const mockLines = [
      {
        id: 'line-1',
        targetType: 'instrument',
        instrumentId: 'inst-1',
        targetWeight: 0.5,
        instrumentName: 'AAPL',
        instrumentSymbol: 'AAPL',
        assetClassName: null,
      },
    ];

    mockDb.mockReturnValue(createChainableMock(mockLines));

    const result = await getPortfolioTemplateLines('template-123', { includeMetadata: true });

    expect(result).toEqual(mockLines);
  });

  it('debería obtener líneas sin metadata cuando includeMetadata es false', async () => {
    const mockLines = [
      {
        id: 'line-1',
        targetType: 'instrument',
        targetWeight: 0.5,
      },
    ];

    mockDb.mockReturnValue(createChainableMock(mockLines));

    const result = await getPortfolioTemplateLines('template-123', { includeMetadata: false });

    expect(result).toEqual(mockLines);
  });
});

describe('getAssignmentWithAccessCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería retornar asignación cuando existe y tiene acceso', async () => {
    const mockAssignment = {
      id: 'assignment-123',
      contactId: 'contact-123',
      templateId: 'template-123',
    };

    mockDb.mockReturnValue(createChainableMock([mockAssignment]));

    mockCanAccessContact.mockResolvedValue(true);

    const result = await getAssignmentWithAccessCheck('assignment-123', 'user-123', 'advisor');

    expect(result).toEqual(mockAssignment);
    expect(mockCanAccessContact).toHaveBeenCalledWith('user-123', 'advisor', 'contact-123');
  });

  it('debería retornar null cuando asignación no existe', async () => {
    mockDb.mockReturnValue(createChainableMock([]));

    const result = await getAssignmentWithAccessCheck('assignment-123', 'user-123', 'advisor');

    expect(result).toBeNull();
    expect(mockCanAccessContact).not.toHaveBeenCalled();
  });

  it('debería retornar null cuando no tiene acceso al contacto', async () => {
    const mockAssignment = {
      id: 'assignment-123',
      contactId: 'contact-123',
      templateId: 'template-123',
    };

    mockDb.mockReturnValue(createChainableMock([mockAssignment]));

    mockCanAccessContact.mockResolvedValue(false);

    const result = await getAssignmentWithAccessCheck('assignment-123', 'user-123', 'advisor');

    expect(result).toBeNull();
    expect(mockCanAccessContact).toHaveBeenCalledWith('user-123', 'advisor', 'contact-123');
  });
});
