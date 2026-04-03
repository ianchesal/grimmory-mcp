/**
 * Tests for Book tools (grimmory_list_books, grimmory_get_book).
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTestMCPContext, cleanupMCPContext, callTool, listTools, type TestMCPContext } from './helpers/mcp-helpers.js';
import { createMockBook, createMockPage } from './helpers/factories.js';
import { registerBookTools } from '../src/tools/books.js';
import { ResponseFormatter } from '../src/services/response-formatter.js';
import type { GrimmoryClient } from '../src/services/grimmory-client.js';
import type { ApiResponse, Page } from '../src/services/grimmory-client.js';
import type { Book } from '../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockClient(overrides?: {
  listBooks?: ApiResponse<Page<Book>>;
  getBook?: ApiResponse<Book>;
}): GrimmoryClient {
  const defaultBook = createMockBook();
  const defaultPage = createMockPage([defaultBook], {
    totalElements: 1,
    totalPages: 1,
  });

  const mockListBooks = overrides?.listBooks ?? { success: true, data: defaultPage };
  const mockGetBook = overrides?.getBook ?? { success: true, data: defaultBook };

  return {
    get: vi.fn(<T>(path: string) => {
      if (path.startsWith('books/') && !path.includes('page') && !path.includes('size')) {
        return Promise.resolve(mockGetBook) as Promise<ApiResponse<T>>;
      }
      return Promise.resolve(mockListBooks) as Promise<ApiResponse<T>>;
    }),
  } as unknown as GrimmoryClient;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Book Tools', () => {
  const formatter = new ResponseFormatter();
  let ctx: TestMCPContext;
  let mockClient: GrimmoryClient;

  beforeAll(async () => {
    mockClient = createMockClient();
    ctx = await createTestMCPContext({
      setup: (server) => {
        registerBookTools(server, mockClient, formatter);
      },
    });
  });

  afterAll(async () => {
    await cleanupMCPContext(ctx);
  });

  // -- Registration ----------------------------------------------------------

  describe('tool registration', () => {
    it('registers both book tools', async () => {
      const tools = await listTools(ctx);
      const names = tools.map((t) => t.name);
      expect(names).toContain('grimmory_list_books');
      expect(names).toContain('grimmory_get_book');
    });

    it('grimmory_list_books has a description', async () => {
      const tools = await listTools(ctx);
      const listTool = tools.find((t) => t.name === 'grimmory_list_books');
      expect(listTool?.description).toContain('List books');
    });

    it('grimmory_get_book has a description', async () => {
      const tools = await listTools(ctx);
      const getTool = tools.find((t) => t.name === 'grimmory_get_book');
      expect(getTool?.description).toContain('Get detailed information');
    });
  });

  // -- grimmory_list_books ---------------------------------------------------

  describe('grimmory_list_books', () => {
    it('returns books as JSON by default', async () => {
      const result = await callTool<Page<Book>>(ctx, 'grimmory_list_books');
      expect(result.content).toBeDefined();
      expect(result.totalElements).toBe(1);
      expect(result.content[0].id).toBe(1);
    });

    it('returns books as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_list_books', {
        response_format: 'markdown',
      });
      expect(result).toContain('# Test Book');
      expect(result).toContain('Page 1 of 1');
    });

    it('passes pagination params to the API', async () => {
      await callTool(ctx, 'grimmory_list_books', {
        page: 2,
        size: 10,
        sort: 'title',
        dir: 'asc',
      });

      expect(mockClient.get).toHaveBeenCalledWith('books', {
        page: 2,
        size: 10,
        sort: 'title',
        dir: 'asc',
      });
    });

    it('passes filter params to the API', async () => {
      await callTool(ctx, 'grimmory_list_books', {
        libraryId: '123e4567-e89b-12d3-a456-426614174000',
        search: 'fantasy',
      });

      expect(mockClient.get).toHaveBeenCalledWith('books', expect.objectContaining({
        libraryId: '123e4567-e89b-12d3-a456-426614174000',
        search: 'fantasy',
      }));
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            listBooks: { success: false, error: 'Not found', isError: true },
          });
          registerBookTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_list_books',
          arguments: {},
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('Not found');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_get_book -----------------------------------------------------

  describe('grimmory_get_book', () => {
    it('returns a single book as JSON by default', async () => {
      const result = await callTool<Book>(ctx, 'grimmory_get_book', {
        bookId: '00000000-0000-0000-0000-000000000001',
      });
      expect(result.id).toBe(1);
      expect(result.libraryName).toBe('Test Library');
    });

    it('returns a single book as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_get_book', {
        bookId: '00000000-0000-0000-0000-000000000001',
        response_format: 'markdown',
      });
      expect(result).toContain('# Test Book');
      expect(result).toContain('**Author:** Test Author');
    });

    it('calls the API with the correct book path', async () => {
      await callTool(ctx, 'grimmory_get_book', {
        bookId: '00000000-0000-0000-0000-000000000099',
      });

      expect(mockClient.get).toHaveBeenCalledWith('books/00000000-0000-0000-0000-000000000099');
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            getBook: { success: false, error: 'Book not found', isError: true },
          });
          registerBookTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_get_book',
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
