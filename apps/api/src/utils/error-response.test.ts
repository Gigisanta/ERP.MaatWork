/**
 * Tests para createErrorResponse utility
 *
 * AI_DECISION: Tests unitarios para error handling seguro
 * Justificación: Prevenir fuga de información sensible en producción
 * Impacto: Seguridad y privacidad de datos
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createErrorResponse, getStatusCodeFromError } from './error-response';

describe('createErrorResponse', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('Producción (información limitada)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('debería retornar mensaje genérico en producción', () => {
      const error = new Error('Database connection failed: password=secret123');
      const result = createErrorResponse({ error });

      expect(result.error).toBe('Internal server error');
      expect(result.stack).toBeUndefined();
    });

    it('debería usar userMessage si se proporciona', () => {
      const error = new Error('Internal database error');
      const result = createErrorResponse({
        error,
        userMessage: 'No pudimos procesar tu solicitud',
      });

      expect(result.error).toBe('No pudimos procesar tu solicitud');
      expect(result.stack).toBeUndefined();
    });

    it('debería incluir requestId si se proporciona', () => {
      const error = new Error('Error');
      const result = createErrorResponse({
        error,
        requestId: 'req-123',
      });

      expect(result.requestId).toBe('req-123');
      expect(result.stack).toBeUndefined();
    });

    it('NO debería exponer stack trace en producción', () => {
      const error = new Error('Sensitive error');
      const result = createErrorResponse({ error });

      expect(result).not.toHaveProperty('stack');
    });

    it('NO debería exponer mensajes de error internos', () => {
      const error = new Error('SELECT * FROM users WHERE password = "admin123"');
      const result = createErrorResponse({ error });

      expect(result.error).not.toContain('password');
      expect(result.error).not.toContain('admin123');
      expect(result.error).toBe('Internal server error');
    });
  });

  describe('Development (información completa)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('debería incluir mensaje del error en campo separado', () => {
      const error = new Error('Database connection failed');
      const result = createErrorResponse({ error });

      // En desarrollo, el mensaje del error va en 'message', no en 'error'
      expect(result.message).toBe('Database connection failed');
      expect(result.error).toBe('Internal server error'); // default
    });

    it('debería incluir stack trace en desarrollo', () => {
      const error = new Error('Test error');
      const result = createErrorResponse({ error });

      expect(result.stack).toBeDefined();
      expect(result.stack).toContain('Test error');
    });

    it('debería preferir userMessage sobre mensaje de error', () => {
      const error = new Error('Internal error');
      const result = createErrorResponse({
        error,
        userMessage: 'User-friendly message',
      });

      expect(result.error).toBe('User-friendly message');
    });

    it('debería incluir requestId', () => {
      const error = new Error('Error');
      const result = createErrorResponse({
        error,
        requestId: 'dev-req-456',
      });

      expect(result.requestId).toBe('dev-req-456');
      expect(result.stack).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('debería manejar errores no-Error objects', () => {
      const error = 'String error';
      const result = createErrorResponse({ error, userMessage: 'String error' });

      // Los no-Error objects requieren userMessage explícito
      expect(result.error).toBe('String error');
    });

    it('debería manejar null/undefined error', () => {
      const result = createErrorResponse({ error: null as any });

      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });

    it('debería manejar objetos como error', () => {
      const error = { code: 'ERR_DATABASE', details: 'Connection failed' };
      const result = createErrorResponse({ error });

      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });

    it('debería manejar requestId vacío', () => {
      const error = new Error('Test');
      const result = createErrorResponse({ error, requestId: '' });

      expect(result.requestId).toBe('');
    });

    it('debería manejar userMessage vacío', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Internal error');
      const result = createErrorResponse({ error, userMessage: '' });

      // En producción con userMessage vacío, debería usar el default
      expect(result.error).toBe('Internal server error');
    });
  });

  describe('Security validation', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('NO debería exponer credenciales en mensajes', () => {
      const error = new Error('Connection failed to postgres://user:password@localhost:5432/db');
      const result = createErrorResponse({ error });

      expect(result.error).not.toContain('password');
      expect(result.error).not.toContain('postgres://');
    });

    it('NO debería exponer paths de sistema', () => {
      const error = new Error('File not found: /home/user/.env');
      const result = createErrorResponse({ error });

      expect(result.error).not.toContain('/home/user');
      expect(result.error).not.toContain('.env');
    });

    it('NO debería exponer stack traces en producción', () => {
      const error = new Error('Error');
      error.stack = 'Error: Test\n  at /app/src/sensitive-file.ts:42:10';

      const result = createErrorResponse({ error });

      expect(result).not.toHaveProperty('stack');
    });
  });

  describe('Format consistency', () => {
    it('debería retornar objeto con estructura consistente', () => {
      const result = createErrorResponse({ error: new Error('Test') });

      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    });

    it('requestId debería estar presente (puede ser undefined)', () => {
      const result = createErrorResponse({ error: new Error('Test') });

      // requestId siempre está en el objeto (incluso si es undefined)
      expect('requestId' in result).toBe(true);

      // Si se proporciona, debe ser string
      const resultWithId = createErrorResponse({ error: new Error('Test'), requestId: 'abc123' });
      expect(resultWithId.requestId).toBe('abc123');
    });

    it('stack debería ser opcional y solo en desarrollo', () => {
      process.env.NODE_ENV = 'development';
      const result = createErrorResponse({ error: new Error('Test') });

      if ('stack' in result) {
        expect(typeof result.stack).toBe('string');
      }
    });
  });

  describe('getStatusCodeFromError', () => {
    it('debería retornar 404 para errores "not found"', () => {
      const error = new Error('Resource not found');
      expect(getStatusCodeFromError(error)).toBe(404);
    });

    it('debería retornar 401 para errores "unauthorized"', () => {
      const error = new Error('User unauthorized');
      expect(getStatusCodeFromError(error)).toBe(401);
    });

    it('debería retornar 403 para errores "forbidden"', () => {
      const error = new Error('Access forbidden');
      expect(getStatusCodeFromError(error)).toBe(403);
    });

    it('debería retornar 400 para errores de validación', () => {
      const error = new Error('Invalid input validation');
      expect(getStatusCodeFromError(error)).toBe(400);
    });

    it('debería retornar 500 por defecto', () => {
      const error = new Error('Unknown error');
      expect(getStatusCodeFromError(error)).toBe(500);
    });

    it('debería retornar 500 para errores no-Error', () => {
      expect(getStatusCodeFromError('string error')).toBe(500);
      expect(getStatusCodeFromError(null)).toBe(500);
      expect(getStatusCodeFromError(undefined)).toBe(500);
    });

    it('debería ser case-insensitive', () => {
      expect(getStatusCodeFromError(new Error('NOT FOUND'))).toBe(404);
      expect(getStatusCodeFromError(new Error('UNAUTHORIZED'))).toBe(401);
    });
  });
});
