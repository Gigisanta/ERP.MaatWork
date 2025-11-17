/**
 * Tests para api-error
 * 
 * AI_DECISION: Tests unitarios para clase ApiError
 * Justificación: Validación crítica de manejo de errores
 * Impacto: Prevenir errores en manejo de errores de API
 */

import { describe, it, expect } from 'vitest';
import { ApiError, createApiErrorFromResponse } from './api-error';

describe('ApiError', () => {
  it('debería crear error con status y message', () => {
    const error = new ApiError(404, 'Not found');
    expect(error.status).toBe(404);
    expect(error.message).toBe('Not found');
    expect(error.name).toBe('ApiError');
  });

  it('debería usar statusText por defecto cuando no se proporciona', () => {
    const error = new ApiError(404, 'Not found');
    expect(error.statusText).toBe('Not Found');
  });

  it('debería usar statusText personalizado cuando se proporciona', () => {
    const error = new ApiError(404, 'Not found', { statusText: 'Custom Status' });
    expect(error.statusText).toBe('Custom Status');
  });

  it('debería incluir details cuando se proporcionan', () => {
    const error = new ApiError(400, 'Validation error', {
      details: ['Field 1 is required', 'Field 2 is invalid']
    });
    expect(error.details).toEqual(['Field 1 is required', 'Field 2 is invalid']);
  });

  it('debería determinar si es error de autenticación', () => {
    const error = new ApiError(401, 'Unauthorized');
    expect(error.isAuthError).toBe(true);
  });

  it('debería determinar si es error de permisos', () => {
    const error = new ApiError(403, 'Forbidden');
    expect(error.isForbiddenError).toBe(true);
  });

  it('debería determinar si es error de validación', () => {
    const error400 = new ApiError(400, 'Bad Request');
    const error422 = new ApiError(422, 'Unprocessable Entity');
    expect(error400.isValidationError).toBe(true);
    expect(error422.isValidationError).toBe(true);
  });

  it('debería determinar si es error del servidor', () => {
    const error500 = new ApiError(500, 'Internal Server Error');
    const error502 = new ApiError(502, 'Bad Gateway');
    expect(error500.isServerError).toBe(true);
    expect(error502.isServerError).toBe(true);
  });

  it('debería generar mensaje amigable para usuario', () => {
    const authError = new ApiError(401, 'Unauthorized');
    expect(authError.userMessage).toBe('Sesión expirada. Por favor, inicia sesión nuevamente.');

    const forbiddenError = new ApiError(403, 'Forbidden');
    expect(forbiddenError.userMessage).toBe('No tienes permisos para realizar esta acción.');

    const validationError = new ApiError(400, 'Validation error');
    expect(validationError.userMessage).toBe('Validation error');

    const serverError = new ApiError(500, 'Internal Server Error');
    expect(serverError.userMessage).toBe('Error en el servidor. Por favor, intenta nuevamente más tarde.');
  });

  it('debería serializar a JSON correctamente', () => {
    const error = new ApiError(404, 'Not found', {
      details: 'Resource not found',
      timestamp: '2024-01-01T00:00:00Z'
    });
    const json = error.toJSON();
    expect(json).toHaveProperty('name', 'ApiError');
    expect(json).toHaveProperty('message', 'Not found');
    expect(json).toHaveProperty('status', 404);
    expect(json).toHaveProperty('details', 'Resource not found');
  });
});

describe('createApiErrorFromResponse', () => {
  it('debería crear ApiError desde Response con JSON', async () => {
    const mockResponse = {
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({
        error: 'Validation failed',
        details: ['Field 1 is required']
      })
    } as unknown as Response;

    const error = await createApiErrorFromResponse(mockResponse);
    expect(error.status).toBe(400);
    expect(error.message).toBe('Validation failed');
    expect(error.details).toEqual(['Field 1 is required']);
  });

  it('debería crear ApiError desde Response con texto', async () => {
    const mockResponse = {
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => {
        throw new Error('Not JSON');
      },
      text: async () => 'Server error occurred'
    } as unknown as Response;

    const error = await createApiErrorFromResponse(mockResponse);
    expect(error.status).toBe(500);
    expect(error.message).toBe('Server error occurred');
  });

  it('debería usar statusText cuando no hay message en JSON', async () => {
    const mockResponse = {
      status: 404,
      statusText: 'Not Found',
      json: async () => ({})
    } as unknown as Response;

    const error = await createApiErrorFromResponse(mockResponse);
    expect(error.message).toBe('Not Found');
  });
});

