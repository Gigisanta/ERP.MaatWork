/**
 * Tests para portfolio-service
 *
 * AI_DECISION: Tests unitarios para funciones de portfolio service
 * Justificación: Validación crítica de acceso y joins
 * Impacto: Prevenir errores en acceso a portfolios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@cactus/db';
import { canAccessContact } from '../auth/authorization';
import { getPortfolioTemplateLines, getAssignmentWithAccessCheck } from './portfolio-service';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
}));

vi.mock('../auth/authorization', () => ({
  canAccessContact: vi.fn(),
}));

const mockDb = vi.mocked(db);
const mockCanAccessContact = vi.mocked(canAccessContact);

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

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockLines),
            }),
          }),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

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

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockLines),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

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

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockAssignment]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    mockCanAccessContact.mockResolvedValue(true);

    const result = await getAssignmentWithAccessCheck('assignment-123', 'user-123', 'advisor');

    expect(result).toEqual(mockAssignment);
    expect(mockCanAccessContact).toHaveBeenCalledWith('user-123', 'advisor', 'contact-123');
  });

  it('debería retornar null cuando asignación no existe', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

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

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockAssignment]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    mockCanAccessContact.mockResolvedValue(false);

    const result = await getAssignmentWithAccessCheck('assignment-123', 'user-123', 'advisor');

    expect(result).toBeNull();
    expect(mockCanAccessContact).toHaveBeenCalledWith('user-123', 'advisor', 'contact-123');
  });
});
