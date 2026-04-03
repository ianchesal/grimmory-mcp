/**
 * Tests for Shelf tools (grimmory_list_shelves, grimmory_get_shelf_books).
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTestMCPContext, cleanupMCPContext, callTool, listTools, type TestMCPContext } from './helpers/mcp-helpers.js';
import { createMockShelf, createMockBook, createMockPage } from './helpers/factories.js';
import { registerShelfTools } from '../src/tools/shelves.js';
import { ResponseFormatter } from '../src/services/response-formatter.js';
import type { GrimmoryClient } from '../src/services/grimmory-client.js';
import type { ApiResponse, Page } from '../src/services/grimmory-client.js';
import type { Shelf, Book } from '../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockClient(overrides?: {
  listShelves?: ApiResponse<Page<Shelf>>;
  getShelfBooks?: ApiResponse<Page<Book>>;
}): GrimmoryClient {
  const defaultShelf = createMockShelf();
  const defaultShelfPage = createMockPage([defaultShelf], {
    totalElements: 1,
    totalPages: 1,
  });
  const defaultBook = createMockBook();
  const defaultBookPage = createMockPage([defaultBook], {
    totalElements: 1,
    totalPages: 1,
  });

  const mockListShelves = overrides?.listShelves ?? { success: true, data: defaultShelfPage };
  const mockGetShelfBooks = overrides?.getShelfBooks ?? { success: true, data: defaultBookPage };

  return {
    get: vi.fn(<T>(path: string) => {
      if (path.startsWith('shelves/') && path.includes('/books')) {
        return Promise.resolve(mockGetShelfBooks) as Promise<ApiResponse<T>>;
      }
      return Promise.resolve(mockListShelves) as Promise<ApiResponse<T>>;
    }),
  } as unknown as GrimmoryClient;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Shelf Tools', () => {
  const formatter = new ResponseFormatter();
  let ctx: TestMCPContext;
  let mockClient: GrimmoryClient;

  beforeAll(async () => {
    mockClient = createMockClient();
    ctx = await createTestMCPContext({
      setup: (server) => {
        registerShelfTools(server, mockClient, formatter);
      },
    });
  });

  afterAll(async () => {
    await cleanupMCPContext(ctx);
  });

  // -- Registration ----------------------------------------------------------

  describe('tool registration', () => {
    it('registers both shelf tools', async () => {
      const tools = await listTools(ctx);
      const names = tools.map((t) => t.name);
      expect(names).toContain('grimmory_list_shelves');
      expect(names).toContain('grimmory_get_shelf_books');
    });

    it('grimmory_list_shelves has a description', async () => {
      const tools = await listTools(ctx);
      const listTool = tools.find((t) => t.name === 'grimmory_list_shelves');
      expect(listTool?.description).toContain('List all shelves');
    });

    it('grimmory_get_shelf_books has a description', async () => {
      const tools = await listTools(ctx);
      const getTool = tools.find((t) => t.name === 'grimmory_get_shelf_books');
      expect(getTool?.description).toContain('Get books');
    });

  });

  // -- grimmory_list_shelves -------------------------------------------------

  describe('grimmory_list_shelves', () => {
    it('returns shelves as JSON by default', async () => {
      const result = await callTool<Page<Shelf>>(ctx, 'grimmory_list_shelves');
      expect(result.content).toBeDefined();
      expect(result.totalElements).toBe(1);
      expect(result.content[0].id).toBe(1);
    });

    it('returns shelves as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_list_shelves', {
        response_format: 'markdown',
      });
      expect(result).toContain('Test Shelf');
    });

    it('passes pagination params to the API', async () => {
      await callTool(ctx, 'grimmory_list_shelves', {
        page: 2,
        size: 10,
        sort: 'name',
        dir: 'asc',
      });

      expect(mockClient.get).toHaveBeenCalledWith('shelves', {
        page: 2,
        size: 10,
        sort: 'name',
        dir: 'asc',
      });
    });

    it('passes libraryId filter to the API when provided', async () => {
      await callTool(ctx, 'grimmory_list_shelves', {
        libraryId: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(mockClient.get).toHaveBeenCalledWith('shelves', expect.objectContaining({
        libraryId: '123e4567-e89b-12d3-a456-426614174000',
      }));
    });

    it('does not include libraryId when not provided', async () => {
      await callTool(ctx, 'grimmory_list_shelves', {});

      const lastCall = (mockClient.get as any).mock.calls.at(-1);
      expect(lastCall[1]).not.toHaveProperty('libraryId');
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            listShelves: { success: false, error: 'Not found', isError: true },
          });
          registerShelfTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_list_shelves',
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

  // -- grimmory_get_shelf_books -----------------------------------------------

  describe('grimmory_get_shelf_books', () => {
    it('returns books as JSON by default', async () => {
      const result = await callTool<Page<Book>>(ctx, 'grimmory_get_shelf_books', {
        shelfId: '00000000-0000-0000-0000-000000000001',
      });
      expect(result.content).toBeDefined();
      expect(result.totalElements).toBe(1);
      expect(result.content[0].id).toBe(1);
    });

    it('returns books as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_get_shelf_books', {
        shelfId: '00000000-0000-0000-0000-000000000001',
        response_format: 'markdown',
      });
      expect(result).toContain('# Test Book');
      expect(result).toContain('Page 1 of 1');
    });

    it('calls the API with the correct shelf books path', async () => {
      await callTool(ctx, 'grimmory_get_shelf_books', {
        shelfId: '00000000-0000-0000-0000-000000000099',
      });

      expect(mockClient.get).toHaveBeenCalledWith('shelves/00000000-0000-0000-0000-000000000099/books', {
        page: 0,
        size: 20,
      });
    });

    it('passes pagination params to the API', async () => {
      await callTool(ctx, 'grimmory_get_shelf_books', {
        shelfId: '00000000-0000-0000-0000-000000000001',
        page: 1,
        size: 5,
        sort: 'title',
        dir: 'desc',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'shelves/00000000-0000-0000-0000-000000000001/books',
        {
          page: 1,
          size: 5,
          sort: 'title',
          dir: 'desc',
        },
      );
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            getShelfBooks: { success: false, error: 'Shelf not found', isError: true },
          });
          registerShelfTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_get_shelf_books',
          arguments: { shelfId: '00000000-0000-0000-0000-000000000099' },
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('Shelf not found');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });
});
