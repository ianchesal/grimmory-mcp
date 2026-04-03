/**
 * Tests for Author tools (grimmory_list_authors, grimmory_get_author).
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTestMCPContext, cleanupMCPContext, callTool, listTools, type TestMCPContext } from './helpers/mcp-helpers.js';
import { createMockAuthorSummary, createMockAuthorDetails, createMockPage } from './helpers/factories.js';
import { registerAuthorTools } from '../src/tools/authors.js';
import { ResponseFormatter } from '../src/services/response-formatter.js';
import type { GrimmoryClient } from '../src/services/grimmory-client.js';
import type { ApiResponse, Page } from '../src/services/grimmory-client.js';
import type { Author } from '../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockClient(overrides?: {
  listAuthors?: ApiResponse<Page<Author>>;
  getAuthor?: ApiResponse<Author>;
}): GrimmoryClient {
  const defaultAuthor = createMockAuthorSummary();
  const defaultPage = createMockPage([defaultAuthor], {
    totalElements: 1,
    totalPages: 1,
  });

  const mockListAuthors = overrides?.listAuthors ?? { success: true, data: defaultPage };
  const mockGetAuthor = overrides?.getAuthor ?? { success: true, data: createMockAuthorDetails() };

  return {
    get: vi.fn(<T>(path: string) => {
      if (path.startsWith('authors/') && !path.includes('page') && !path.includes('size')) {
        return Promise.resolve(mockGetAuthor) as Promise<ApiResponse<T>>;
      }
      return Promise.resolve(mockListAuthors) as Promise<ApiResponse<T>>;
    }),
  } as unknown as GrimmoryClient;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Author Tools', () => {
  const formatter = new ResponseFormatter();
  let ctx: TestMCPContext;
  let mockClient: GrimmoryClient;

  beforeAll(async () => {
    mockClient = createMockClient();
    ctx = await createTestMCPContext({
      setup: (server) => {
        registerAuthorTools(server, mockClient, formatter);
      },
    });
  });

  afterAll(async () => {
    await cleanupMCPContext(ctx);
  });

  // -- Registration ----------------------------------------------------------

  describe('tool registration', () => {
    it('registers both author tools', async () => {
      const tools = await listTools(ctx);
      const names = tools.map((t) => t.name);
      expect(names).toContain('grimmory_list_authors');
      expect(names).toContain('grimmory_get_author');
    });

    it('grimmory_list_authors has a description', async () => {
      const tools = await listTools(ctx);
      const listTool = tools.find((t) => t.name === 'grimmory_list_authors');
      expect(listTool?.description).toContain('List authors');
    });

    it('grimmory_get_author has a description', async () => {
      const tools = await listTools(ctx);
      const getTool = tools.find((t) => t.name === 'grimmory_get_author');
      expect(getTool?.description).toContain('Get detailed information');
    });
  });

  // -- grimmory_list_authors -------------------------------------------------

  describe('grimmory_list_authors', () => {
    it('returns authors as JSON by default', async () => {
      const result = await callTool<Page<Author>>(ctx, 'grimmory_list_authors');
      expect(result.content).toBeDefined();
      expect(result.totalElements).toBe(1);
      expect(result.content[0].id).toBe(1);
    });

    it('returns authors as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_list_authors', {
        response_format: 'markdown',
      });
      expect(result).toContain('# Test Author');
      expect(result).toContain('Page 1 of 1');
    });

    it('passes pagination params to the API', async () => {
      await callTool(ctx, 'grimmory_list_authors', {
        page: 2,
        size: 10,
        sort: 'name',
        dir: 'asc',
      });

      expect(mockClient.get).toHaveBeenCalledWith('authors', {
        page: 2,
        size: 10,
        sort: 'name',
        dir: 'asc',
      });
    });

    it('passes search param to the API', async () => {
      await callTool(ctx, 'grimmory_list_authors', {
        search: 'tolkien',
      });

      expect(mockClient.get).toHaveBeenCalledWith('authors', expect.objectContaining({
        search: 'tolkien',
      }));
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            listAuthors: { success: false, error: 'Not found', isError: true },
          });
          registerAuthorTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_list_authors',
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

  // -- grimmory_get_author ---------------------------------------------------

  describe('grimmory_get_author', () => {
    it('returns a single author as JSON by default', async () => {
      const result = await callTool<Author>(ctx, 'grimmory_get_author', {
        authorId: '00000000-0000-0000-0000-000000000001',
      });
      expect(result.id).toBe(1);
      expect(result.name).toBe('Test Author');
    });

    it('returns a single author as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_get_author', {
        authorId: '00000000-0000-0000-0000-000000000001',
        response_format: 'markdown',
      });
      expect(result).toContain('# Test Author');
    });

    it('calls the API with the correct author path', async () => {
      await callTool(ctx, 'grimmory_get_author', {
        authorId: '00000000-0000-0000-0000-000000000099',
      });

      expect(mockClient.get).toHaveBeenCalledWith('authors/00000000-0000-0000-0000-000000000099');
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            getAuthor: { success: false, error: 'Author not found', isError: true },
          });
          registerAuthorTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_get_author',
          arguments: { authorId: '00000000-0000-0000-0000-000000000099' },
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('Author not found');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });
});
