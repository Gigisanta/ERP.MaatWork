/**
 * API Client Types
 */

export interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  requireAuth?: boolean;
}

export interface RequestConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}
