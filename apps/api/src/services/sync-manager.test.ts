import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onContactAliasesChanged } from './sync-manager';
import { db, contactAliases, contacts } from '@cactus/db';

// Mocks
const { mockDb } = vi.hoisted(() => ({
  mockDb: vi.fn(),
}));

const createMockQueryBuilder = (result: any) => {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: (resolve: any) => resolve(result),
  };
  return builder;
};

vi.mock('@cactus/db', () => ({
  db: mockDb,
  contactAliases: {
    contactId: 'contact_aliases.contact_id',
    aliasNormalized: 'contact_aliases.alias_normalized',
  },
  contacts: { id: 'contacts.id' },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./aum-matcher', () => ({
  reprocessUnmatchedRowsForContact: vi.fn(),
}));

vi.mock('./contact-matcher', () => ({
  updateSingleContactMeetingStatus: vi.fn(),
}));

import { reprocessUnmatchedRowsForContact } from './aum-matcher';
import { updateSingleContactMeetingStatus } from './contact-matcher';

describe('SyncManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('onContactAliasesChanged', () => {
    it('should orchestration re-matching for AUM and Calendar', async () => {
      // Mock db calls sequence
      // 1. Fetch aliases (array)
      mockDb.mockReturnValueOnce(
        createMockQueryBuilder([{ aliasNormalized: 'j perez' }, { aliasNormalized: 'juan perez' }])
      );

      // 2. Fetch contact (array with 1 item)
      mockDb.mockReturnValueOnce(createMockQueryBuilder([{ id: 'contact-123' }]));

      await onContactAliasesChanged('contact-123');

      // 1. Check AUM reprocessing called with correct aliases
      expect(reprocessUnmatchedRowsForContact).toHaveBeenCalledWith('contact-123', [
        'j perez',
        'juan perez',
      ]);

      // 2. Check Calendar reprocessing called with contact
      expect(updateSingleContactMeetingStatus).toHaveBeenCalledWith({ id: 'contact-123' });
    });

    it('should handle missing contact gracefully', async () => {
      // 1. Aliases found
      mockDb.mockReturnValueOnce(createMockQueryBuilder([{ aliasNormalized: 'j perez' }]));
      // 2. Contact not found
      mockDb.mockReturnValueOnce(createMockQueryBuilder([]));

      await onContactAliasesChanged('contact-123');

      expect(reprocessUnmatchedRowsForContact).toHaveBeenCalled();
      expect(updateSingleContactMeetingStatus).not.toHaveBeenCalled();
    });

    it('should catch and log errors', async () => {
      // Throw error on first db call
      mockDb.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        then: (_resolve: any, reject: any) => reject(new Error('DB Error')),
      });

      await expect(onContactAliasesChanged('contact-123')).resolves.not.toThrow();
    });
  });
});
