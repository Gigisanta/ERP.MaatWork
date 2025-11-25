import { describe, it, expect } from 'vitest';
import { VersionConflictError, isVersionConflictError, updateWithVersion, createVersionConflictResponse } from './optimistic-locking';

describe('optimistic-locking', () => {
  describe('VersionConflictError', () => {
    it('debería crear error con información correcta', () => {
      const error = new VersionConflictError('Task', '123', 5, 4);
      
      expect(error.resourceType).toBe('Task');
      expect(error.resourceId).toBe('123');
      expect(error.currentVersion).toBe(5);
      expect(error.expectedVersion).toBe(4);
      expect(error.message).toContain('Version conflict');
      expect(error.name).toBe('VersionConflictError');
    });

    it('debería incluir información del recurso en el mensaje', () => {
      const error = new VersionConflictError('Contact', 'contact-456', 10, 9);
      expect(error.message).toContain('Contact');
      expect(error.message).toContain('contact-456');
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

    it('debería retornar false para null', () => {
      expect(isVersionConflictError(null)).toBe(false);
    });

    it('debería retornar false para undefined', () => {
      expect(isVersionConflictError(undefined)).toBe(false);
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
      expect(result.error).toBeUndefined();
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
      expect(result.error?.resourceType).toBe('Task');
      expect(result.error?.resourceId).toBe('123');
      expect(result.data).toBeUndefined();
    });

    it('debería re-throw VersionConflictError si ocurre en updateFn', async () => {
      const versionError = new VersionConflictError('Task', '123', 5, 4);
      
      await expect(
        updateWithVersion(
          async () => {
            throw versionError;
          },
          'Task',
          '123',
          4
        )
      ).rejects.toThrow(VersionConflictError);
    });

    it('debería re-throw otros errores', async () => {
      await expect(
        updateWithVersion(
          async () => {
            throw new Error('Database error');
          },
          'Task',
          '123',
          4
        )
      ).rejects.toThrow('Database error');
    });

    it('debería manejar múltiples registros actualizados', async () => {
      const result = await updateWithVersion(
        async () => [
          { id: '123', version: 2 },
          { id: '124', version: 2 },
        ],
        'Task',
        '123',
        1
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: '123', version: 2 });
    });
  });

  describe('createVersionConflictResponse', () => {
    it('debería crear respuesta HTTP 409 estándar', () => {
      const error = new VersionConflictError('Contact', 'contact-123', 5, 4);
      const response = createVersionConflictResponse(error);

      expect(response).toEqual({
        error: 'Version conflict',
        message: 'El recurso fue modificado por otro usuario. Por favor recarga la página.',
        resourceType: 'Contact',
        resourceId: 'contact-123',
        expectedVersion: 4,
        currentVersion: 5,
      });
    });

    it('debería incluir todos los campos del error', () => {
      const error = new VersionConflictError('Task', 'task-456', 10, 9);
      const response = createVersionConflictResponse(error);

      expect(response.resourceType).toBe('Task');
      expect(response.resourceId).toBe('task-456');
      expect(response.expectedVersion).toBe(9);
      expect(response.currentVersion).toBe(10);
    });
  });
});

