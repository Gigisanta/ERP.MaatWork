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
  detectDuplicates,
  calculateNameSimilarity,
  isNameSimilarityHigh,
  computeMatchStatus,
  type ContactMatch,
  type AdvisorMatch,
  type MatchResult
} from './aumMatcher';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  contacts: {},
  brokerAccounts: {},
  users: {},
  advisorAliases: {},
  eq: vi.fn(),
  sql: vi.fn()
}));

vi.mock('../utils/aum-normalization', () => ({
  normalizeAdvisorAlias: vi.fn((alias: string) => alias.trim().toLowerCase())
}));

vi.mock('../config/aum-limits', () => ({
  AUM_LIMITS: {
    SIMILARITY_THRESHOLD: 0.5,
    MAX_SIMILARITY_RESULTS: 5
  }
}));

vi.mock('../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn()
  }
}));

import { db } from '@cactus/db';
import { brokerAccounts, contacts, users, advisorAliases, eq, sql } from '@cactus/db';
import { normalizeAdvisorAlias } from '../utils/aum-normalization';
import { AUM_LIMITS } from '../config/aum-limits';
import { logger } from '../utils/logger';

const mockDb = vi.mocked(db);
const mockNormalizeAdvisorAlias = vi.mocked(normalizeAdvisorAlias);
const mockLogger = vi.mocked(logger);

describe('aumMatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('matchContactByAccountNumber', () => {
    it('debería retornar match exitoso cuando encuentra contacto', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ contactId: 'contact-123' }])
            })
          })
        })
      });

      mockDb.mockReturnValue({
        select: mockSelect
      } as any);

      const result = await matchContactByAccountNumber('balanz', '12345');

      expect(result).toEqual({
        contactId: 'contact-123',
        score: 1.0,
        method: 'broker_account'
      });
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('debería retornar null cuando no encuentra contacto', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([])
            })
          })
        })
      });

      mockDb.mockReturnValue({
        select: mockSelect
      } as any);

      const result = await matchContactByAccountNumber('balanz', '12345');

      expect(result).toBeNull();
    });

    it('debería retornar null cuando hay error en DB', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockRejectedValue(new Error('DB error'))
            })
          })
        })
      });

      mockDb.mockReturnValue({
        select: mockSelect
      } as any);

      const result = await matchContactByAccountNumber('balanz', '12345');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ accountNumber: '12345' }),
        'Error matching AUM row by account number'
      );
    });

    it('debería retornar null cuando contactId es null', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ contactId: null }])
            })
          })
        })
      });

      mockDb.mockReturnValue({
        select: mockSelect
      } as any);

      const result = await matchContactByAccountNumber('balanz', '12345');

      expect(result).toBeNull();
    });
  });

  describe('matchContactByHolderName', () => {
    it('debería retornar match por similarity cuando sim_score > threshold', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        rows: [{
          id: 'contact-123',
          full_name: 'Juan Perez',
          sim_score: 0.85
        }]
      });

      mockDb.mockReturnValue({
        execute: mockExecute
      } as any);

      const result = await matchContactByHolderName('Juan Perez');

      expect(result).toEqual({
        contactId: 'contact-123',
        score: 0.85,
        method: 'name_similarity'
      });
      expect(mockExecute).toHaveBeenCalled();
    });

    it('debería retornar null cuando sim_score <= threshold', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        rows: [{
          id: 'contact-123',
          full_name: 'Juan Perez',
          sim_score: 0.3
        }]
      });

      mockDb.mockReturnValue({
        execute: mockExecute
      } as any);

      const result = await matchContactByHolderName('Juan Perez');

      expect(result).toBeNull();
    });

    it('debería hacer fallback a exact match cuando pg_trgm falla', async () => {
      // First call fails (pg_trgm error)
      const mockExecute = vi.fn()
        .mockRejectedValueOnce(new Error('pg_trgm not available'))
        .mockResolvedValueOnce({
          rows: [{ id: 'contact-123' }]
        });

      mockDb.mockReturnValue({
        execute: mockExecute
      } as any);

      const result = await matchContactByHolderName('Juan Perez');

      expect(result).toEqual({
        contactId: 'contact-123',
        score: 1.0,
        method: 'name_exact'
      });
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    it('debería retornar null cuando no encuentra contacto', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        rows: []
      });

      mockDb.mockReturnValue({
        execute: mockExecute
      } as any);

      const result = await matchContactByHolderName('Juan Perez');

      expect(result).toBeNull();
    });

    it('debería retornar null cuando ambos métodos fallan', async () => {
      const mockExecute = vi.fn()
        .mockRejectedValueOnce(new Error('pg_trgm error'))
        .mockRejectedValueOnce(new Error('exact match error'));

      mockDb.mockReturnValue({
        execute: mockExecute
      } as any);

      const result = await matchContactByHolderName('Juan Perez');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('batchMatchContactsByAccountNumber', () => {
    it('debería retornar múltiples matches', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        rows: [
          { account_number: '12345', contact_id: 'contact-1' },
          { account_number: '67890', contact_id: 'contact-2' }
        ]
      });

      mockDb.mockReturnValue({
        execute: mockExecute
      } as any);

      const result = await batchMatchContactsByAccountNumber('balanz', ['12345', '67890', '99999']);

      expect(result.size).toBe(2);
      expect(result.get('12345')).toEqual({
        contactId: 'contact-1',
        score: 1.0,
        method: 'broker_account'
      });
      expect(result.get('67890')).toEqual({
        contactId: 'contact-2',
        score: 1.0,
        method: 'broker_account'
      });
      expect(result.get('99999')).toBeUndefined();
    });

    it('debería retornar Map vacío cuando no hay matches', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        rows: []
      });

      mockDb.mockReturnValue({
        execute: mockExecute
      } as any);

      const result = await batchMatchContactsByAccountNumber('balanz', ['12345', '67890']);

      expect(result.size).toBe(0);
    });

    it('debería retornar Map vacío cuando accountNumbers está vacío', async () => {
      const result = await batchMatchContactsByAccountNumber('balanz', []);

      expect(result.size).toBe(0);
      expect(mockDb).not.toHaveBeenCalled();
    });

    it('debería retornar Map vacío cuando hay error en DB', async () => {
      const mockExecute = vi.fn().mockRejectedValue(new Error('DB error'));

      mockDb.mockReturnValue({
        execute: mockExecute
      } as any);

      const result = await batchMatchContactsByAccountNumber('balanz', ['12345']);

      expect(result.size).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('debería ignorar rows con contact_id null', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        rows: [
          { account_number: '12345', contact_id: 'contact-1' },
          { account_number: '67890', contact_id: null }
        ]
      });

      mockDb.mockReturnValue({
        execute: mockExecute
      } as any);

      const result = await batchMatchContactsByAccountNumber('balanz', ['12345', '67890']);

      expect(result.size).toBe(1);
      expect(result.get('12345')).toBeDefined();
      expect(result.get('67890')).toBeUndefined();
    });
  });

  describe('matchAdvisorByEmail', () => {
    it('debería retornar match exitoso cuando encuentra advisor', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'user-123' }])
          })
        })
      });

      mockDb.mockReturnValue({
        select: mockSelect
      } as any);

      const result = await matchAdvisorByEmail('advisor@example.com');

      expect(result).toEqual({
        userId: 'user-123',
        score: 1.0,
        method: 'email'
      });
    });

    it('debería retornar null cuando no encuentra advisor', async () => {
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

      const result = await matchAdvisorByEmail('advisor@example.com');

      expect(result).toBeNull();
    });

    it('debería retornar null cuando hay error en DB', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('DB error'))
          })
        })
      });

      mockDb.mockReturnValue({
        select: mockSelect
      } as any);

      const result = await matchAdvisorByEmail('advisor@example.com');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('matchAdvisorByAlias', () => {
    it('debería retornar match exitoso cuando encuentra advisor', async () => {
      mockNormalizeAdvisorAlias.mockReturnValue('juan perez');

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ userId: 'user-123' }])
          })
        })
      });

      mockDb.mockReturnValue({
        select: mockSelect
      } as any);

      const result = await matchAdvisorByAlias('Juan Perez');

      expect(result).toEqual({
        userId: 'user-123',
        score: 1.0,
        method: 'alias'
      });
      expect(mockNormalizeAdvisorAlias).toHaveBeenCalledWith('Juan Perez');
    });

    it('debería retornar null cuando no encuentra advisor', async () => {
      mockNormalizeAdvisorAlias.mockReturnValue('juan perez');

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

      const result = await matchAdvisorByAlias('Juan Perez');

      expect(result).toBeNull();
    });

    it('debería retornar null cuando hay error en DB', async () => {
      mockNormalizeAdvisorAlias.mockReturnValue('juan perez');

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('DB error'))
          })
        })
      });

      mockDb.mockReturnValue({
        select: mockSelect
      } as any);

      const result = await matchAdvisorByAlias('Juan Perez');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('batchMatchAdvisorsByAlias', () => {
    it('debería retornar múltiples matches', async () => {
      mockNormalizeAdvisorAlias.mockImplementation((alias: string) => alias.trim().toLowerCase());

      const mockExecute = vi.fn().mockResolvedValue({
        rows: [
          { alias_normalized: 'juan perez', user_id: 'user-1' },
          { alias_normalized: 'maria lopez', user_id: 'user-2' }
        ]
      });

      mockDb.mockReturnValue({
        execute: mockExecute
      } as any);

      const result = await batchMatchAdvisorsByAlias(['Juan Perez', 'Maria Lopez', 'Pedro Garcia']);

      expect(result.size).toBe(2);
      expect(result.get('juan perez')).toEqual({
        userId: 'user-1',
        score: 1.0,
        method: 'alias'
      });
      expect(result.get('maria lopez')).toEqual({
        userId: 'user-2',
        score: 1.0,
        method: 'alias'
      });
    });

    it('debería normalizar todos los aliases', async () => {
      mockNormalizeAdvisorAlias.mockImplementation((alias: string) => alias.trim().toLowerCase());

      const mockExecute = vi.fn().mockResolvedValue({
        rows: []
      });

      mockDb.mockReturnValue({
        execute: mockExecute
      } as any);

      await batchMatchAdvisorsByAlias(['Juan Perez', 'Maria Lopez']);

      expect(mockNormalizeAdvisorAlias).toHaveBeenCalledTimes(2);
      expect(mockNormalizeAdvisorAlias).toHaveBeenCalledWith('Juan Perez');
      expect(mockNormalizeAdvisorAlias).toHaveBeenCalledWith('Maria Lopez');
    });

    it('debería retornar Map vacío cuando aliases está vacío', async () => {
      const result = await batchMatchAdvisorsByAlias([]);

      expect(result.size).toBe(0);
      expect(mockDb).not.toHaveBeenCalled();
    });

    it('debería retornar Map vacío cuando hay error en DB', async () => {
      mockNormalizeAdvisorAlias.mockImplementation((alias: string) => alias.trim().toLowerCase());

      const mockExecute = vi.fn().mockRejectedValue(new Error('DB error'));

      mockDb.mockReturnValue({
        execute: mockExecute
      } as any);

      const result = await batchMatchAdvisorsByAlias(['Juan Perez']);

      expect(result.size).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('matchAdvisor', () => {
    it('debería usar email match cuando value es email-like', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'user-123' }])
          })
        })
      });

      mockDb.mockReturnValue({
        select: mockSelect
      } as any);

      const result = await matchAdvisor('advisor@example.com');

      expect(result).toEqual({
        userId: 'user-123',
        score: 1.0,
        method: 'email'
      });
    });

    it('debería usar alias match cuando value no es email-like', async () => {
      mockNormalizeAdvisorAlias.mockReturnValue('juan perez');

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ userId: 'user-123' }])
          })
        })
      });

      mockDb.mockReturnValue({
        select: mockSelect
      } as any);

      const result = await matchAdvisor('Juan Perez');

      expect(result).toEqual({
        userId: 'user-123',
        score: 1.0,
        method: 'alias'
      });
    });

    it('debería retornar null cuando advisorRaw es null', async () => {
      const result = await matchAdvisor(null);

      expect(result).toBeNull();
    });

    it('debería retornar null cuando advisorRaw es undefined', async () => {
      const result = await matchAdvisor(undefined);

      expect(result).toBeNull();
    });
  });

  describe('matchRow', () => {
    it('debería match contact por accountNumber primero', async () => {
      // Mock matchContactByAccountNumber
      const mockSelectContact = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ contactId: 'contact-123' }])
            })
          })
        })
      });

      // Mock matchAdvisorByEmail
      const mockSelectAdvisor = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'user-123' }])
          })
        })
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
        method: 'broker_account'
      });
      expect(result.advisorMatch).toEqual({
        userId: 'user-123',
        score: 1.0,
        method: 'email'
      });
    });

    it('debería match contact por holderName si accountNumber no match', async () => {
      // Mock matchContactByAccountNumber returns null
      const mockSelectContact = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([])
            })
          })
        })
      });

      // Mock matchContactByHolderName
      const mockExecute = vi.fn().mockResolvedValue({
        rows: [{
          id: 'contact-123',
          full_name: 'Juan Perez',
          sim_score: 0.9
        }]
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelectContact } as any;
        }
        return { execute: mockExecute } as any;
      });

      const result = await matchRow('balanz', '12345', 'Juan Perez', null);

      expect(result.contactMatch).toEqual({
        contactId: 'contact-123',
        score: 0.9,
        method: 'name_similarity'
      });
      expect(result.advisorMatch).toBeNull();
    });

    it('debería retornar null para ambos cuando no hay matches', async () => {
      const mockSelectContact = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([])
            })
          })
        })
      });

      const mockExecute = vi.fn().mockResolvedValue({
        rows: []
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelectContact } as any;
        }
        return { execute: mockExecute } as any;
      });

      const result = await matchRow('balanz', '12345', 'Juan Perez', null);

      expect(result.contactMatch).toBeNull();
      expect(result.advisorMatch).toBeNull();
    });
  });

  describe('detectDuplicates', () => {
    it('debería detectar conflictos cuando hay duplicados con diferencias', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        rows: [
          {
            account_number: '12345',
            holder_name: 'Juan Perez',
            advisor_raw: 'advisor1',
            file_id: 'file-1',
            created_at: new Date('2024-01-01')
          },
          {
            account_number: '12345',
            holder_name: 'Juan Perez',
            advisor_raw: 'advisor2',
            file_id: 'file-2',
            created_at: new Date('2024-01-02')
          }
        ]
      });

      mockDb.mockReturnValue({
        execute: mockExecute
      } as any);

      const result = await detectDuplicates();

      expect(result.size).toBe(1);
      expect(result.has('12345')).toBe(true);
    });

    it('debería no detectar conflictos cuando duplicados son idénticos', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        rows: [
          {
            account_number: '12345',
            holder_name: 'Juan Perez',
            advisor_raw: 'advisor1',
            file_id: 'file-1',
            created_at: new Date('2024-01-01')
          },
          {
            account_number: '12345',
            holder_name: 'Juan Perez',
            advisor_raw: 'advisor1',
            file_id: 'file-2',
            created_at: new Date('2024-01-02')
          }
        ]
      });

      mockDb.mockReturnValue({
        execute: mockExecute
      } as any);

      const result = await detectDuplicates();

      expect(result.size).toBe(0);
    });

    it('debería retornar Set vacío cuando no hay duplicados', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        rows: [
          {
            account_number: '12345',
            holder_name: 'Juan Perez',
            advisor_raw: 'advisor1',
            file_id: 'file-1',
            created_at: new Date('2024-01-01')
          }
        ]
      });

      mockDb.mockReturnValue({
        execute: mockExecute
      } as any);

      const result = await detectDuplicates();

      expect(result.size).toBe(0);
    });

    it('debería retornar Set vacío cuando hay error en DB', async () => {
      const mockExecute = vi.fn().mockRejectedValue(new Error('DB error'));

      mockDb.mockReturnValue({
        execute: mockExecute
      } as any);

      const result = await detectDuplicates();

      expect(result.size).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('calculateNameSimilarity', () => {
    it('debería retornar 1.0 para nombres idénticos', () => {
      const result = calculateNameSimilarity('Juan Perez', 'Juan Perez');

      expect(result).toBe(1.0);
    });

    it('debería retornar alta similitud para substring match', () => {
      const result = calculateNameSimilarity('Juan Perez', 'Juan');

      expect(result).toBeGreaterThan(0.8);
    });

    it('debería calcular similitud por caracteres comunes', () => {
      const result = calculateNameSimilarity('Juan', 'Jose');

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1.0);
    });

    it('debería retornar 0 cuando name1 es null', () => {
      const result = calculateNameSimilarity(null, 'Juan Perez');

      expect(result).toBe(0);
    });

    it('debería retornar 0 cuando name2 es null', () => {
      const result = calculateNameSimilarity('Juan Perez', null);

      expect(result).toBe(0);
    });

    it('debería manejar acentos correctamente', () => {
      const result = calculateNameSimilarity('José', 'Jose');

      expect(result).toBeGreaterThan(0.8);
    });
  });

  describe('isNameSimilarityHigh', () => {
    it('debería retornar true cuando similitud > 0.8', () => {
      const result = isNameSimilarityHigh('Juan Perez', 'Juan');

      expect(result).toBe(true);
    });

    it('debería retornar false cuando similitud <= 0.8', () => {
      const result = isNameSimilarityHigh('Juan Perez', 'Pedro Garcia');

      expect(result).toBe(false);
    });

    it('debería retornar true para nombres idénticos', () => {
      const result = isNameSimilarityHigh('Juan Perez', 'Juan Perez');

      expect(result).toBe(true);
    });
  });

  describe('computeMatchStatus', () => {
    it('debería retornar "matched" cuando matchedContactId existe', () => {
      const result = computeMatchStatus('contact-123');

      expect(result).toBe('matched');
    });

    it('debería retornar "unmatched" cuando matchedContactId es null', () => {
      const result = computeMatchStatus(null);

      expect(result).toBe('unmatched');
    });

    it('debería retornar "unmatched" cuando matchedContactId es undefined', () => {
      const result = computeMatchStatus(undefined);

      expect(result).toBe('unmatched');
    });
  });
});

