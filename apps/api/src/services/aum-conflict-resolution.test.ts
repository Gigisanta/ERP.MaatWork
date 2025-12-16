import { describe, expect, it } from 'vitest';
import {
  inheritAdvisorFromExisting,
  shouldFlagConflict,
  type ExistingAumAccountSnapshot,
} from './aum-conflict-resolution';

const baseExistingRows: ExistingAumAccountSnapshot[] = [
  {
    holderName: 'Juan Perez',
    advisorRaw: 'Andrea Gomez',
    createdAt: new Date('2024-01-15T10:00:00Z'),
  },
  {
    holderName: 'Juan Perez',
    advisorRaw: 'andrea gomez', // Variante en minúsculas
    createdAt: new Date('2024-01-20T10:00:00Z'),
  },
];

describe('AUM Conflict Resolution Helpers', () => {
  describe('inheritAdvisorFromExisting', () => {
    it('returns incoming advisor when present', () => {
      const advisor = inheritAdvisorFromExisting('  Nicolas Zappia  ', baseExistingRows);
      expect(advisor).toBe('Nicolas Zappia');
    });

    it('inherits the most recent advisor when incoming is null', () => {
      const advisor = inheritAdvisorFromExisting(null, baseExistingRows);
      expect(advisor).toBe('andrea gomez');
    });

    it('returns null when no advisor information exists anywhere', () => {
      const advisor = inheritAdvisorFromExisting(undefined, [
        { holderName: 'Cliente', advisorRaw: null, createdAt: new Date('2024-02-01T00:00:00Z') },
      ]);
      expect(advisor).toBeNull();
    });
  });

  describe('shouldFlagConflict', () => {
    it('does not flag conflict when incoming advisor is missing but holder matches', () => {
      const conflict = shouldFlagConflict(baseExistingRows, 'Juan Perez', null);
      expect(conflict).toBe(false);
    });

    it('flags conflict when incoming holder differs from existing', () => {
      const conflict = shouldFlagConflict(baseExistingRows, 'Juana Perez', null);
      expect(conflict).toBe(true);
    });

    it('flags conflict when advisor differs and incoming advisor is provided', () => {
      const conflict = shouldFlagConflict(baseExistingRows, 'Juan Perez', 'Mateo Vicente');
      expect(conflict).toBe(true);
    });

    it('ignores advisor differences when existing advisor is empty', () => {
      const conflict = shouldFlagConflict(
        [{ holderName: 'Juan Perez', advisorRaw: null, createdAt: new Date() }],
        'Juan Perez',
        null
      );
      expect(conflict).toBe(false);
    });
  });
});
