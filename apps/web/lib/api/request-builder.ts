/**
 * Request Builder
 *
 * Handles header building and body serialization for API requests
 */

import type { RequestOptions } from './types';

/**
 * Build request headers
 *
 * - Sets Content-Type for non-FormData requests
 * - Merges with custom headers from options
 */
export function buildHeaders(options: RequestOptions = {}): HeadersInit {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string> | undefined),
  };

  // Authentication is handled via httpOnly cookies only
  // No Authorization header needed

  return headers;
}

/**
 * Serialize body for request
 *
 * - FormData is passed through unchanged
 * - Other objects are JSON serialized
 * - Returns null if body is undefined (compatible with RequestOptions)
 */
export function serializeBody(body: unknown): BodyInit | null {
  if (body === undefined) {
    return null;
  }

  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return body as BodyInit;
  }

  return JSON.stringify(body);
}

/**
 * Build full URL from base URL and endpoint
 */
export function buildUrl(baseUrl: string, endpoint: string): string {
  return `${baseUrl}${endpoint}`;
}
