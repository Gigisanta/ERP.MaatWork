/**
 * Tests para aumMatcher service
 *
 * AI_DECISION: Tests unitarios para servicio de matching AUM
 * Justificación: Validación crítica de lógica de matching de contactos y asesores
 * Impacto: Prevenir errores en matching y mejorar confianza en importación
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  matchContactByAccountNumber,
  matchContactByHolderName,
  batchMatchContactsByAccountNumber,
  matchAdvisorByEmail,
  matchAdvisorByAlias,
  batchMatchAdvisorsByAlias,
  matchAdvisor,
  matchRow,
  isDuplicateRow,
  isNameSimilarityHigh,
  computeMatchStatus,
  calculateNameSimilarity,
} from './aum/matcher';

// Mock alias service
vi.mock('./alias', () => ({
  findContactByName: vi.fn().mockResolvedValue(null),
}));
import { findContactByName } from './alias';

// Mock dependencies
vi.mock('@maatwork/db', () => ({
  db: vi.fn(),
  contacts: {},
  brokerAccounts: {},
  users: {},
  advisorAliases: {},
  aumImportRows: {},
}));
import { db } from '@maatwork/db';

vi.mock('../utils/aum/aum-normalization', () => ({
  normalizeAdvisorAlias: vi.fn((alias: string) => alias.trim().toLowerCase()),
}));
import { normalizeAdvisorAlias } from '../utils/aum/aum-normalization';

vi.mock('../config/aum-limits', () => ({
  AUM_LIMITS: {
    SIMILARITY_THRESHOLD: 0.5,
    MIN_NAME_SIMILARITY: 0.7,
    MAX_SIMILARITY_RESULTS: 5,
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}));
import { logger } from '../utils/logger';

const mockDb = vi.mocked(db);
const mockNormalizeAdvisorAlias = vi.mocked(normalizeAdvisorAlias);
const mockLogger = vi.mocked(logger);

describe('aumMatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.mockReset();
  });

  describe('matchContactByAccountNumber', () => {
    it('debería retornar match exitoso cuando encuentra contacto', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ contactId: 'contact-123' }]),
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await matchContactByAccountNumber('balanz', '12345');

      expect(result).toEqual({
        contactId: 'contact-123',
        score: 1.0,
        method: 'broker_account',
      });
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('debería retornar null cuando no encuentra contacto', async () => {
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

      const result = await matchContactByAccountNumber('balanz', '12345');

      expect(result).toBeNull();
    });

    it('debería retornar null cuando hay error en DB', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('DB error')),
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await matchContactByAccountNumber('balanz', '12345');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ accountNumber: '12345' }),
        'Failed to match contact by account number'
      );
    });
  });

  describe('matchContactByHolderName', () => {
    it('debería match exacto usando alias service', async () => {
      (findContactByName as any).mockResolvedValueOnce('contact-alias-123');

      const result = await matchContactByHolderName('J. Perez');

      expect(result).toEqual({
        contactId: 'contact-alias-123',
        score: 1.0,
        method: 'name_exact',
      });
      expect(findContactByName).toHaveBeenCalledWith('J. Perez');
    });

    it('debería retornar match por similarity cuando sim_score > threshold', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        rows: [
          {
            id: 'contact-123',
            full_name: 'Juan Perez',
            sim_score: 0.85,
          },
        ],
      });

      mockDb.mockReturnValue({
        execute: mockExecute,
      } as any);

      const result = await matchContactByHolderName('Juan Perez');

      expect(result).toEqual({
        contactId: 'contact-123',
        score: 0.85,
        method: 'name_similarity',
      });
      expect(mockExecute).toHaveBeenCalled();
    });

    it('debería retornar null cuando sim_score <= threshold', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        rows: [
          {
            id: 'contact-123',
            full_name: 'Juan Perez',
            sim_score: 0.3,
          },
        ],
      });

      mockDb.mockReturnValue({
        execute: mockExecute,
      } as any);

      const result = await matchContactByHolderName('Juan Perez');

      expect(result).toBeNull();
    });

    it('debería retornar null cuando no encuentra contacto', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        rows: [],
      });

      mockDb.mockReturnValue({
        execute: mockExecute,
      } as any);

      const result = await matchContactByHolderName('Juan Perez');

      expect(result).toBeNull();
    });
  });

  describe('batchMatchContactsByAccountNumber', () => {
    it('debería retornar múltiples matches', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { accountNumber: '12345', contactId: 'contact-1' },
            { accountNumber: '67890', contactId: 'contact-2' },
          ]),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await batchMatchContactsByAccountNumber('balanz', ['12345', '67890', '99999']);

      expect(result.size).toBe(2);
      expect(result.get('12345')).toEqual({
        contactId: 'contact-1',
        score: 1.0,
        method: 'broker_account',
      });
      expect(result.get('67890')).toEqual({
        contactId: 'contact-2',
        score: 1.0,
        method: 'broker_account',
      });
      expect(result.get('99999')).toBeUndefined();
    });

    it('debería retornar Map vacío cuando no hay matches', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await batchMatchContactsByAccountNumber('balanz', ['12345', '67890']);

      expect(result.size).toBe(0);
    });

    it('debería retornar Map vacío cuando accountNumbers está vacío', async () => {
      const result = await batchMatchContactsByAccountNumber('balanz', []);
      expect(result.size).toBe(0);
    });

    it('debería retornar Map vacío cuando hay error en DB', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('DB error')),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await batchMatchContactsByAccountNumber('balanz', ['12345']);

      expect(result.size).toBe(0);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('matchAdvisorByEmail', () => {
    it('debería retornar match exitoso cuando encuentra advisor', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'user-123' }]),
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await matchAdvisorByEmail('advisor@example.com');

      expect(result).toEqual({
        userId: 'user-123',
        score: 1.0,
        method: 'email',
      });
    });

    it('debería retornar null cuando no encuentra advisor', async () => {
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

      const result = await matchAdvisorByEmail('advisor@example.com');

      expect(result).toBeNull();
    });
  });

  describe('matchAdvisorByAlias', () => {
    it('debería retornar match exitoso cuando encuentra advisor', async () => {
      mockNormalizeAdvisorAlias.mockReturnValue('juan perez');

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ userId: 'user-123' }]),
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await matchAdvisorByAlias('Juan Perez');

      expect(result).toEqual({
        userId: 'user-123',
        score: 1.0,
        method: 'alias',
      });
    });

    it('debería retornar null cuando no encuentra advisor', async () => {
      mockNormalizeAdvisorAlias.mockReturnValue('juan perez');

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

      const result = await matchAdvisorByAlias('Juan Perez');

      expect(result).toBeNull();
    });
  });

  describe('batchMatchAdvisorsByAlias', () => {
    it('debería retornar múltiples matches', async () => {
      mockNormalizeAdvisorAlias.mockImplementation((alias: string) => alias.trim().toLowerCase());

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { aliasNormalized: 'juan perez', userId: 'user-1' },
            { aliasNormalized: 'maria lopez', userId: 'user-2' },
          ]),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await batchMatchAdvisorsByAlias(['Juan Perez', 'Maria Lopez', 'Pedro Garcia']);

      expect(result.size).toBe(2);
      expect(result.get('juan perez')).toEqual({
        userId: 'user-1',
        score: 1.0,
        method: 'alias',
      });
      expect(result.get('maria lopez')).toEqual({
        userId: 'user-2',
        score: 1.0,
        method: 'alias',
      });
    });

    it('debería retornar Map vacío cuando aliases está vacío', async () => {
      const result = await batchMatchAdvisorsByAlias([]);
      expect(result.size).toBe(0);
    });
  });

  describe('matchAdvisor', () => {
    it('debería usar email match cuando value es email-like', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'user-123' }]),
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await matchAdvisor('advisor@example.com');

      expect(result).toEqual({
        userId: 'user-123',
        score: 1.0,
        method: 'email',
      });
    });

    it('debería usar alias match cuando value no es email-like', async () => {
      mockNormalizeAdvisorAlias.mockReturnValue('juan perez');

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ userId: 'user-123' }]),
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await matchAdvisor('Juan Perez');

      expect(result).toEqual({
        userId: 'user-123',
        score: 1.0,
        method: 'alias',
      });
    });

    it('debería retornar null cuando advisorRaw es null', async () => {
      const result = await matchAdvisor(null);
      expect(result).toBeNull();
    });
  });

  describe('matchRow', () => {
    it('debería match contact por accountNumber primero', async () => {
      // Mock matchContactByAccountNumber
      const mockSelectContact = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ contactId: 'contact-123' }]),
          }),
        }),
      });

      // Mock matchAdvisorByEmail
      const mockSelectAdvisor = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'user-123' }]),
          }),
        }),
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelectContact } as any;
        }
        return { select: mockSelectAdvisor } as any;
      });

      const result = await matchRow('balanz', '12345', 'Juan Perez', 'advisor@example.com');

      expect(result.contactMatch).toEqual({
        contactId: 'contact-123',
        score: 1.0,
        method: 'broker_account',
      });
      expect(result.advisorMatch).toEqual({
        userId: 'user-123',
        score: 1.0,
        method: 'email',
      });
    });
  });

  describe('isDuplicateRow', () => {
    it('debería retornar true cuando hay un duplicado exacto en los últimos 30 días', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'row-123' }]),
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await isDuplicateRow('balanz', '12345', 'Juan Perez');

      expect(result).toBe(true);
    });

    it('debería retornar false cuando no hay duplicados', async () => {
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

      const result = await isDuplicateRow('balanz', '12345', 'Juan Perez');

      expect(result).toBe(false);
    });
  });

  describe('calculateNameSimilarity', () => {
    it('debería retornar 1.0 para nombres idénticos', () => {
      const result = calculateNameSimilarity('Juan Perez', 'Juan Perez');
      expect(result).toBe(1.0);
    });

    it('debería retornar similitud para substring match', () => {
      const result = calculateNameSimilarity('Juan Perez', 'Juan');
      // Cuando uno es substring significativo del otro (>3 chars), retorna 0.9
      expect(result).toBe(0.9);
    });
  });

  describe('isNameSimilarityHigh', () => {
    it('debería retornar true cuando similitud >= threshold', () => {
      const result = isNameSimilarityHigh('Juan Perez', 'Juan Perez');
      expect(result).toBe(true);
    });

    it('debería retornar false cuando similitud < threshold', () => {
      const result = isNameSimilarityHigh('Juan Perez', 'Pedro Garcia');
      expect(result).toBe(false);
    });
  });

  describe('computeMatchStatus', () => {
    it('debería retornar "matched" cuando matchedContactId tiene score alto', () => {
      const result = computeMatchStatus({
        contactMatch: { contactId: 'contact-123', score: 1.0, method: 'broker_account' },
        advisorMatch: null,
      });

      expect(result).toBe('matched');
    });

    it('debería retornar "ambiguous" cuando matchedContactId tiene score medio', () => {
      const result = computeMatchStatus({
        contactMatch: { contactId: 'contact-123', score: 0.8, method: 'name_similarity' },
        advisorMatch: null,
      });

      expect(result).toBe('ambiguous');
    });

    it('debería retornar "unmatched" cuando no hay match', () => {
      const result = computeMatchStatus({
        contactMatch: null,
        advisorMatch: null,
      });

      expect(result).toBe('unmatched');
    });
  });
});
