/**
 * Tests for Reading tools (grimmory_update_read_status, grimmory_update_rating,
 * grimmory_update_progress).
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTestMCPContext, cleanupMCPContext, callTool, listTools, type TestMCPContext } from './helpers/mcp-helpers.js';
import { registerReadingTools } from '../src/tools/reading.js';
import { ResponseFormatter } from '../src/services/response-formatter.js';
import type { GrimmoryClient } from '../src/services/grimmory-client.js';
import type { ApiResponse } from '../src/services/grimmory-client.js';
import type { BookStatusUpdateResponse, PersonalRatingUpdateResponse, ProgressUpdateResponse } from '../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BOOK_ID = '00000000-0000-0000-0000-000000000001';

const mockStatusResponse: BookStatusUpdateResponse = {
  bookId: 1,
  readStatus: 'READING',
  readStatusModifiedTime: '2025-06-15T10:00:00Z',
};

const mockRatingResponse: PersonalRatingUpdateResponse = {
  bookId: 1,
  personalRating: 4,
};

const mockProgressResponse: ProgressUpdateResponse = {
  bookId: 1,
  epubProgress: { cfi: 'epubcfi(/6/4[chap01ref]!/4/2/2/2)', percentage: 50 },
};

function createMockClient(overrides?: {
  putStatus?: ApiResponse<BookStatusUpdateResponse>;
  putRating?: ApiResponse<PersonalRatingUpdateResponse>;
  putProgress?: ApiResponse<ProgressUpdateResponse>;
}): GrimmoryClient {
  const mockPutStatus = overrides?.putStatus ?? { success: true, data: mockStatusResponse };
  const mockPutRating = overrides?.putRating ?? { success: true, data: mockRatingResponse };
  const mockPutProgress = overrides?.putProgress ?? { success: true, data: mockProgressResponse };

  return {
    put: vi.fn(<T>(path: string) => {
      if (path.includes('/status')) return Promise.resolve(mockPutStatus) as Promise<ApiResponse<T>>;
      if (path.includes('/rating')) return Promise.resolve(mockPutRating) as Promise<ApiResponse<T>>;
      if (path.includes('/progress')) return Promise.resolve(mockPutProgress) as Promise<ApiResponse<T>>;
      return Promise.resolve({ success: false, error: 'Unknown path', isError: true });
    }),
  } as unknown as GrimmoryClient;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Reading Tools', () => {
  const formatter = new ResponseFormatter();
  let ctx: TestMCPContext;
  let mockClient: GrimmoryClient;

  beforeAll(async () => {
    mockClient = createMockClient();
    ctx = await createTestMCPContext({
      setup: (server) => {
        registerReadingTools(server, mockClient, formatter);
      },
    });
  });

  afterAll(async () => {
    await cleanupMCPContext(ctx);
  });

  // -- Registration ----------------------------------------------------------

  describe('tool registration', () => {
    it('registers all three reading tools', async () => {
      const tools = await listTools(ctx);
      const names = tools.map((t) => t.name);
      expect(names).toContain('grimmory_update_read_status');
      expect(names).toContain('grimmory_update_rating');
      expect(names).toContain('grimmory_update_progress');
    });

    it('grimmory_update_read_status has a description', async () => {
      const tools = await listTools(ctx);
      const tool = tools.find((t) => t.name === 'grimmory_update_read_status');
      expect(tool?.description).toContain('read status');
    });

    it('grimmory_update_rating has a description', async () => {
      const tools = await listTools(ctx);
      const tool = tools.find((t) => t.name === 'grimmory_update_rating');
      expect(tool?.description).toContain('rating');
    });

    it('grimmory_update_progress has a description', async () => {
      const tools = await listTools(ctx);
      const tool = tools.find((t) => t.name === 'grimmory_update_progress');
      expect(tool?.description).toContain('progress');
    });
  });

  // -- grimmory_update_read_status -------------------------------------------

  describe('grimmory_update_read_status', () => {
    it('returns status response as JSON by default', async () => {
      const result = await callTool<BookStatusUpdateResponse>(ctx, 'grimmory_update_read_status', {
        bookId: BOOK_ID,
        status: 'READING',
      });
      expect(result.readStatus).toBe('READING');
      expect(result.bookId).toBe(1);
    });

    it('returns status response as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_update_read_status', {
        bookId: BOOK_ID,
        status: 'READ',
        response_format: 'markdown',
      });
      expect(result).toContain('Read Status Updated');
    });

    it('calls the API with correct path and body', async () => {
      await callTool(ctx, 'grimmory_update_read_status', {
        bookId: BOOK_ID,
        status: 'ABANDONED',
      });

      expect(mockClient.put).toHaveBeenCalledWith(
        `books/${BOOK_ID}/status`,
        'ABANDONED',
      );
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            putStatus: { success: false, error: 'Book not found', isError: true },
          });
          registerReadingTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_update_read_status',
          arguments: { bookId: BOOK_ID, status: 'READING' },
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('Book not found');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_update_rating ------------------------------------------------

  describe('grimmory_update_rating', () => {
    it('returns rating response as JSON by default', async () => {
      const result = await callTool<PersonalRatingUpdateResponse>(ctx, 'grimmory_update_rating', {
        bookId: BOOK_ID,
        rating: 4,
      });
      expect(result.personalRating).toBe(4);
      expect(result.bookId).toBe(1);
    });

    it('returns rating response as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_update_rating', {
        bookId: BOOK_ID,
        rating: 5,
        response_format: 'markdown',
      });
      expect(result).toContain('Rating Updated');
    });

    it('calls the API with correct path and body', async () => {
      await callTool(ctx, 'grimmory_update_rating', {
        bookId: BOOK_ID,
        rating: 3,
      });

      expect(mockClient.put).toHaveBeenCalledWith(
        `books/${BOOK_ID}/rating`,
        3,
      );
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            putRating: { success: false, error: 'Forbidden', isError: true },
          });
          registerReadingTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_update_rating',
          arguments: { bookId: BOOK_ID, rating: 4 },
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('Forbidden');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_update_progress ----------------------------------------------

  describe('grimmory_update_progress', () => {
    it('returns progress response as JSON by default', async () => {
      const result = await callTool<ProgressUpdateResponse>(ctx, 'grimmory_update_progress', {
        bookId: BOOK_ID,
        progress: 50,
      });
      expect(result.bookId).toBe(1);
      expect(result.epubProgress?.percentage).toBe(50);
    });

    it('returns progress response as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_update_progress', {
        bookId: BOOK_ID,
        progress: 75,
        response_format: 'markdown',
      });
      expect(result).toContain('Progress Updated');
    });

    it('calls the API with correct path and body', async () => {
      await callTool(ctx, 'grimmory_update_progress', {
        bookId: BOOK_ID,
        progress: 80,
      });

      expect(mockClient.put).toHaveBeenCalledWith(
        `books/${BOOK_ID}/progress`,
        80,
      );
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            putProgress: { success: false, error: 'Server error', isError: true },
          });
          registerReadingTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_update_progress',
          arguments: { bookId: BOOK_ID, progress: 50 },
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('Server error');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });
});
