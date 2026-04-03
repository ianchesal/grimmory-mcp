// ============================================================================
// Grimmory MCP Server — GrimmoryClient Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { GrimmoryClient, type ApiResponse } from '../src/services/grimmory-client.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_ENV = {
  GRIMMORY_URL: 'https://books.example.com',
  GRIMMORY_EMAIL: 'user@example.com',
  GRIMMORY_PASSWORD: 's3cret',
};

/** Create a fake JWT with the given `exp` (epoch seconds). */
function fakeJWT(exp: number, extra: Record<string, unknown> = {}): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({ exp, sub: '1', iat: exp - 3600, ...extra }),
  );
  const signature = btoa('sig');
  return `${header}.${payload}.${signature}`;
}

/** Unexpired JWT (1 hour from now). */
const VALID_TOKEN = fakeJWT(Math.floor(Date.now() / 1000) + 3600);

/** Expired JWT (1 hour ago). */
const EXPIRED_TOKEN = fakeJWT(Math.floor(Date.now() / 1000) - 3600);

/** Standard auth response. */
const AUTH_RESPONSE = {
  accessToken: VALID_TOKEN,
  refreshToken: fakeJWT(Math.floor(Date.now() / 1000) + 86400),
  isDefaultPassword: 'false',
};

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

// Mock global fetch using vi.fn()
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function setEnv(vars: Record<string, string | undefined>) {
  const original: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    original[k] = process.env[k];
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
  return () => {
    for (const [k, v] of Object.entries(original)) {
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    }
  };
}

function mockResponse<T>(body: T, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GrimmoryClient', () => {
  let resetEnv: () => void;

  beforeEach(() => {
    resetEnv = setEnv(VALID_ENV);
    mockFetch.mockClear();
  });

  afterEach(() => {
    resetEnv();
  });

  describe('constructor', () => {
    it('should throw if GRIMMORY_URL is missing', () => {
      resetEnv();
      process.env.GRIMMORY_EMAIL = VALID_ENV.GRIMMORY_EMAIL;
      process.env.GRIMMORY_PASSWORD = VALID_ENV.GRIMMORY_PASSWORD;

      expect(() => new GrimmoryClient()).toThrow(
        'Missing required environment variables: GRIMMORY_URL',
      );
    });

    it('should throw if GRIMMORY_EMAIL is missing', () => {
      resetEnv();
      process.env.GRIMMORY_URL = VALID_ENV.GRIMMORY_URL;
      process.env.GRIMMORY_PASSWORD = VALID_ENV.GRIMMORY_PASSWORD;

      expect(() => new GrimmoryClient()).toThrow(
        'Missing required environment variables: GRIMMORY_EMAIL',
      );
    });

    it('should throw if GRIMMORY_PASSWORD is missing', () => {
      resetEnv();
      process.env.GRIMMORY_URL = VALID_ENV.GRIMMORY_URL;
      process.env.GRIMMORY_EMAIL = VALID_ENV.GRIMMORY_EMAIL;

      expect(() => new GrimmoryClient()).toThrow(
        'Missing required environment variables: GRIMMORY_PASSWORD',
      );
    });

    it('should throw listing all missing variables', () => {
      resetEnv();

      expect(() => new GrimmoryClient()).toThrow(
        /GRIMMORY_URL.*GRIMMORY_EMAIL.*GRIMMORY_PASSWORD/,
      );
    });

    it('should instantiate when all env vars are present', () => {
      expect(() => new GrimmoryClient()).not.toThrow();
    });
  });

  describe('authenticate', () => {
    it('should call login endpoint and store tokens', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(AUTH_RESPONSE));

      const client = new GrimmoryClient();
      await client.authenticate();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://books.example.com/api/v1/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: VALID_ENV.GRIMMORY_EMAIL,
            password: VALID_ENV.GRIMMORY_PASSWORD,
          }),
        }),
      );
    });

    it('should handle authentication failure', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ error: 'Invalid credentials' }, 401));

      const client = new GrimmoryClient();
      const result = await client.authenticate();

      expect(result.success).toBe(false);
      expect(result.isError).toBe(true);
    });
  });

  describe('get', () => {
    it('should make authenticated GET request', async () => {
      const bookData = { id: '1', title: 'Test Book' };
      mockFetch
        .mockResolvedValueOnce(mockResponse(AUTH_RESPONSE))
        .mockResolvedValueOnce(mockResponse(bookData));

      const client = new GrimmoryClient();
      await client.authenticate();
      const result = await client.get<typeof bookData>('/books/1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(bookData);
      }
    });

    it('should handle 401 and retry with token refresh', async () => {
      const bookData = { id: '1', title: 'Test Book' };
      mockFetch
        .mockResolvedValueOnce(mockResponse(AUTH_RESPONSE))
        .mockResolvedValueOnce(mockResponse({ error: 'Unauthorized' }, 401))
        .mockResolvedValueOnce(mockResponse(AUTH_RESPONSE))
        .mockResolvedValueOnce(mockResponse(bookData));

      const client = new GrimmoryClient();
      await client.authenticate();
      const result = await client.get<typeof bookData>('/books/1');

      expect(result.success).toBe(true);
    });
  });

  describe('post', () => {
    it('should make authenticated POST request', async () => {
      const responseData = { id: '2', title: 'New Book' };
      mockFetch
        .mockResolvedValueOnce(mockResponse(AUTH_RESPONSE))
        .mockResolvedValueOnce(mockResponse(responseData));

      const client = new GrimmoryClient();
      await client.authenticate();
      const result = await client.post<typeof responseData>('/books', { title: 'New Book' });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'New Book' }),
        }),
      );
    });
  });

  describe('put', () => {
    it('should make authenticated PUT request', async () => {
      const responseData = { id: '1', title: 'Updated Book' };
      mockFetch
        .mockResolvedValueOnce(mockResponse(AUTH_RESPONSE))
        .mockResolvedValueOnce(mockResponse(responseData));

      const client = new GrimmoryClient();
      await client.authenticate();
      const result = await client.put<typeof responseData>('/books/1', { title: 'Updated Book' });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ title: 'Updated Book' }),
        }),
      );
    });
  });

  describe('delete', () => {
    it('should make authenticated DELETE request', async () => {
      mockFetch
        .mockResolvedValueOnce(mockResponse(AUTH_RESPONSE))
        .mockResolvedValueOnce(mockResponse(null, 204));

      const client = new GrimmoryClient();
      await client.authenticate();
      const result = await client.delete('/books/1');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
    });
  });
});
