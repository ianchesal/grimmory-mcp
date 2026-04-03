/**
 * Tests for Review tools (grimmory_list_reviews).
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTestMCPContext, cleanupMCPContext, callTool, listTools, type TestMCPContext } from './helpers/mcp-helpers.js';
import { createMockBookReview, createMockPage } from './helpers/factories.js';
import { registerReviewTools } from '../src/tools/reviews.js';
import { ResponseFormatter } from '../src/services/response-formatter.js';
import type { GrimmoryClient } from '../src/services/grimmory-client.js';
import type { ApiResponse, Page } from '../src/services/grimmory-client.js';
import type { BookReview } from '../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockClient(overrides?: {
  listReviews?: ApiResponse<Page<BookReview>>;
}): GrimmoryClient {
  const defaultReview = createMockBookReview();
  const defaultPage = createMockPage([defaultReview], {
    totalElements: 1,
    totalPages: 1,
  });

  const mockListReviews = overrides?.listReviews ?? { success: true, data: defaultPage };

  return {
    get: vi.fn(<T>(path: string) => {
      if (path.includes('/reviews')) {
        return Promise.resolve(mockListReviews) as Promise<ApiResponse<T>>;
      }
      return Promise.resolve({ success: false, error: 'Not found', isError: true }) as Promise<ApiResponse<T>>;
    }),
  } as unknown as GrimmoryClient;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Review Tools', () => {
  const formatter = new ResponseFormatter();
  let ctx: TestMCPContext;
  let mockClient: GrimmoryClient;

  beforeAll(async () => {
    mockClient = createMockClient();
    ctx = await createTestMCPContext({
      setup: (server) => {
        registerReviewTools(server, mockClient, formatter);
      },
    });
  });

  afterAll(async () => {
    await cleanupMCPContext(ctx);
  });

  // -- Registration ----------------------------------------------------------

  describe('tool registration', () => {
    it('registers the review tool', async () => {
      const tools = await listTools(ctx);
      const names = tools.map((t) => t.name);
      expect(names).toContain('grimmory_list_reviews');
    });

    it('grimmory_list_reviews has a description', async () => {
      const tools = await listTools(ctx);
      const tool = tools.find((t) => t.name === 'grimmory_list_reviews');
      expect(tool?.description).toContain('List reviews');
    });
  });

  // -- grimmory_list_reviews -------------------------------------------------

  describe('grimmory_list_reviews', () => {
    it('returns reviews as JSON by default', async () => {
      const result = await callTool<Page<BookReview>>(ctx, 'grimmory_list_reviews', {
        bookId: '00000000-0000-0000-0000-000000000001',
      });
      expect(result.content).toBeDefined();
      expect(result.totalElements).toBe(1);
      expect(result.content[0].id).toBe(1);
    });

    it('returns reviews as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_list_reviews', {
        bookId: '00000000-0000-0000-0000-000000000001',
        response_format: 'markdown',
      });
      expect(result).toContain('Great book');
      expect(result).toContain('Test Reviewer');
      expect(result).toContain('Page 1 of 1');
    });

    it('passes pagination params to the API', async () => {
      await callTool(ctx, 'grimmory_list_reviews', {
        bookId: '00000000-0000-0000-0000-000000000001',
        page: 2,
        size: 10,
        sort: 'rating',
        dir: 'desc',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'books/00000000-0000-0000-0000-000000000001/reviews',
        expect.objectContaining({
          page: 2,
          size: 10,
          sort: 'rating',
          dir: 'desc',
        }),
      );
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            listReviews: { success: false, error: 'Book not found', isError: true },
          });
          registerReviewTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_list_reviews',
          arguments: { bookId: '00000000-0000-0000-0000-000000000099' },
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
});
