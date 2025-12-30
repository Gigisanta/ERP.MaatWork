'use client';

/**
 * useFormValidation Hook
 *
 * AI_DECISION: Centralized form validation with Zod and debounce support
 * Justificación: Provides consistent real-time validation across forms
 * Impacto: Better UX with immediate feedback, reduced code duplication
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { z, ZodSchema, ZodError } from 'zod';

export interface FieldError {
  message: string;
  code?: string;
}

type FormErrors<T> = Partial<Record<keyof T, FieldError>>;

interface UseFormValidationOptions<T extends Record<string, unknown>> {
  /** Zod schema for validation */
  schema: ZodSchema<T>;
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Initial form values */
  initialValues?: Partial<T>;
  /** Whether to validate on mount */
  validateOnMount?: boolean;
  /** Callback when validation state changes */
  onValidationChange?: (isValid: boolean, errors: FormErrors<T>) => void;
}

interface UseFormValidationReturn<T extends Record<string, unknown>> {
  /** Current form errors */
  errors: FormErrors<T>;
  /** Whether the form is currently valid */
  isValid: boolean;
  /** Whether any field has been touched */
  isDirty: boolean;
  /** Set of touched field names */
  touchedFields: Set<keyof T>;
  /** Validate a single field */
  validateField: (field: keyof T, value?: unknown) => FieldError | null;
  /** Validate all fields at once */
  validateAll: (values: Partial<T>) => boolean;
  /** Clear all errors */
  clearErrors: () => void;
  /** Clear error for a specific field */
  clearFieldError: (field: keyof T) => void;
  /** Set error for a specific field manually */
  setFieldError: (field: keyof T, error: FieldError) => void;
  /** Set multiple errors at once (e.g., from backend) */
  setErrors: (errors: FormErrors<T>) => void;
  /** Mark a field as touched */
  touchField: (field: keyof T) => void;
  /** Reset validation state */
  reset: () => void;
  /** Get field validation state */
  getFieldState: (field: keyof T) => {
    error: FieldError | null;
    isTouched: boolean;
    isValid: boolean;
  };
}

/**
 * Hook for form validation with Zod schemas and debounce support
 *
 * @example
 * ```tsx
 * const contactSchema = z.object({
 *   firstName: z.string().min(1, 'El nombre es requerido'),
 *   lastName: z.string().min(1, 'El apellido es requerido'),
 *   email: z.string().email('Email inválido').optional(),
 * });
 *
 * function ContactForm() {
 *   const {
 *     errors,
 *     isValid,
 *     validateField,
 *     validateAll,
 *     touchField,
 *     getFieldState
 *   } = useFormValidation({
 *     schema: contactSchema,
 *     debounceMs: 300
 *   });
 *
 *   const handleChange = (field: string, value: string) => {
 *     setFormData(prev => ({ ...prev, [field]: value }));
 *     validateField(field, value);
 *   };
 *
 *   return (
 *     <Input
 *       error={errors.firstName?.message}
 *       onChange={(e) => handleChange('firstName', e.target.value)}
 *       onBlur={() => touchField('firstName')}
 *     />
 *   );
 * }
 * ```
 */
export function useFormValidation<T extends Record<string, unknown>>({
  schema,
  debounceMs = 300,
  initialValues,
  validateOnMount = false,
  onValidationChange,
}: UseFormValidationOptions<T>): UseFormValidationReturn<T> {
  const [errors, setErrorsState] = useState<FormErrors<T>>({});
  const [touchedFields, setTouchedFields] = useState<Set<keyof T>>(new Set());
  const [currentValues, setCurrentValues] = useState<Partial<T>>(initialValues ?? {});

  // Refs for debounce management
  const debounceTimersRef = useRef<Map<keyof T, NodeJS.Timeout>>(new Map());
  const pendingValidationsRef = useRef<Set<keyof T>>(new Set());

  // Calculate isValid based on current errors
  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);
  const isDirty = useMemo(() => touchedFields.size > 0, [touchedFields]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      debounceTimersRef.current.forEach((timer) => clearTimeout(timer));
      debounceTimersRef.current.clear();
    };
  }, []);

  // Notify parent of validation changes
  useEffect(() => {
    onValidationChange?.(isValid, errors);
  }, [isValid, errors, onValidationChange]);

  // Validate on mount if requested
  useEffect(() => {
    if (validateOnMount && initialValues) {
      validateAllImmediate(initialValues);
    }
  }, [validateOnMount]);

  /**
   * Validate a single field using Zod partial validation
   */
  const validateFieldImmediate = useCallback(
    (field: keyof T, value?: unknown): FieldError | null => {
      try {
        // Get the shape of the schema to validate just the field
        // Use unknown first to satisfy TypeScript's strict type checking
        const fieldSchema = (schema as unknown as z.ZodObject<z.ZodRawShape>).shape[
          field as string
        ];

        if (!fieldSchema) {
          // Field not in schema, skip validation
          return null;
        }

        // Parse the field value
        fieldSchema.parse(value);

        // Validation passed, remove error
        setErrorsState((prev) => {
          const { [field]: _, ...rest } = prev;
          return rest as FormErrors<T>;
        });

        return null;
      } catch (error) {
        if (error instanceof ZodError) {
          const fieldError: FieldError = {
            message: error.errors[0]?.message || 'Campo inválido',
            code: error.errors[0]?.code,
          };

          setErrorsState((prev) => ({
            ...prev,
            [field]: fieldError,
          }));

          return fieldError;
        }

        return null;
      }
    },
    [schema]
  );

  /**
   * Validate a single field with debounce
   */
  const validateField = useCallback(
    (field: keyof T, value?: unknown): FieldError | null => {
      // Update current values
      if (value !== undefined) {
        setCurrentValues((prev) => ({ ...prev, [field]: value }));
      }

      // Clear existing timer for this field
      const existingTimer = debounceTimersRef.current.get(field);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Mark as pending validation
      pendingValidationsRef.current.add(field);

      // If no debounce, validate immediately
      if (debounceMs === 0) {
        const result = validateFieldImmediate(field, value ?? currentValues[field]);
        pendingValidationsRef.current.delete(field);
        return result;
      }

      // Set new debounce timer
      const timer = setTimeout(() => {
        validateFieldImmediate(field, value ?? currentValues[field]);
        pendingValidationsRef.current.delete(field);
        debounceTimersRef.current.delete(field);
      }, debounceMs);

      debounceTimersRef.current.set(field, timer);

      // Return current error (may be stale until debounce completes)
      return errors[field] ?? null;
    },
    [debounceMs, validateFieldImmediate, currentValues, errors]
  );

  /**
   * Validate all fields immediately (no debounce)
   */
  const validateAllImmediate = useCallback(
    (values: Partial<T>): boolean => {
      try {
        schema.parse(values);
        setErrorsState({});
        return true;
      } catch (error) {
        if (error instanceof ZodError) {
          const newErrors: FormErrors<T> = {};

          error.errors.forEach((err) => {
            const field = err.path[0] as keyof T;
            if (field && !newErrors[field]) {
              newErrors[field] = {
                message: err.message,
                code: err.code,
              };
            }
          });

          setErrorsState(newErrors);
          return false;
        }
        return false;
      }
    },
    [schema]
  );

  /**
   * Validate all fields at once
   */
  const validateAll = useCallback(
    (values: Partial<T>): boolean => {
      // Clear all pending debounce timers
      debounceTimersRef.current.forEach((timer) => clearTimeout(timer));
      debounceTimersRef.current.clear();
      pendingValidationsRef.current.clear();

      setCurrentValues(values);
      return validateAllImmediate(values);
    },
    [validateAllImmediate]
  );

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrorsState({});
  }, []);

  /**
   * Clear error for a specific field
   */
  const clearFieldError = useCallback((field: keyof T) => {
    setErrorsState((prev) => {
      const { [field]: _, ...rest } = prev;
      return rest as FormErrors<T>;
    });
  }, []);

  /**
   * Set error for a specific field manually
   */
  const setFieldError = useCallback((field: keyof T, error: FieldError) => {
    setErrorsState((prev) => ({
      ...prev,
      [field]: error,
    }));
  }, []);

  /**
   * Set multiple errors at once
   */
  const setErrors = useCallback((newErrors: FormErrors<T>) => {
    setErrorsState(newErrors);
  }, []);

  /**
   * Mark a field as touched
   */
  const touchField = useCallback((field: keyof T) => {
    setTouchedFields((prev) => new Set(prev).add(field));
  }, []);

  /**
   * Reset validation state
   */
  const reset = useCallback(() => {
    // Clear all debounce timers
    debounceTimersRef.current.forEach((timer) => clearTimeout(timer));
    debounceTimersRef.current.clear();
    pendingValidationsRef.current.clear();

    setErrorsState({});
    setTouchedFields(new Set());
    setCurrentValues(initialValues ?? {});
  }, [initialValues]);

  /**
   * Get field validation state
   */
  const getFieldState = useCallback(
    (field: keyof T) => {
      const error = errors[field] ?? null;
      const isTouched = touchedFields.has(field);

      return {
        error,
        isTouched,
        isValid: !error,
      };
    },
    [errors, touchedFields]
  );

  return {
    errors,
    isValid,
    isDirty,
    touchedFields,
    validateField,
    validateAll,
    clearErrors,
    clearFieldError,
    setFieldError,
    setErrors,
    touchField,
    reset,
    getFieldState,
  };
}

/**
 * Helper function to create a field change handler
 *
 * @example
 * ```tsx
 * const handleChange = createFieldChangeHandler(
 *   setFormData,
 *   validateField,
 *   touchField
 * );
 *
 * <Input
 *   onChange={(e) => handleChange('firstName', e.target.value)}
 * />
 * ```
 */
export function createFieldChangeHandler<T extends Record<string, unknown>>(
  setFormData: React.Dispatch<React.SetStateAction<T>>,
  validateField: (field: keyof T, value?: unknown) => FieldError | null,
  touchField?: (field: keyof T) => void
) {
  return (field: keyof T, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    validateField(field, value);
    touchField?.(field);
  };
}
