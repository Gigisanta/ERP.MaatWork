/**
 * Error Mapper Utility
 *
 * AI_DECISION: Centralizar mapeo de errores de API a campos de formulario
 * Justificación: Proporciona experiencia de usuario consistente al mostrar errores
 * Impacto: Mejor UX al identificar exactamente qué campos tienen problemas
 */

import { ApiError } from '@/lib/api-error';
import type { FieldError } from '@/lib/hooks/useFormValidation';

/**
 * Error detail structure from backend (flexible to handle various formats)
 */
export interface BackendErrorDetail {
  path?: string;
  field?: string;
  message?: string;
  code?: string;
}

/**
 * Structured error response from API
 */
export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: string | string[] | BackendErrorDetail[];
  requestId?: string;
}

/**
 * Mapped form errors
 */
export type MappedFormErrors<T extends string = string> = Partial<Record<T, FieldError>>;

/**
 * Options for error mapping
 */
export interface ErrorMapperOptions {
  /** Custom field name mappings (backend field -> form field) */
  fieldMappings?: Record<string, string>;
  /** Default error message when no specific message is available */
  defaultMessage?: string;
  /** Whether to include unmapped errors in a special '_general' field */
  includeGeneralErrors?: boolean;
}

/**
 * Type guard to check if detail is a BackendErrorDetail object
 */
function isBackendErrorDetail(detail: unknown): detail is BackendErrorDetail {
  return typeof detail === 'object' && detail !== null && !Array.isArray(detail);
}

/**
 * Safely extract field path from a detail object
 */
function getFieldPath(detail: BackendErrorDetail): string {
  return String(detail.path ?? detail.field ?? '');
}

/**
 * Safely extract message from a detail object
 */
function getDetailMessage(detail: BackendErrorDetail, defaultMsg: string): string {
  return String(detail.message ?? defaultMsg);
}

/**
 * Safely extract code from a detail object
 */
function getDetailCode(detail: BackendErrorDetail): string | undefined {
  return detail.code !== undefined ? String(detail.code) : undefined;
}

/**
 * Maps API error responses to form field errors
 *
 * @param error - The error to map (ApiError, Error, or unknown)
 * @param options - Mapping options
 * @returns Object with field names as keys and FieldError objects as values
 *
 * @example
 * ```tsx
 * try {
 *   await createContact(data);
 * } catch (error) {
 *   const fieldErrors = mapApiErrorToFields(error, {
 *     fieldMappings: {
 *       'firstName': 'firstName',
 *       'lastName': 'lastName',
 *       'email': 'email'
 *     }
 *   });
 *
 *   // fieldErrors = { firstName: { message: 'El nombre es requerido' } }
 *   setErrors(fieldErrors);
 * }
 * ```
 */
export function mapApiErrorToFields<T extends string = string>(
  error: unknown,
  options: ErrorMapperOptions = {}
): MappedFormErrors<T> {
  const {
    fieldMappings = {},
    defaultMessage = 'Error de validación',
    includeGeneralErrors = true,
  } = options;

  const errors: MappedFormErrors<T> = {};
  const generalErrors: string[] = [];

  /**
   * Process an array of details (handles both BackendErrorDetail[] and string[])
   */
  const processDetails = (details: unknown[]): void => {
    for (const detail of details) {
      // Handle string details
      if (typeof detail === 'string') {
        if (includeGeneralErrors) {
          generalErrors.push(detail);
        }
        continue;
      }

      // Handle object details
      if (isBackendErrorDetail(detail)) {
        const fieldPath = getFieldPath(detail);
        const fieldName = fieldMappings[fieldPath] || fieldPath;
        const detailMsg = getDetailMessage(detail, defaultMessage);
        const detailCode = getDetailCode(detail);

        if (fieldName) {
          const fieldError: FieldError = { message: detailMsg };
          if (detailCode !== undefined) {
            fieldError.code = detailCode;
          }
          errors[fieldName as T] = fieldError;
        } else if (includeGeneralErrors) {
          generalErrors.push(detailMsg);
        }
      }
    }
  };

  // Handle ApiError
  if (error instanceof ApiError) {
    if (error.details) {
      if (typeof error.details === 'string') {
        // String detail goes to general errors
        if (includeGeneralErrors) {
          generalErrors.push(error.details);
        }
      } else if (Array.isArray(error.details)) {
        processDetails(error.details);
      }
    } else if (error.message) {
      // No specific field errors, use general message
      if (includeGeneralErrors) {
        generalErrors.push(error.message);
      }
    }
  }
  // Handle plain Error
  else if (error instanceof Error) {
    // Try to parse JSON error message (some backends return JSON in error messages)
    try {
      const parsed = JSON.parse(error.message) as { details?: unknown[] };
      if (parsed.details && Array.isArray(parsed.details)) {
        processDetails(parsed.details);
      }
    } catch {
      // Not JSON, use error message as general error
      if (includeGeneralErrors) {
        generalErrors.push(error.message);
      }
    }
  }
  // Handle unknown error types
  else if (typeof error === 'object' && error !== null) {
    const errorObj = error as ApiErrorResponse;

    if (errorObj.details) {
      if (typeof errorObj.details === 'string') {
        if (includeGeneralErrors) {
          generalErrors.push(errorObj.details);
        }
      } else if (Array.isArray(errorObj.details)) {
        processDetails(errorObj.details);
      }
    } else if (errorObj.message || errorObj.error) {
      if (includeGeneralErrors) {
        generalErrors.push(errorObj.message || errorObj.error);
      }
    }
  }

  // Add general errors if any
  if (includeGeneralErrors && generalErrors.length > 0) {
    errors['_general' as T] = {
      message: generalErrors.join('. '),
    };
  }

  return errors;
}

/**
 * Extracts a human-readable error message from any error type
 *
 * @param error - The error to extract message from
 * @param defaultMessage - Default message if extraction fails
 * @returns Human-readable error message
 */
export function getErrorMessage(error: unknown, defaultMessage = 'Ha ocurrido un error'): string {
  if (error instanceof ApiError) {
    return error.userMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const errorObj = error as ApiErrorResponse;
    return errorObj.message || errorObj.error || defaultMessage;
  }

  if (typeof error === 'string') {
    return error;
  }

  return defaultMessage;
}

/**
 * Checks if an error is a validation error (400 status)
 */
export function isValidationError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.isValidationError;
  }

  if (typeof error === 'object' && error !== null) {
    const status = (error as { status?: number }).status;
    return status === 400;
  }

  return false;
}

/**
 * Checks if an error is an authentication error (401 status)
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.isAuthError;
  }

  if (typeof error === 'object' && error !== null) {
    const status = (error as { status?: number }).status;
    return status === 401;
  }

  return false;
}

/**
 * Checks if an error is a server error (5xx status)
 */
export function isServerError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.isServerError;
  }

  if (typeof error === 'object' && error !== null) {
    const status = (error as { status?: number }).status;
    return status !== undefined && status >= 500;
  }

  return false;
}

/**
 * Creates a standardized error handler for forms
 *
 * @example
 * ```tsx
 * const handleFormError = createFormErrorHandler({
 *   setErrors,
 *   setGeneralError,
 *   fieldMappings: { firstName: 'firstName' }
 * });
 *
 * try {
 *   await submitForm(data);
 * } catch (error) {
 *   handleFormError(error);
 * }
 * ```
 */
export function createFormErrorHandler<T extends string = string>(options: {
  /** Function to set field errors */
  setErrors: (errors: MappedFormErrors<T>) => void;
  /** Function to set general error message */
  setGeneralError?: (message: string | null) => void;
  /** Field mappings */
  fieldMappings?: Record<string, string>;
  /** Default error message */
  defaultMessage?: string;
}) {
  const { setErrors, setGeneralError, fieldMappings, defaultMessage } = options;

  return (error: unknown) => {
    // Build options object only with defined values to satisfy exactOptionalPropertyTypes
    const mapperOptions: ErrorMapperOptions = {
      includeGeneralErrors: true,
    };
    if (fieldMappings !== undefined) {
      mapperOptions.fieldMappings = fieldMappings;
    }
    if (defaultMessage !== undefined) {
      mapperOptions.defaultMessage = defaultMessage;
    }

    const mappedErrors = mapApiErrorToFields<T>(error, mapperOptions);

    // Separate field errors from general error
    const { _general, ...fieldErrors } = mappedErrors as MappedFormErrors<T> & {
      _general?: FieldError;
    };

    // Set field errors (cast is safe because we're just removing _general)
    setErrors(fieldErrors as unknown as MappedFormErrors<T>);

    // Set general error if provided
    if (setGeneralError) {
      if (_general) {
        setGeneralError(_general.message);
      } else if (Object.keys(fieldErrors).length === 0) {
        // No specific field errors, show general message
        setGeneralError(getErrorMessage(error, defaultMessage));
      } else {
        // Clear general error if we have field-specific errors
        setGeneralError(null);
      }
    }
  };
}
