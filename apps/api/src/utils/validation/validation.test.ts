/**
 * Tests para validation utilities
 *
 * AI_DECISION: Tests unitarios para middleware de validación Zod
 * Justificación: Validación crítica de inputs y seguridad
 * Impacto: Prevenir datos inválidos y errores de validación
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, validateField, safeParseRequest } from './validation';

describe('validate middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      params: {},
      query: {},
      body: {},
      log: {
        warn: vi.fn(),
        error: vi.fn(),
      },
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  describe('Params validation', () => {
    it('debería validar params correctamente', () => {
      const paramsSchema = z.object({
        id: z.string().uuid(),
      });

      mockReq.params = { id: '550e8400-e29b-41d4-a716-446655440000' };
      const middleware = validate({ params: paramsSchema });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('debería rechazar params inválidos', () => {
      const paramsSchema = z.object({
        id: z.string().uuid(),
      });

      mockReq.params = { id: 'invalid-uuid' };
      const middleware = validate({ params: paramsSchema });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation error',
          details: expect.any(Array),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería incluir requestId en error response si existe', () => {
      const paramsSchema = z.object({
        id: z.string().uuid(),
      });

      mockReq.params = { id: 'invalid' };
      (mockReq as any).requestId = 'req-123';
      const middleware = validate({ params: paramsSchema });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req-123',
        })
      );
    });
  });

  describe('Query validation', () => {
    it('debería validar query correctamente', () => {
      const querySchema = z.object({
        page: z.string().transform(Number),
        limit: z.string().transform(Number),
      });

      mockReq.query = { page: '1', limit: '10' };
      const middleware = validate({ query: querySchema });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('debería rechazar query inválido', () => {
      const querySchema = z.object({
        page: z
          .string()
          .regex(/^\d+$/, 'Page must be a number')
          .transform(Number)
          .pipe(z.number().int().min(1)),
      });

      mockReq.query = { page: 'not-a-number' };
      const middleware = validate({ query: querySchema });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Body validation', () => {
    it('debería validar body correctamente', () => {
      const bodySchema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });

      mockReq.body = { name: 'Test User', email: 'test@example.com' };
      const middleware = validate({ body: bodySchema });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('debería rechazar body inválido', () => {
      const bodySchema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });

      mockReq.body = { name: '', email: 'invalid-email' };
      const middleware = validate({ body: bodySchema });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation error',
          details: expect.arrayContaining([
            expect.objectContaining({
              path: expect.any(String),
              message: expect.any(String),
              code: expect.any(String),
            }),
          ]),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Combined validation', () => {
    it('debería validar params, query y body juntos', () => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const querySchema = z.object({ page: z.string() });
      const bodySchema = z.object({ name: z.string() });

      mockReq.params = { id: '550e8400-e29b-41d4-a716-446655440000' };
      mockReq.query = { page: '1' };
      mockReq.body = { name: 'Test' };
      const middleware = validate({
        params: paramsSchema,
        query: querySchema,
        body: bodySchema,
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('debería fallar si cualquiera de los validadores falla', () => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const querySchema = z.object({ page: z.string() });
      const bodySchema = z.object({ name: z.string() });

      mockReq.params = { id: 'invalid-uuid' };
      mockReq.query = { page: '1' };
      mockReq.body = { name: 'Test' };
      const middleware = validate({
        params: paramsSchema,
        query: querySchema,
        body: bodySchema,
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Error logging', () => {
    it('debería loguear error de validación', () => {
      const bodySchema = z.object({ name: z.string().min(1) });

      mockReq.body = { name: '' };
      const middleware = validate({ body: bodySchema });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.log?.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          validationError: expect.any(Array),
        }),
        'Validation failed'
      );
    });

    it('debería manejar errores inesperados', () => {
      const bodySchema = z.object({ name: z.string() });

      // Mock para que parse lance error inesperado
      vi.spyOn(bodySchema, 'parse').mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      mockReq.body = { name: 'Test' };
      const middleware = validate({ body: bodySchema });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal server error',
        })
      );
      expect(mockReq.log?.error).toHaveBeenCalled();
    });
  });

  describe('Optional validation', () => {
    it('debería funcionar sin params schema', () => {
      const bodySchema = z.object({ name: z.string() });

      mockReq.body = { name: 'Test' };
      const middleware = validate({ body: bodySchema });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('debería funcionar sin query schema', () => {
      const bodySchema = z.object({ name: z.string() });

      mockReq.body = { name: 'Test' };
      const middleware = validate({ body: bodySchema });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('debería funcionar sin body schema', () => {
      const paramsSchema = z.object({ id: z.string().uuid() });

      mockReq.params = { id: '550e8400-e29b-41d4-a716-446655440000' };
      const middleware = validate({ params: paramsSchema });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});

describe('validateField', () => {
  it('debería validar campo válido', () => {
    const uuidSchema = z.string().uuid();
    const value = '550e8400-e29b-41d4-a716-446655440000';

    const result = validateField('id', value, uuidSchema);

    expect(result).toBe(value);
  });

  it('debería lanzar error con formato correcto para campo inválido', () => {
    const uuidSchema = z.string().uuid();
    const value = 'invalid-uuid';

    expect(() => {
      validateField('id', value, uuidSchema);
    }).toThrow(/^id:/);
  });

  it('debería incluir mensaje de error de Zod', () => {
    const emailSchema = z.string().email();
    const value = 'not-an-email';

    expect(() => {
      validateField('email', value, emailSchema);
    }).toThrow(/Invalid email/);
  });

  it('debería manejar errores no-Zod', () => {
    const schema = z.string();

    // Crear un error no-Zod
    vi.spyOn(schema, 'parse').mockImplementation(() => {
      throw new Error('Non-Zod error');
    });

    expect(() => {
      validateField('field', 'value', schema);
    }).toThrow('Non-Zod error');
  });
});

describe('safeParseRequest', () => {
  it('debería retornar success true con datos válidos', () => {
    const schema = z.object({ name: z.string() });
    const data = { name: 'Test' };

    const result = safeParseRequest(schema, data);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: 'Test' });
    }
  });

  it('debería retornar success false con datos inválidos', () => {
    const schema = z.object({ name: z.string().min(5) });
    const data = { name: 'Hi' };

    const result = safeParseRequest(schema, data);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(z.ZodError);
    }
  });

  it('debería manejar diferentes tipos de datos', () => {
    const stringSchema = z.string();
    const numberSchema = z.number();
    const objectSchema = z.object({ id: z.string() });

    expect(safeParseRequest(stringSchema, 'test').success).toBe(true);
    expect(safeParseRequest(numberSchema, 123).success).toBe(true);
    expect(safeParseRequest(objectSchema, { id: '123' }).success).toBe(true);
    expect(safeParseRequest(stringSchema, 123).success).toBe(false);
    expect(safeParseRequest(numberSchema, '123').success).toBe(false);
    expect(safeParseRequest(objectSchema, { id: 123 }).success).toBe(false);
  });
});
