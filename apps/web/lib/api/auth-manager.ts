/**
 * Auth Manager
 *
 * Handles token refresh for authentication
 *
 * AI_DECISION: Implementar refresh token automático para 401
 * Justificación: Mejora UX, evita que usuarios sean deslogueados por tokens expirados
 * Impacto: Sesiones más largas sin interrupciones, mejor experiencia
 */

import { ApiError } from '../api-error';
import type { RequestConfig } from './types';

export class AuthManager {
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(
    private config: RequestConfig,
    private fetchWithTimeout: (url: string, options: RequestInit) => Promise<Response>
  ) {}

  /**
   * Check if a refresh is currently in progress
   */
  get isRefreshInProgress(): boolean {
    return this.isRefreshing;
  }

  /**
   * Attempt to refresh the auth token
   *
   * - Prevents multiple simultaneous refresh requests
   * - Returns true if refresh was successful, false otherwise
   */
  async refreshToken(): Promise<boolean> {
    // If already refreshing, wait for that to complete
    if (this.isRefreshing && this.refreshPromise) {
      return await this.refreshPromise;
    }

    // Prevent multiple simultaneous refreshes
    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const response = await this.fetchWithTimeout(`${this.config.baseUrl}/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });

        if (response.ok) {
          // Cookie updated automatically by server
          return true;
        }

        return false;
      } catch {
        // If refresh fails, return false
        return false;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return await this.refreshPromise;
  }

  /**
   * Handle 401 error by attempting token refresh
   *
   * - Attempts to refresh the token
   * - Throws ApiError if refresh fails
   */
  async handle401(): Promise<boolean> {
    const refreshed = await this.refreshToken();

    if (!refreshed) {
      throw new ApiError(401, 'Session expired');
    }

    return true;
  }
}
