import { describe, it, expect, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import {
  mapApiErrorToFields,
  getErrorMessage,
  isValidationError,
  isAuthError,
  isServerError,
  createFormErrorHandler,
} from './error-mapper';

describe('mapApiErrorToFields', () => {
  describe('ApiError handling', () => {
    it('should map ApiError with details to field errors', () => {
      const error = new ApiError('Validation failed', 400, {
        details: [
          { path: 'firstName', message: 'El nombre es requerido', code: 'required' },
          { path: 'email', message: 'Email inválido', code: 'invalid_email' },
        ],
      });

      const result = mapApiErrorToFields(error);

      expect(result.firstName).toEqual({
        message: 'El nombre es requerido',
        code: 'required',
      });
      expect(result.email).toEqual({
        message: 'Email inválido',
        code: 'invalid_email',
      });
    });

    it('should use field mappings when provided', () => {
      const error = new ApiError('Validation failed', 400, {
        details: [
          { path: 'first_name', message: 'El nombre es requerido' },
        ],
      });

      const result = mapApiErrorToFields(error, {
        fieldMappings: { first_name: 'firstName' },
      });

      expect(result.firstName).toBeDefined();
      expect(result.first_name).toBeUndefined();
    });

    it('should include general error when no details are available', () => {
      const error = new ApiError('Something went wrong', 500);

      const result = mapApiErrorToFields(error);

      expect(result._general).toEqual({
        message: 'Something went wrong',
      });
    });
  });

  describe('Plain Error handling', () => {
    it('should handle plain Error with JSON message', () => {
      const errorDetails = {
        details: [
          { path: 'firstName', message: 'Required' },
        ],
      };
      const error = new Error(JSON.stringify(errorDetails));

      const result = mapApiErrorToFields(error);

      expect(result.firstName).toEqual({
        message: 'Required',
        code: undefined,
      });
    });

    it('should handle plain Error with non-JSON message', () => {
      const error = new Error('Something went wrong');

      const result = mapApiErrorToFields(error);

      expect(result._general).toEqual({
        message: 'Something went wrong',
      });
    });
  });

  describe('Object error handling', () => {
    it('should handle error object with details', () => {
      const error = {
        error: 'Validation failed',
        details: [
          { path: 'email', message: 'Invalid email format' },
        ],
      };

      const result = mapApiErrorToFields(error);

      expect(result.email).toEqual({
        message: 'Invalid email format',
        code: undefined,
      });
    });

    it('should handle error object with message', () => {
      const error = {
        error: 'Error occurred',
        message: 'Custom message',
      };

      const result = mapApiErrorToFields(error);

      expect(result._general).toEqual({
        message: 'Custom message',
      });
    });
  });

  describe('Options', () => {
    it('should use default message when none provided', () => {
      const error = new ApiError('', 400, {
        details: [
          { path: 'field', message: '' },
        ],
      });

      const result = mapApiErrorToFields(error, {
        defaultMessage: 'Campo inválido',
      });

      expect(result.field?.message).toBe('Campo inválido');
    });

    it('should exclude general errors when includeGeneralErrors is false', () => {
      const error = new ApiError('General error', 500);

      const result = mapApiErrorToFields(error, {
        includeGeneralErrors: false,
      });

      expect(result._general).toBeUndefined();
    });
  });
});

describe('getErrorMessage', () => {
  it('should extract message from ApiError', () => {
    const error = new ApiError('API error message', 400);
    
    const message = getErrorMessage(error);
    
    expect(message).toContain('error');
  });

  it('should extract message from plain Error', () => {
    const error = new Error('Plain error message');
    
    const message = getErrorMessage(error);
    
    expect(message).toBe('Plain error message');
  });

  it('should extract message from object', () => {
    const error = { message: 'Object error message' };
    
    const message = getErrorMessage(error);
    
    expect(message).toBe('Object error message');
  });

  it('should extract error property from object', () => {
    const error = { error: 'Error property message' };
    
    const message = getErrorMessage(error);
    
    expect(message).toBe('Error property message');
  });

  it('should return string error directly', () => {
    const error = 'String error';
    
    const message = getErrorMessage(error);
    
    expect(message).toBe('String error');
  });

  it('should return default message for unknown types', () => {
    const message = getErrorMessage(null, 'Default message');
    
    expect(message).toBe('Default message');
  });
});

describe('isValidationError', () => {
  it('should return true for ApiError with 400 status', () => {
    const error = new ApiError('Validation error', 400);
    
    expect(isValidationError(error)).toBe(true);
  });

  it('should return true for object with status 400', () => {
    const error = { status: 400 };
    
    expect(isValidationError(error)).toBe(true);
  });

  it('should return false for non-400 status', () => {
    const error = new ApiError('Server error', 500);
    
    expect(isValidationError(error)).toBe(false);
  });
});

describe('isAuthError', () => {
  it('should return true for ApiError with 401 status', () => {
    const error = new ApiError('Unauthorized', 401);
    
    expect(isAuthError(error)).toBe(true);
  });

  it('should return true for object with status 401', () => {
    const error = { status: 401 };
    
    expect(isAuthError(error)).toBe(true);
  });

  it('should return false for non-401 status', () => {
    const error = new ApiError('Forbidden', 403);
    
    expect(isAuthError(error)).toBe(false);
  });
});

describe('isServerError', () => {
  it('should return true for ApiError with 500 status', () => {
    const error = new ApiError('Server error', 500);
    
    expect(isServerError(error)).toBe(true);
  });

  it('should return true for object with 5xx status', () => {
    const error = { status: 503 };
    
    expect(isServerError(error)).toBe(true);
  });

  it('should return false for non-5xx status', () => {
    const error = new ApiError('Not found', 404);
    
    expect(isServerError(error)).toBe(false);
  });
});

describe('createFormErrorHandler', () => {
  it('should set field errors correctly', () => {
    const setErrors = vi.fn();
    const setGeneralError = vi.fn();
    
    const handler = createFormErrorHandler({
      setErrors,
      setGeneralError,
    });

    const error = new ApiError('Validation failed', 400, {
      details: [
        { path: 'firstName', message: 'Required' },
      ],
    });

    handler(error);

    expect(setErrors).toHaveBeenCalledWith({
      firstName: { message: 'Required', code: undefined },
    });
    expect(setGeneralError).toHaveBeenCalledWith(null);
  });

  it('should set general error when no field errors', () => {
    const setErrors = vi.fn();
    const setGeneralError = vi.fn();
    
    const handler = createFormErrorHandler({
      setErrors,
      setGeneralError,
    });

    const error = new Error('Something went wrong');

    handler(error);

    expect(setErrors).toHaveBeenCalledWith({});
    expect(setGeneralError).toHaveBeenCalledWith('Something went wrong');
  });

  it('should use field mappings', () => {
    const setErrors = vi.fn();
    
    const handler = createFormErrorHandler({
      setErrors,
      fieldMappings: { first_name: 'firstName' },
    });

    const error = new ApiError('Validation failed', 400, {
      details: [
        { path: 'first_name', message: 'Required' },
      ],
    });

    handler(error);

    expect(setErrors).toHaveBeenCalledWith({
      firstName: { message: 'Required', code: undefined },
    });
  });
});
