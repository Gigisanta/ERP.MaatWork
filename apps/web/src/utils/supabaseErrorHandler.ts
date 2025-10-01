import { PostgrestError } from '@supabase/supabase-js';

export interface SupabaseErrorInfo {
  code: string;
  message: string;
  details?: string;
  hint?: string;
  isConnectionError: boolean;
  isRetryable: boolean;
}

export class SupabaseErrorHandler {
  /**
   * Analyzes Supabase errors and provides structured error information
   */
  static analyzeError(error: any): SupabaseErrorInfo {
    // Handle AbortError (ERR_ABORTED)
    if (error.name === 'AbortError' || error.code === 'ERR_ABORTED' || error.message?.includes('aborted')) {
      return {
        code: 'ERR_ABORTED',
        message: 'Request was cancelled or timed out. Please try again.',
        isConnectionError: true,
        isRetryable: true
      };
    }

    // Handle ERR_CONNECTION_CLOSED specifically
    if (error.message?.includes('ERR_CONNECTION_CLOSED') || error.code === 'ERR_CONNECTION_CLOSED') {
      return {
        code: 'ERR_CONNECTION_CLOSED',
        message: 'Connection was closed by the server. Retrying...',
        isConnectionError: true,
        isRetryable: true
      };
    }

    // Handle network/connection errors
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed. Please check your internet connection.',
        isConnectionError: true,
        isRetryable: true
      };
    }

    // Handle fetch errors (including Failed to fetch)
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      return {
        code: 'FETCH_ERROR',
        message: 'Failed to connect to the database. Please try again.',
        isConnectionError: true,
        isRetryable: true
      };
    }

    // Handle generic connection errors
    if (error.message?.includes('net::') || error.message?.includes('ERR_')) {
      return {
        code: 'CONNECTION_ERROR',
        message: 'Network connection issue detected. Retrying...',
        isConnectionError: true,
        isRetryable: true
      };
    }

    // Handle Supabase PostgrestError
    if (error.code && error.message) {
      const postgrestError = error as PostgrestError;
      
      // Connection timeout errors
      if (postgrestError.code === '08006' || postgrestError.code === '08001') {
        return {
          code: postgrestError.code,
          message: 'Database connection timeout. Please try again.',
          details: postgrestError.details,
          hint: postgrestError.hint,
          isConnectionError: true,
          isRetryable: true
        };
      }

      // Permission errors
      if (postgrestError.code === '42501' || postgrestError.message.includes('permission denied')) {
        return {
          code: postgrestError.code,
          message: 'Database permission denied. Please contact support.',
          details: postgrestError.details,
          hint: postgrestError.hint,
          isConnectionError: false,
          isRetryable: false
        };
      }

      // Column does not exist errors
      if (postgrestError.code === '42703' || postgrestError.message.includes('does not exist')) {
        return {
          code: postgrestError.code,
          message: 'Database schema error. Some features may be temporarily unavailable.',
          details: postgrestError.details,
          hint: postgrestError.hint,
          isConnectionError: false,
          isRetryable: false
        };
      }

      // Generic PostgreSQL error
      return {
        code: postgrestError.code,
        message: postgrestError.message,
        details: postgrestError.details,
        hint: postgrestError.hint,
        isConnectionError: false,
        isRetryable: false
      };
    }

    // Generic error
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred.',
      isConnectionError: false,
      isRetryable: true
    };
  }

  /**
   * Executes a Supabase operation with retry logic and error handling
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const errorInfo = this.analyzeError(error);

        // Don't retry if it's not a retryable error
        if (!errorInfo.isRetryable) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retrying with exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.warn(`Retry attempt ${attempt}/${maxRetries} for operation after error:`, errorInfo.message);
      }
    }

    throw lastError;
  }

  /**
   * Logs errors in a structured way
   */
  static logError(error: any, context: string): void {
    const errorInfo = this.analyzeError(error);
    
    console.error(`[${context}] Supabase Error:`, {
      code: errorInfo.code,
      message: errorInfo.message,
      details: errorInfo.details,
      hint: errorInfo.hint,
      isConnectionError: errorInfo.isConnectionError,
      isRetryable: errorInfo.isRetryable,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Creates a user-friendly error message
   */
  static getUserFriendlyMessage(error: any): string {
    const errorInfo = this.analyzeError(error);
    
    if (errorInfo.isConnectionError) {
      return 'Connection issue detected. Please check your internet connection and try again.';
    }

    if (errorInfo.code === '42703') {
      return 'Some features are temporarily unavailable due to a system update. Please try again later.';
    }

    if (errorInfo.code === '42501') {
      return 'Access denied. Please contact your administrator.';
    }

    return 'An error occurred while processing your request. Please try again.';
  }
}

/**
 * Wrapper function for automatic error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: string
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      SupabaseErrorHandler.logError(error, context);
      throw error;
    }
  }) as T;
}

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  operation?: string;
}

interface ErrorInfo {
  message: string;
  type: string;
  shouldRetry: boolean;
  code?: string;
  details?: string;
  hint?: string;
}

const analyzeError = (error: any): ErrorInfo => {
  return SupabaseErrorHandler.analyzeError(error) as any;
};

const logError = (error: any, context: any): void => {
  SupabaseErrorHandler.logError(error, JSON.stringify(context));
};

export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  baseDelay: number = 1000,
  context: string = 'Unknown operation'
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[SupabaseRetry] Attempt ${attempt}/${maxRetries} for ${context}`);
      const result = await operation();
      
      if (attempt > 1) {
        console.log(`[SupabaseRetry] ✅ Success on attempt ${attempt} for ${context}`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      const errorInfo = SupabaseErrorHandler.analyzeError(error);
      
      console.warn(`[SupabaseRetry] ❌ Attempt ${attempt}/${maxRetries} failed for ${context}:`, {
        errorCode: errorInfo.code,
        errorMessage: errorInfo.message,
        isConnectionError: errorInfo.isConnectionError,
        isRetryable: errorInfo.isRetryable,
        originalError: error?.message || error
      });
      
      // Don't retry if it's not a retryable error
      if (!errorInfo.isRetryable) {
        console.error(`[SupabaseRetry] 🚫 Non-retryable error for ${context}, giving up:`, error);
        throw error;
      }
      
      // Don't wait after the last attempt
      if (attempt < maxRetries) {
        // Enhanced exponential backoff with jitter for connection errors
        const baseBackoff = errorInfo.isConnectionError ? baseDelay * 2 : baseDelay;
        const exponentialDelay = baseBackoff * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 500; // Add randomness to prevent thundering herd
        const delay = Math.min(exponentialDelay + jitter, 10000); // Cap at 10 seconds
        
        console.log(`[SupabaseRetry] ⏳ Waiting ${Math.round(delay)}ms before retry ${attempt + 1} for ${context}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`[SupabaseRetry] 💥 All ${maxRetries} attempts failed for ${context}:`, {
    finalError: lastError?.message || lastError,
    context
  });
  throw lastError;
}