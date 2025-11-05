import { describe, it, expect } from 'vitest';
import { VersionConflictError, isVersionConflictError, updateWithVersion } from './optimistic-locking';

describe('optimistic-locking', () => {
  describe('VersionConflictError', () => {
    it('debería crear error con información correcta', () => {
      const error = new VersionConflictError('Task', '123', 5, 4);
      
      expect(error.resourceType).toBe('Task');
      expect(error.resourceId).toBe('123');
      expect(error.currentVersion).toBe(5);
      expect(error.expectedVersion).toBe(4);
      expect(error.message).toContain('Version conflict');
    });
  });

  describe('isVersionConflictError', () => {
    it('debería identificar VersionConflictError', () => {
      const error = new VersionConflictError('Task', '123', 5, 4);
      expect(isVersionConflictError(error)).toBe(true);
    });

    it('debería retornar false para otros errores', () => {
      const error = new Error('Other error');
      expect(isVersionConflictError(error)).toBe(false);
    });
  });

  describe('updateWithVersion', () => {
    it('debería retornar success cuando update afecta registros', async () => {
      const result = await updateWithVersion(
        async () => [{ id: '123', version: 2 }],
        'Task',
        '123',
        1
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: '123', version: 2 });
    });

    it('debería retornar error cuando no se actualizó ningún registro', async () => {
      const result = await updateWithVersion(
        async () => [],
        'Task',
        '123',
        1
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(VersionConflictError);
    });
  });
});

