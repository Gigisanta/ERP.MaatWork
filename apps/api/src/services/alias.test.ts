import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findContactByName, addContactAlias } from './alias';

// Mock dependencies
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
};

vi.mock('@maatwork/db', () => ({
  db: () => mockDb,
  contacts: { id: 'contacts.id', normalizedFullName: 'contacts.normalized_full_name' },
  contactAliases: {
    id: 'contact_aliases.id',
    contactId: 'contact_aliases.contact_id',
    aliasNormalized: 'contact_aliases.alias_normalized',
    isVerified: 'contact_aliases.is_verified',
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./sync-manager', () => ({
  onContactAliasesChanged: vi.fn().mockResolvedValue(undefined),
}));

import { onContactAliasesChanged } from './sync-manager';

describe('AliasService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findContactByName', () => {
    it('should return null for empty name', async () => {
      const result = await findContactByName('');
      expect(result).toBeNull();
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should find contact by normalizedFullName', async () => {
      mockDb.limit.mockResolvedValueOnce([{ id: 'contact-123' }]); // contacts match

      const result = await findContactByName('Juan Perez');

      expect(mockDb.where).toHaveBeenCalledWith(expect.anything()); // normalized match
      expect(result).toBe('contact-123');
    });

    it('should find contact by alias if main name not found', async () => {
      mockDb.limit
        .mockResolvedValueOnce([]) // contacts miss
        .mockResolvedValueOnce([{ contactId: 'contact-456' }]); // aliases match

      const result = await findContactByName('J. Perez');

      expect(result).toBe('contact-456');
    });

    it('should return null if no match found', async () => {
      mockDb.limit
        .mockResolvedValueOnce([]) // contacts miss
        .mockResolvedValueOnce([]); // aliases miss

      const result = await findContactByName('Unknown');
      expect(result).toBeNull();
    });
  });

  describe('addContactAlias', () => {
    it('should add new alias if not exists', async () => {
      mockDb.limit.mockResolvedValueOnce([]); // no existing alias

      await addContactAlias('contact-123', 'J. Perez', 'manual', true);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          contactId: 'contact-123',
          alias: 'J. Perez',
          aliasNormalized: 'j perez',
          isVerified: true,
        })
      );
      expect(onContactAliasesChanged).toHaveBeenCalledWith('contact-123');
    });

    it('should not add if alias exists and verification level is same', async () => {
      mockDb.limit.mockResolvedValueOnce([{ id: 'alias-1', isVerified: true }]);

      await addContactAlias('contact-123', 'J. Perez', 'manual', true);

      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(mockDb.update).not.toHaveBeenCalled();
      // Should not trigger sync if nothing changed
      expect(onContactAliasesChanged).not.toHaveBeenCalled();
    });

    it('should upgrade confidence if alias exists but unverified', async () => {
      mockDb.limit.mockResolvedValueOnce([{ id: 'alias-1', isVerified: false }]);

      await addContactAlias('contact-123', 'J. Perez', 'manual', true);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({ isVerified: true, confidence: 1.0 });
      expect(onContactAliasesChanged).toHaveBeenCalledWith('contact-123');
    });
  });
});








