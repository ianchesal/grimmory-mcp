// ============================================================================
// Grimmory MCP Server — API Client with JWT Authentication
// ============================================================================

import { API_BASE_PATH } from '../constants.js';
import type { AuthResponse } from '../types.js';
import { logError, logInfo } from '../utils.js';

// ---------------------------------------------------------------------------
// Response Types
// ---------------------------------------------------------------------------

/** Discriminated union for type-safe API responses. */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; isError: true };

// ---------------------------------------------------------------------------
// Environment Variable Keys
// ---------------------------------------------------------------------------

const ENV_URL = 'GRIMMORY_URL';
const ENV_EMAIL = 'GRIMMORY_EMAIL';
const ENV_PASSWORD = 'GRIMMORY_PASSWORD';

// ---------------------------------------------------------------------------
// JWT Helpers
// ---------------------------------------------------------------------------

interface DecodedToken {
  exp: number;
  [key: string]: unknown;
}

/**
 * Decode the payload of a JWT without verifying the signature.
 * Returns null if the token is malformed.
 */
function decodeJWTPayload(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1]!;
    // Base64url decode
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(json) as DecodedToken;
  } catch {
    return null;
  }
}

/**
 * Check if a JWT is expired or will expire within the given buffer (seconds).
 * Returns true if there is no token or it's expired/about to expire.
 */
function isTokenExpired(token: string | null, bufferSeconds: number = 30): boolean {
  if (!token) return true;
  const decoded = decodeJWTPayload(token);
  if (!decoded?.exp) return true;
  // exp is in seconds, Date.now() is in milliseconds
  return Date.now() >= (decoded.exp - bufferSeconds) * 1000;
}

// ---------------------------------------------------------------------------
// GrimmoryClient
// ---------------------------------------------------------------------------

/**
 * HTTP client for the Grimmory (Booklore) API with automatic JWT
 * authentication and transparent token refresh protected by a mutex
 * to prevent concurrent refresh races.
 */
export class GrimmoryClient {
  private readonly baseUrl: string;
  private readonly email: string;
  private readonly password: string;

  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  /** Mutex: non-null while a refresh is in flight. */
  private refreshMutex: Promise<void> | null = null;

  constructor() {
    const url = process.env[ENV_URL];
    const email = process.env[ENV_EMAIL];
    const password = process.env[ENV_PASSWORD];

    if (!url || !email || !password) {
      const missing = [ENV_URL, ENV_EMAIL, ENV_PASSWORD]
        .filter((k) => !process.env[k])
        .join(', ');
      throw new Error(
        `Missing required environment variables: ${missing}. ` +
          'Set GRIMMORY_URL, GRIMMORY_EMAIL, and GRIMMORY_PASSWORD.',
      );
    }

    // Normalise: strip trailing slash
    this.baseUrl = url.replace(/\/+$/, '');
    this.email = email;
    this.password = password;

    logInfo(`Client configured for ${this.baseUrl}`);
  }

  // -------------------------------------------------------------------------
  // Authentication
  // -------------------------------------------------------------------------

  /**
   * Authenticate against the Grimmory API using email/password.
   * Stores both access and refresh tokens in memory.
   */
  async authenticate(): Promise<ApiResponse<void>> {
    const url = `${this.baseUrl}${API_BASE_PATH}/auth/login`;
    logInfo('Authenticating...');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: this.email, password: this.password }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return {
        success: false,
        error: `Authentication failed (${response.status}): ${errorText || response.statusText}`,
        isError: true,
      };
    }

      const data = (await response.json()) as AuthResponse;
      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;
      logInfo('Authenticated successfully');
      return { success: true, data: undefined };
  }

  /**
   * Refresh tokens using the stored refresh token.
   * Called internally — consumers should never need this directly.
   */
  private async refreshTokens(): Promise<void> {
    if (!this.refreshToken) {
      // No refresh token available — fall back to full re-authentication
      logInfo('No refresh token available, re-authenticating');
      await this.authenticate();
      return;
    }

    const url = `${this.baseUrl}${API_BASE_PATH}/auth/refresh`;
    logInfo('Refreshing tokens...');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        // Refresh failed — try full re-authentication
        logInfo(
          `Token refresh failed (${response.status}), re-authenticating`,
        );
        this.refreshToken = null;
        await this.authenticate();
        return;
      }

      const data = (await response.json()) as AuthResponse;
      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;
      logInfo('Tokens refreshed successfully');
    } catch (err) {
      // Network error during refresh — try full re-authentication
      logError(`Token refresh error: ${err}`);
      this.refreshToken = null;
      await this.authenticate();
    }
  }

  /**
   * Ensure we have a valid, non-expired access token.
   * Uses a mutex to guarantee only one refresh happens at a time.
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!isTokenExpired(this.accessToken)) return;

    if (this.refreshMutex) {
      // Another call is already refreshing — just wait for it
      await this.refreshMutex;
      return;
    }

    // We are the first to notice expiry — start the refresh
    this.refreshMutex = this.refreshTokens();
    try {
      await this.refreshMutex;
    } finally {
      this.refreshMutex = null;
    }
  }

  // -------------------------------------------------------------------------
  // HTTP Methods
  // -------------------------------------------------------------------------

  /**
   * Build the full URL for an API path (with optional query parameters).
   */
  private buildUrl(path: string, params?: Record<string, unknown>): string {
    const fullPath = path.startsWith('/')
      ? `${this.baseUrl}${path}`
      : `${this.baseUrl}${API_BASE_PATH}/${path}`;

    if (!params) return fullPath;

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    return qs ? `${fullPath}?${qs}` : fullPath;
  }

  /**
   * Execute an authenticated HTTP request with automatic token management.
   * If a 401 is received, the client will attempt to refresh tokens once and retry.
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, unknown>,
  ): Promise<ApiResponse<T>> {
    try {
      await this.ensureAuthenticated();

      const url = this.buildUrl(path, params);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(this.accessToken
          ? { Authorization: `Bearer ${this.accessToken}` }
          : {}),
      };

      const options: RequestInit = {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      };

      let response = await fetch(url, options);

      // If we get a 401, attempt one token refresh + retry
      if (response.status === 401) {
        logInfo('Received 401, attempting token refresh and retry');

        // Force a refresh even if the token didn't look expired
        if (this.refreshMutex) {
          await this.refreshMutex;
        } else {
          this.refreshMutex = this.refreshTokens();
          try {
            await this.refreshMutex;
          } finally {
            this.refreshMutex = null;
          }
        }

        // Retry with the new token
        const retryHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(this.accessToken
            ? { Authorization: `Bearer ${this.accessToken}` }
            : {}),
        };

        response = await fetch(url, {
          ...options,
          headers: retryHeaders,
        });
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        const message = errorBody || response.statusText;
        logError(`API ${method} ${path} failed (${response.status}): ${message}`);
        return {
          success: false,
          error: `API error ${response.status}: ${message}`,
          isError: true,
        };
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return { success: true, data: undefined as T };
      }

      const data = (await response.json()) as T;
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logError(`Request failed: ${message}`);
      return { success: false, error: message, isError: true };
    }
  }

  /** Perform an authenticated GET request. */
  async get<T>(
    path: string,
    params?: Record<string, unknown>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, undefined, params);
  }

  /** Perform an authenticated POST request. */
  async post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, body);
  }

  /** Perform an authenticated PUT request. */
  async put<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, body);
  }

  /** Perform an authenticated DELETE request. */
  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path);
  }
}
