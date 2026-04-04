/**
 * Tests for Author tools.
 *
 * Existing: grimmory_list_authors, grimmory_get_author
 * New (Wave 2): 11 additional author tools
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTestMCPContext, cleanupMCPContext, callTool, listTools, type TestMCPContext } from './helpers/mcp-helpers.js';
import { createMockAuthorSummary, createMockAuthorDetails, createMockPage } from './helpers/factories.js';
import { registerAuthorTools } from '../src/tools/authors.js';
import { ResponseFormatter } from '../src/services/response-formatter.js';
import type { GrimmoryClient } from '../src/services/grimmory-client.js';
import type { ApiResponse, Page } from '../src/services/grimmory-client.js';
import type { Author, AuthorSearchResult } from '../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AUTHOR_ID = '00000000-0000-0000-0000-000000000001';
const BOOK_ID = '00000000-0000-0000-0000-000000000002';

function createMockClient(overrides?: {
  listAuthors?: ApiResponse<Page<Author>>;
  getAuthor?: ApiResponse<Author>;
  findAuthorByName?: ApiResponse<Author>;
  getBookAuthors?: ApiResponse<Page<Author>>;
  updateAuthor?: ApiResponse<Author>;
  searchAuthorMetadata?: ApiResponse<AuthorSearchResult[]>;
  matchAuthor?: ApiResponse<unknown>;
  quickMatchAuthor?: ApiResponse<unknown>;
  unmatchAuthors?: ApiResponse<unknown>;
  searchAuthorPhotos?: ApiResponse<AuthorSearchResult[]>;
  setAuthorPhotoUrl?: ApiResponse<unknown>;
  deleteAuthors?: ApiResponse<unknown>;
  autoMatchAuthors?: ApiResponse<unknown>;
}): GrimmoryClient {
  const defaultAuthor = createMockAuthorSummary();
  const defaultPage = createMockPage([defaultAuthor], {
    totalElements: 1,
    totalPages: 1,
  });

  const mockListAuthors = overrides?.listAuthors ?? { success: true, data: defaultPage };
  const mockGetAuthor = overrides?.getAuthor ?? { success: true, data: createMockAuthorDetails() };

  const getMock = vi.fn(<T>(path: string, params?: Record<string, unknown>) => {
    if (path === 'authors/by-name') {
      return Promise.resolve(overrides?.findAuthorByName ?? { success: true, data: createMockAuthorDetails() }) as Promise<ApiResponse<T>>;
    }
    if (path.startsWith('authors/book/')) {
      return Promise.resolve(overrides?.getBookAuthors ?? { success: true, data: defaultPage }) as Promise<ApiResponse<T>>;
    }
    if (path.match(/^authors\/[^/]+\/search-metadata$/)) {
      return Promise.resolve(overrides?.searchAuthorMetadata ?? { success: true, data: [{ provider: 'google', name: 'Test Author' }] }) as Promise<ApiResponse<T>>;
    }
    if (path.match(/^authors\/[^/]+\/search-photos$/)) {
      return Promise.resolve(overrides?.searchAuthorPhotos ?? { success: true, data: [{ url: 'https://example.com/photo.jpg' }] }) as Promise<ApiResponse<T>>;
    }
    if (path.startsWith('authors/') && !path.includes('page') && !path.includes('size')) {
      return Promise.resolve(mockGetAuthor) as Promise<ApiResponse<T>>;
    }
    return Promise.resolve(mockListAuthors) as Promise<ApiResponse<T>>;
  });

  const postMock = vi.fn(<T>(path: string, body: unknown) => {
    if (path.match(/^authors\/[^/]+\/match$/)) {
      return Promise.resolve(overrides?.matchAuthor ?? { success: true, data: { matched: true } }) as Promise<ApiResponse<T>>;
    }
    if (path.match(/^authors\/[^/]+\/quick-match$/)) {
      return Promise.resolve(overrides?.quickMatchAuthor ?? { success: true, data: { matched: true } }) as Promise<ApiResponse<T>>;
    }
    if (path === 'authors/unmatch') {
      return Promise.resolve(overrides?.unmatchAuthors ?? { success: true, data: { unmatched: true } }) as Promise<ApiResponse<T>>;
    }
    if (path.match(/^authors\/[^/]+\/photo\/url$/)) {
      return Promise.resolve(overrides?.setAuthorPhotoUrl ?? { success: true, data: { photoSet: true } }) as Promise<ApiResponse<T>>;
    }
    if (path === 'authors/auto-match') {
      return Promise.resolve(overrides?.autoMatchAuthors ?? { success: true, data: { autoMatched: 3 } }) as Promise<ApiResponse<T>>;
    }
    return Promise.resolve({ success: true, data: {} }) as Promise<ApiResponse<T>>;
  });

  const putMock = vi.fn(<T>(path: string, body: unknown) => {
    return Promise.resolve(overrides?.updateAuthor ?? { success: true, data: createMockAuthorDetails() }) as Promise<ApiResponse<T>>;
  });

  const deleteMock = vi.fn(<T>(path: string, body?: unknown) => {
    return Promise.resolve(overrides?.deleteAuthors ?? { success: true, data: { deleted: true } }) as Promise<ApiResponse<T>>;
  });

  return {
    get: getMock,
    post: postMock,
    put: putMock,
    delete: deleteMock,
    ssePost: vi.fn(<T>(path: string, body: unknown) => {
      if (path === 'authors/auto-match') {
        return Promise.resolve(overrides?.autoMatchAuthors ?? { success: true, data: { autoMatched: 3 } }) as Promise<ApiResponse<T[]>>;
      }
      return Promise.resolve({ success: true, data: [] }) as Promise<ApiResponse<T[]>>;
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
    it('registers all author tools', async () => {
      const tools = await listTools(ctx);
      const names = tools.map((t) => t.name);
      const expectedTools = [
        'grimmory_list_authors',
        'grimmory_get_author',
        'grimmory_find_author_by_name',
        'grimmory_get_book_authors',
        'grimmory_update_author',
        'grimmory_search_author_metadata',
        'grimmory_match_author',
        'grimmory_quick_match_author',
        'grimmory_unmatch_authors',
        'grimmory_search_author_photos',
        'grimmory_set_author_photo_url',
        'grimmory_delete_authors',
        'grimmory_auto_match_authors',
      ];
      for (const tool of expectedTools) {
        expect(names).toContain(tool);
      }
    });

    it('grimmory_find_author_by_name has a description mentioning name search', async () => {
      const tools = await listTools(ctx);
      const tool = tools.find((t) => t.name === 'grimmory_find_author_by_name');
      expect(tool?.description).toContain('name');
    });

    it('grimmory_search_author_metadata has a description mentioning external API', async () => {
      const tools = await listTools(ctx);
      const tool = tools.find((t) => t.name === 'grimmory_search_author_metadata');
      expect(tool?.description).toContain('metadata');
    });

    it('grimmory_unmatch_authors has a description mentioning unmatching', async () => {
      const tools = await listTools(ctx);
      const tool = tools.find((t) => t.name === 'grimmory_unmatch_authors');
      expect(tool?.description).toContain('Remove');
    });

    it('grimmory_auto_match_authors has a description mentioning automatic matching', async () => {
      const tools = await listTools(ctx);
      const tool = tools.find((t) => t.name === 'grimmory_auto_match_authors');
      expect(tool?.description).toContain('auto');
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
        authorId: AUTHOR_ID,
      });
      expect(result.id).toBe(1);
      expect(result.name).toBe('Test Author');
    });

    it('returns a single author as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_get_author', {
        authorId: AUTHOR_ID,
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

  // =========================================================================
  // New Wave 2 tools
  // =========================================================================

  // -- grimmory_find_author_by_name ------------------------------------------

  describe('grimmory_find_author_by_name', () => {
    it('returns an author as JSON by default', async () => {
      const result = await callTool<Author>(ctx, 'grimmory_find_author_by_name', {
        name: 'Test Author',
      });
      expect(result.id).toBe(1);
      expect(result.name).toBe('Test Author');
    });

    it('returns an author as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_find_author_by_name', {
        name: 'Test Author',
        response_format: 'markdown',
      });
      expect(result).toContain('# Test Author');
    });

    it('calls the API with correct path and name param', async () => {
      await callTool(ctx, 'grimmory_find_author_by_name', { name: 'Tolkien' });
      expect(mockClient.get).toHaveBeenCalledWith('authors/by-name', { name: 'Tolkien' });
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            findAuthorByName: { success: false, error: 'Author not found by name', isError: true },
          });
          registerAuthorTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_find_author_by_name',
          arguments: { name: 'Nonexistent' },
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('Author not found by name');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_get_book_authors ---------------------------------------------

  describe('grimmory_get_book_authors', () => {
    it('returns authors as JSON by default', async () => {
      const result = await callTool<Page<Author>>(ctx, 'grimmory_get_book_authors', {
        bookId: BOOK_ID,
      });
      expect(result.content).toBeDefined();
      expect(result.content[0].id).toBe(1);
    });

    it('returns authors as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_get_book_authors', {
        bookId: BOOK_ID,
        response_format: 'markdown',
      });
      expect(result).toContain('# Test Author');
    });

    it('calls the API with correct path', async () => {
      await callTool(ctx, 'grimmory_get_book_authors', { bookId: BOOK_ID });
      expect(mockClient.get).toHaveBeenCalledWith(`authors/book/${BOOK_ID}`);
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            getBookAuthors: { success: false, error: 'Book not found', isError: true },
          });
          registerAuthorTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_get_book_authors',
          arguments: { bookId: BOOK_ID },
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

  // -- grimmory_update_author ------------------------------------------------

  describe('grimmory_update_author', () => {
    it('returns updated author as JSON by default', async () => {
      const result = await callTool<Author>(ctx, 'grimmory_update_author', {
        authorId: AUTHOR_ID,
        name: 'Updated Name',
      });
      expect(result.id).toBe(1);
      expect(result.name).toBe('Test Author');
    });

    it('returns updated author as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_update_author', {
        authorId: AUTHOR_ID,
        name: 'Updated Name',
        response_format: 'markdown',
      });
      expect(result).toContain('# Test Author');
    });

    it('calls PUT with correct path and body', async () => {
      await callTool(ctx, 'grimmory_update_author', {
        authorId: AUTHOR_ID,
        name: 'New Name',
        description: 'New bio',
      });
      expect(mockClient.put).toHaveBeenCalledWith(`authors/${AUTHOR_ID}`, {
        name: 'New Name',
        description: 'New bio',
      });
    });

    it('only includes provided fields in body', async () => {
      await callTool(ctx, 'grimmory_update_author', {
        authorId: AUTHOR_ID,
        name: 'Just Name',
      });
      expect(mockClient.put).toHaveBeenCalledWith(`authors/${AUTHOR_ID}`, {
        name: 'Just Name',
      });
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            updateAuthor: { success: false, error: 'Update failed', isError: true },
          });
          registerAuthorTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_update_author',
          arguments: { authorId: AUTHOR_ID, name: 'X' },
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('Update failed');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_search_author_metadata ---------------------------------------

  describe('grimmory_search_author_metadata', () => {
    it('returns metadata results as JSON by default', async () => {
      const result = await callTool<AuthorSearchResult[]>(ctx, 'grimmory_search_author_metadata', {
        authorId: AUTHOR_ID,
      });
      expect(result).toHaveLength(1);
      expect(result[0].provider).toBe('google');
    });

    it('returns metadata results as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_search_author_metadata', {
        authorId: AUTHOR_ID,
        response_format: 'markdown',
      });
      expect(result).toContain('google');
    });

    it('calls the API with correct path and optional query', async () => {
      await callTool(ctx, 'grimmory_search_author_metadata', {
        authorId: AUTHOR_ID,
        query: 'test',
      });
      expect(mockClient.get).toHaveBeenCalledWith(`authors/${AUTHOR_ID}/search-metadata`, { query: 'test' });
    });

    it('calls the API without query when not provided', async () => {
      await callTool(ctx, 'grimmory_search_author_metadata', {
        authorId: AUTHOR_ID,
      });
      expect(mockClient.get).toHaveBeenCalledWith(`authors/${AUTHOR_ID}/search-metadata`, {});
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            searchAuthorMetadata: { success: false, error: 'Search failed', isError: true },
          });
          registerAuthorTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_search_author_metadata',
          arguments: { authorId: AUTHOR_ID },
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('Search failed');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_match_author -------------------------------------------------

  describe('grimmory_match_author', () => {
    it('returns match result as JSON by default', async () => {
      const result = await callTool<{ matched: boolean }>(ctx, 'grimmory_match_author', {
        authorId: AUTHOR_ID,
        provider: 'google',
        providerItemId: 'abc123',
      });
      expect(result.matched).toBe(true);
    });

    it('returns match result as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_match_author', {
        authorId: AUTHOR_ID,
        provider: 'google',
        providerItemId: 'abc123',
        response_format: 'markdown',
      });
      expect(result).toContain('matched');
    });

    it('calls POST with correct path and body', async () => {
      await callTool(ctx, 'grimmory_match_author', {
        authorId: AUTHOR_ID,
        provider: 'goodreads',
        providerItemId: 'gr-456',
      });
      expect(mockClient.post).toHaveBeenCalledWith(`authors/${AUTHOR_ID}/match`, {
        provider: 'goodreads',
        providerItemId: 'gr-456',
      });
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            matchAuthor: { success: false, error: 'Match failed', isError: true },
          });
          registerAuthorTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_match_author',
          arguments: { authorId: AUTHOR_ID, provider: 'google', providerItemId: 'abc' },
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('Match failed');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_quick_match_author -------------------------------------------

  describe('grimmory_quick_match_author', () => {
    it('returns match result as JSON by default', async () => {
      const result = await callTool<{ matched: boolean }>(ctx, 'grimmory_quick_match_author', {
        authorId: AUTHOR_ID,
      });
      expect(result.matched).toBe(true);
    });

    it('returns match result as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_quick_match_author', {
        authorId: AUTHOR_ID,
        response_format: 'markdown',
      });
      expect(result).toContain('matched');
    });

    it('calls POST with correct path', async () => {
      await callTool(ctx, 'grimmory_quick_match_author', { authorId: AUTHOR_ID });
      expect(mockClient.post).toHaveBeenCalledWith(`authors/${AUTHOR_ID}/quick-match`, {});
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            quickMatchAuthor: { success: false, error: 'Quick match failed', isError: true },
          });
          registerAuthorTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_quick_match_author',
          arguments: { authorId: AUTHOR_ID },
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('Quick match failed');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_unmatch_authors ----------------------------------------------

  describe('grimmory_unmatch_authors', () => {
    it('returns unmatch result as JSON by default', async () => {
      const result = await callTool<{ unmatched: boolean }>(ctx, 'grimmory_unmatch_authors', {
        authorIds: [AUTHOR_ID],
      });
      expect(result.unmatched).toBe(true);
    });

    it('returns unmatch result as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_unmatch_authors', {
        authorIds: [AUTHOR_ID],
        response_format: 'markdown',
      });
      expect(result).toContain('unmatched');
    });

    it('calls POST with correct path and body', async () => {
      await callTool(ctx, 'grimmory_unmatch_authors', {
        authorIds: [AUTHOR_ID, '00000000-0000-0000-0000-000000000003'],
      });
      expect(mockClient.post).toHaveBeenCalledWith('authors/unmatch', {
        authorIds: [AUTHOR_ID, '00000000-0000-0000-0000-000000000003'],
      });
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            unmatchAuthors: { success: false, error: 'Unmatch failed', isError: true },
          });
          registerAuthorTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_unmatch_authors',
          arguments: { authorIds: [AUTHOR_ID] },
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('Unmatch failed');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_search_author_photos -----------------------------------------

  describe('grimmory_search_author_photos', () => {
    it('returns photo results as JSON by default', async () => {
      const result = await callTool<AuthorSearchResult[]>(ctx, 'grimmory_search_author_photos', {
        authorId: AUTHOR_ID,
      });
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://example.com/photo.jpg');
    });

    it('returns photo results as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_search_author_photos', {
        authorId: AUTHOR_ID,
        response_format: 'markdown',
      });
      expect(result).toContain('https://example.com/photo.jpg');
    });

    it('calls the API with correct path and optional query', async () => {
      await callTool(ctx, 'grimmory_search_author_photos', {
        authorId: AUTHOR_ID,
        query: 'portrait',
      });
      expect(mockClient.get).toHaveBeenCalledWith(`authors/${AUTHOR_ID}/search-photos`, { query: 'portrait' });
    });

    it('calls the API without query when not provided', async () => {
      await callTool(ctx, 'grimmory_search_author_photos', { authorId: AUTHOR_ID });
      expect(mockClient.get).toHaveBeenCalledWith(`authors/${AUTHOR_ID}/search-photos`, {});
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            searchAuthorPhotos: { success: false, error: 'Photo search failed', isError: true },
          });
          registerAuthorTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_search_author_photos',
          arguments: { authorId: AUTHOR_ID },
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('Photo search failed');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_set_author_photo_url -----------------------------------------

  describe('grimmory_set_author_photo_url', () => {
    it('returns result as JSON by default', async () => {
      const result = await callTool<{ photoSet: boolean }>(ctx, 'grimmory_set_author_photo_url', {
        authorId: AUTHOR_ID,
        url: 'https://example.com/photo.jpg',
      });
      expect(result.photoSet).toBe(true);
    });

    it('returns result as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_set_author_photo_url', {
        authorId: AUTHOR_ID,
        url: 'https://example.com/photo.jpg',
        response_format: 'markdown',
      });
      expect(result).toContain('photoSet');
    });

    it('calls POST with correct path and body', async () => {
      await callTool(ctx, 'grimmory_set_author_photo_url', {
        authorId: AUTHOR_ID,
        url: 'https://example.com/new-photo.jpg',
      });
      expect(mockClient.post).toHaveBeenCalledWith(`authors/${AUTHOR_ID}/photo/url`, {
        url: 'https://example.com/new-photo.jpg',
      });
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            setAuthorPhotoUrl: { success: false, error: 'Photo set failed', isError: true },
          });
          registerAuthorTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_set_author_photo_url',
          arguments: { authorId: AUTHOR_ID, url: 'https://example.com/photo.jpg' },
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('Photo set failed');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_delete_authors -----------------------------------------------

  describe('grimmory_delete_authors', () => {
    it('returns result as JSON by default', async () => {
      const result = await callTool<{ deleted: boolean }>(ctx, 'grimmory_delete_authors', {
        authorIds: [AUTHOR_ID],
      });
      expect(result.deleted).toBe(true);
    });

    it('returns result as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_delete_authors', {
        authorIds: [AUTHOR_ID],
        response_format: 'markdown',
      });
      expect(result).toContain('deleted');
    });

    it('calls DELETE with correct path and body', async () => {
      await callTool(ctx, 'grimmory_delete_authors', {
        authorIds: [AUTHOR_ID, '00000000-0000-0000-0000-000000000003'],
      });
      expect(mockClient.delete).toHaveBeenCalledWith('authors', {
        authorIds: [AUTHOR_ID, '00000000-0000-0000-0000-000000000003'],
      });
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            deleteAuthors: { success: false, error: 'Delete failed', isError: true },
          });
          registerAuthorTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_delete_authors',
          arguments: { authorIds: [AUTHOR_ID] },
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('Delete failed');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_auto_match_authors -------------------------------------------

  describe('grimmory_auto_match_authors', () => {
    it('returns result as JSON by default', async () => {
      const result = await callTool<{ autoMatched: number }>(ctx, 'grimmory_auto_match_authors');
      expect(result.autoMatched).toBe(3);
    });

    it('returns result as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_auto_match_authors', {
        response_format: 'markdown',
      });
      expect(result).toContain('autoMatched');
    });

    it('calls POST with correct path', async () => {
      await callTool(ctx, 'grimmory_auto_match_authors');
      expect(mockClient.ssePost).toHaveBeenCalledWith('authors/auto-match', {});
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            autoMatchAuthors: { success: false, error: 'Auto-match failed', isError: true },
          });
          registerAuthorTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_auto_match_authors',
          arguments: {},
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('Auto-match failed');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });
});
