import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { z } from 'zod';
import { useFormValidation, createFieldChangeHandler } from './useFormValidation';

// Test schema
const testSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  age: z.number().min(18, 'Debe ser mayor de 18').optional(),
});

type TestFormData = z.infer<typeof testSchema>;

describe('useFormValidation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should initialize with empty errors', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: testSchema,
        })
      );

      expect(result.current.errors).toEqual({});
      expect(result.current.isValid).toBe(true);
      expect(result.current.isDirty).toBe(false);
    });

    it('should initialize with touched fields empty', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: testSchema,
        })
      );

      expect(result.current.touchedFields.size).toBe(0);
    });
  });

  describe('Field Validation', () => {
    it('should validate a field and return error for invalid value', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: testSchema,
          debounceMs: 0, // Immediate validation for testing
        })
      );

      act(() => {
        result.current.validateField('firstName', '');
      });

      expect(result.current.errors.firstName?.message).toBe('El nombre es requerido');
      expect(result.current.isValid).toBe(false);
    });

    it('should clear error when field becomes valid', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: testSchema,
          debounceMs: 0,
        })
      );

      // First, make it invalid
      act(() => {
        result.current.validateField('firstName', '');
      });
      expect(result.current.errors.firstName).toBeDefined();

      // Then, make it valid
      act(() => {
        result.current.validateField('firstName', 'John');
      });
      expect(result.current.errors.firstName).toBeUndefined();
      expect(result.current.isValid).toBe(true);
    });

    it('should validate email format', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: testSchema,
          debounceMs: 0,
        })
      );

      act(() => {
        result.current.validateField('email', 'invalid-email');
      });

      expect(result.current.errors.email?.message).toBe('Email inválido');
    });

    it('should accept valid email', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: testSchema,
          debounceMs: 0,
        })
      );

      act(() => {
        result.current.validateField('email', 'test@example.com');
      });

      expect(result.current.errors.email).toBeUndefined();
    });
  });

  describe('Debounced Validation', () => {
    it('should debounce field validation', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: testSchema,
          debounceMs: 300,
        })
      );

      act(() => {
        result.current.validateField('firstName', '');
      });

      // Error should not be set immediately
      expect(result.current.errors.firstName).toBeUndefined();

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Now error should be set
      expect(result.current.errors.firstName?.message).toBe('El nombre es requerido');
    });

    it('should cancel previous debounce when field changes', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: testSchema,
          debounceMs: 300,
        })
      );

      // Type invalid value
      act(() => {
        result.current.validateField('firstName', '');
      });

      // Before debounce completes, type valid value
      act(() => {
        vi.advanceTimersByTime(100);
        result.current.validateField('firstName', 'John');
      });

      // Complete the debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should be valid (last value was valid)
      expect(result.current.errors.firstName).toBeUndefined();
    });
  });

  describe('Validate All', () => {
    it('should validate all fields at once', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: testSchema,
          debounceMs: 0,
        })
      );

      const isValid = act(() =>
        result.current.validateAll({
          firstName: '',
          lastName: '',
          email: 'invalid',
        })
      );

      expect(isValid).toBe(false);
      expect(result.current.errors.firstName).toBeDefined();
      expect(result.current.errors.lastName).toBeDefined();
      expect(result.current.errors.email).toBeDefined();
    });

    it('should return true when all fields are valid', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: testSchema,
          debounceMs: 0,
        })
      );

      const isValid = act(() =>
        result.current.validateAll({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        })
      );

      expect(isValid).toBe(true);
      expect(result.current.errors).toEqual({});
    });
  });

  describe('Touch Fields', () => {
    it('should track touched fields', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: testSchema,
        })
      );

      act(() => {
        result.current.touchField('firstName');
      });

      expect(result.current.touchedFields.has('firstName')).toBe(true);
      expect(result.current.isDirty).toBe(true);
    });

    it('should return field state correctly', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: testSchema,
          debounceMs: 0,
        })
      );

      // Initial state
      let fieldState = result.current.getFieldState('firstName');
      expect(fieldState.error).toBeNull();
      expect(fieldState.isTouched).toBe(false);
      expect(fieldState.isValid).toBe(true);

      // Touch and validate with error
      act(() => {
        result.current.touchField('firstName');
        result.current.validateField('firstName', '');
      });

      fieldState = result.current.getFieldState('firstName');
      expect(fieldState.error?.message).toBe('El nombre es requerido');
      expect(fieldState.isTouched).toBe(true);
      expect(fieldState.isValid).toBe(false);
    });
  });

  describe('Manual Error Management', () => {
    it('should set error manually', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: testSchema,
        })
      );

      act(() => {
        result.current.setFieldError('firstName', { message: 'Custom error' });
      });

      expect(result.current.errors.firstName?.message).toBe('Custom error');
    });

    it('should set multiple errors at once', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: testSchema,
        })
      );

      act(() => {
        result.current.setErrors({
          firstName: { message: 'Error 1' },
          lastName: { message: 'Error 2' },
        });
      });

      expect(result.current.errors.firstName?.message).toBe('Error 1');
      expect(result.current.errors.lastName?.message).toBe('Error 2');
    });

    it('should clear field error', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: testSchema,
          debounceMs: 0,
        })
      );

      act(() => {
        result.current.validateField('firstName', '');
      });
      expect(result.current.errors.firstName).toBeDefined();

      act(() => {
        result.current.clearFieldError('firstName');
      });
      expect(result.current.errors.firstName).toBeUndefined();
    });

    it('should clear all errors', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: testSchema,
          debounceMs: 0,
        })
      );

      act(() => {
        result.current.validateAll({
          firstName: '',
          lastName: '',
        });
      });
      expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);

      act(() => {
        result.current.clearErrors();
      });
      expect(result.current.errors).toEqual({});
    });
  });

  describe('Reset', () => {
    it('should reset all validation state', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: testSchema,
          debounceMs: 0,
        })
      );

      // Create some state
      act(() => {
        result.current.touchField('firstName');
        result.current.validateField('firstName', '');
      });

      expect(result.current.isDirty).toBe(true);
      expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.errors).toEqual({});
      expect(result.current.touchedFields.size).toBe(0);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.isValid).toBe(true);
    });
  });

  describe('Validation Callback', () => {
    it('should call onValidationChange when validation state changes', () => {
      const onValidationChange = vi.fn();

      const { result } = renderHook(() =>
        useFormValidation({
          schema: testSchema,
          debounceMs: 0,
          onValidationChange,
        })
      );

      act(() => {
        result.current.validateField('firstName', '');
      });

      expect(onValidationChange).toHaveBeenCalledWith(
        false,
        expect.objectContaining({
          firstName: expect.objectContaining({ message: 'El nombre es requerido' }),
        })
      );
    });
  });
});

describe('createFieldChangeHandler', () => {
  it('should create a handler that updates form and validates', () => {
    const setFormData = vi.fn();
    const validateField = vi.fn();
    const touchField = vi.fn();

    const handler = createFieldChangeHandler(setFormData, validateField, touchField);

    handler('firstName', 'John');

    expect(setFormData).toHaveBeenCalled();
    expect(validateField).toHaveBeenCalledWith('firstName', 'John');
    expect(touchField).toHaveBeenCalledWith('firstName');
  });

  it('should work without touchField', () => {
    const setFormData = vi.fn();
    const validateField = vi.fn();

    const handler = createFieldChangeHandler(setFormData, validateField);

    handler('firstName', 'John');

    expect(setFormData).toHaveBeenCalled();
    expect(validateField).toHaveBeenCalledWith('firstName', 'John');
  });
});
