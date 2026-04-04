/**
 * Tests for Metadata tools (grimmory_lookup_isbn + 13 new tools).
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTestMCPContext, cleanupMCPContext, callTool, listTools, type TestMCPContext } from './helpers/mcp-helpers.js';
import { createMockBookMetadata } from './helpers/factories.js';
import { registerMetadataTools } from '../src/tools/metadata.js';
import { ResponseFormatter } from '../src/services/response-formatter.js';
import type { GrimmoryClient } from '../src/services/grimmory-client.js';
import type { ApiResponse } from '../src/services/grimmory-client.js';
import type { BookMetadata } from '../src/types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BOOK_ID = '11111111-1111-1111-1111-111111111111';
const BOOK_ID_2 = '22222222-2222-2222-2222-222222222222';
const ISBN = '9781234567890';
const ISBN_2 = '9780987654321';

const ALL_METADATA_TOOLS = [
  'grimmory_lookup_isbn',
  'grimmory_update_book_metadata',
  'grimmory_get_file_metadata',
  'grimmory_get_comic_info',
  'grimmory_bulk_edit_metadata',
  'grimmory_toggle_all_locks',
  'grimmory_toggle_field_locks',
  'grimmory_recalculate_match_scores',
  'grimmory_batch_isbn_lookup',
  'grimmory_get_provider_metadata',
  'grimmory_get_lock_fields',
  'grimmory_consolidate_metadata',
  'grimmory_delete_metadata_values',
  'grimmory_prospective_metadata',
] as const;

const DESTRUCTIVE_TOOLS = [
  'grimmory_bulk_edit_metadata',
  'grimmory_consolidate_metadata',
  'grimmory_delete_metadata_values',
] as const;

const EXTERNAL_API_TOOLS = [
  'grimmory_lookup_isbn',
  'grimmory_batch_isbn_lookup',
  'grimmory_get_provider_metadata',
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockClient(overrides?: {
  lookupIsbn?: ApiResponse<BookMetadata>;
  updateBookMetadata?: ApiResponse<unknown>;
  getFileMetadata?: ApiResponse<unknown>;
  getComicInfo?: ApiResponse<unknown>;
  bulkEditMetadata?: ApiResponse<unknown>;
  toggleAllLocks?: ApiResponse<unknown>;
  toggleFieldLocks?: ApiResponse<unknown>;
  recalcMatchScores?: ApiResponse<unknown>;
  batchIsbnLookup?: ApiResponse<unknown>;
  getProviderMetadata?: ApiResponse<unknown>;
  getLockFields?: ApiResponse<unknown>;
  consolidateMetadata?: ApiResponse<unknown>;
  deleteMetadataValues?: ApiResponse<unknown>;
  prospectiveMetadata?: ApiResponse<unknown>;
}): GrimmoryClient {
  const defaultMetadata = createMockBookMetadata();
  const mockLookup = overrides?.lookupIsbn ?? { success: true, data: defaultMetadata };
  const mockUpdateBook = overrides?.updateBookMetadata ?? { success: true, data: { updated: true } };
  const mockFileMetadata = overrides?.getFileMetadata ?? { success: true, data: { format: 'EPUB', fileSize: 1024 } };
  const mockComicInfo = overrides?.getComicInfo ?? { success: true, data: { Title: 'Test Comic', Writer: 'Test Writer' } };
  const mockBulkEdit = overrides?.bulkEditMetadata ?? { success: true, data: { updated: 2 } };
  const mockToggleAll = overrides?.toggleAllLocks ?? { success: true, data: { locked: true } };
  const mockToggleField = overrides?.toggleFieldLocks ?? { success: true, data: { fields: ['title', 'author'], locked: false } };
  const mockRecalc = overrides?.recalcMatchScores ?? { success: true, data: { recalculated: true } };
  const mockBatchIsbn = overrides?.batchIsbnLookup ?? { success: true, data: [{ isbn: ISBN, title: 'Test Book' }] };
  const mockProviderMeta = overrides?.getProviderMetadata ?? { success: true, data: { provider: 'google-books', title: 'Test' } };
  const mockLockFields = overrides?.getLockFields ?? { success: true, data: ['title', 'author', 'isbn'] };
  const mockConsolidate = overrides?.consolidateMetadata ?? { success: true, data: { consolidated: 5 } };
  const mockDeleteMeta = overrides?.deleteMetadataValues ?? { success: true, data: { deleted: true } };
  const mockProspective = overrides?.prospectiveMetadata ?? { success: true, data: [{ provider: 'google', score: 0.95, title: 'Test' }] };

  return {
    get: vi.fn(<T>(path: string) => {
      if (path.startsWith('metadata/isbn/')) {
        return Promise.resolve(mockLookup) as Promise<ApiResponse<T>>;
      }
      if (path.match(/^books\/[^/]+\/file-metadata$/)) {
        return Promise.resolve(mockFileMetadata) as Promise<ApiResponse<T>>;
      }
      if (path.match(/^books\/[^/]+\/cbx\/metadata\/comicinfo$/)) {
        return Promise.resolve(mockComicInfo) as Promise<ApiResponse<T>>;
      }
      if (path.match(/^books\/metadata\/detail\/[^/]+\/[^/]+$/)) {
        return Promise.resolve(mockProviderMeta) as Promise<ApiResponse<T>>;
      }
      if (path === 'books/metadata/lock-fields') {
        return Promise.resolve(mockLockFields) as Promise<ApiResponse<T>>;
      }
      if (path.match(/^books\/[^/]+\/metadata\/prospective$/)) {
        return Promise.resolve(mockProspective) as Promise<ApiResponse<T>>;
      }
      return Promise.resolve({ success: false, error: 'Not found', isError: true }) as Promise<ApiResponse<T>>;
    }),
    put: vi.fn(<T>(path: string, body: unknown) => {
      if (path.match(/^books\/[^/]+\/metadata$/)) {
        return Promise.resolve(mockUpdateBook) as Promise<ApiResponse<T>>;
      }
      if (path === 'books/bulk-edit-metadata') {
        return Promise.resolve(mockBulkEdit) as Promise<ApiResponse<T>>;
      }
      if (path === 'books/metadata/toggle-all-lock') {
        return Promise.resolve(mockToggleAll) as Promise<ApiResponse<T>>;
      }
      if (path === 'books/metadata/toggle-field-locks') {
        return Promise.resolve(mockToggleField) as Promise<ApiResponse<T>>;
      }
      return Promise.resolve({ success: false, error: 'Not found', isError: true }) as Promise<ApiResponse<T>>;
    }),
    post: vi.fn(<T>(path: string, body: unknown) => {
      if (path === 'books/metadata/recalculate-match-scores') {
        return Promise.resolve(mockRecalc) as Promise<ApiResponse<T>>;
      }
      if (path === 'books/metadata/isbn-lookup') {
        return Promise.resolve(mockBatchIsbn) as Promise<ApiResponse<T>>;
      }
      if (path === 'metadata/manage/consolidate') {
        return Promise.resolve(mockConsolidate) as Promise<ApiResponse<T>>;
      }
      if (path === 'metadata/manage/delete') {
        return Promise.resolve(mockDeleteMeta) as Promise<ApiResponse<T>>;
      }
      return Promise.resolve({ success: false, error: 'Not found', isError: true }) as Promise<ApiResponse<T>>;
    }),
    sseGet: vi.fn(<T>(path: string, params?: Record<string, unknown>) => {
      if (path.match(/^books\/[^/]+\/metadata\/prospective$/)) {
        return Promise.resolve(mockProspective) as Promise<ApiResponse<T[]>>;
      }
      return Promise.resolve({ success: false, error: 'Not found', isError: true }) as Promise<ApiResponse<T[]>>;
    }),
  } as unknown as GrimmoryClient;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Metadata Tools', () => {
  const formatter = new ResponseFormatter();
  let ctx: TestMCPContext;
  let mockClient: GrimmoryClient;

  beforeAll(async () => {
    mockClient = createMockClient();
    ctx = await createTestMCPContext({
      setup: (server) => {
        registerMetadataTools(server, mockClient, formatter);
      },
    });
  });

  afterAll(async () => {
    await cleanupMCPContext(ctx);
  });

  // -- Registration ----------------------------------------------------------

  describe('tool registration', () => {
    it('registers all 14 metadata tools', async () => {
      const tools = await listTools(ctx);
      const names = tools.map((t) => t.name);
      for (const toolName of ALL_METADATA_TOOLS) {
        expect(names).toContain(toolName);
      }
    });

    it('every tool has a description', async () => {
      const tools = await listTools(ctx);
      for (const toolName of ALL_METADATA_TOOLS) {
        const tool = tools.find((t) => t.name === toolName);
        expect(tool?.description).toBeTruthy();
        expect(tool!.description!.length).toBeGreaterThan(10);
      }
    });

    it('destructive tools have destructiveHint annotation', async () => {
      const rawTools = await ctx.client.listTools();
      for (const toolName of DESTRUCTIVE_TOOLS) {
        const tool = rawTools.tools.find((t) => t.name === toolName);
        expect(tool?.annotations?.destructiveHint).toBe(true);
      }
    });

    it('non-destructive tools do not have destructiveHint', async () => {
      const rawTools = await ctx.client.listTools();
      const nonDestructive = ALL_METADATA_TOOLS.filter(
        (t) => !(DESTRUCTIVE_TOOLS as readonly string[]).includes(t),
      );
      for (const toolName of nonDestructive) {
        const tool = rawTools.tools.find((t) => t.name === toolName);
        expect(tool?.annotations?.destructiveHint).toBe(false);
      }
    });

    it('external API tools have openWorldHint annotation', async () => {
      const rawTools = await ctx.client.listTools();
      for (const toolName of EXTERNAL_API_TOOLS) {
        const tool = rawTools.tools.find((t) => t.name === toolName);
        expect(tool?.annotations?.openWorldHint).toBe(true);
      }
    });

    it('non-external tools do not have openWorldHint', async () => {
      const rawTools = await ctx.client.listTools();
      const nonExternal = ALL_METADATA_TOOLS.filter(
        (t) => !(EXTERNAL_API_TOOLS as readonly string[]).includes(t),
      );
      for (const toolName of nonExternal) {
        const tool = rawTools.tools.find((t) => t.name === toolName);
        expect(tool?.annotations?.openWorldHint).toBe(false);
      }
    });
  });

  // -- grimmory_lookup_isbn --------------------------------------------------

  describe('grimmory_lookup_isbn', () => {
    it('returns metadata as JSON by default', async () => {
      const result = await callTool<BookMetadata>(ctx, 'grimmory_lookup_isbn', {
        isbn: ISBN,
      });
      expect(result.bookId).toBe(1);
      expect(result.title).toBe('Test Book');
      expect(result.isbn13).toBe(ISBN);
    });

    it('returns metadata as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_lookup_isbn', {
        isbn: ISBN,
        response_format: 'markdown',
      });
      expect(result).toContain('# Test Book');
    });

    it('calls the API with the correct ISBN path', async () => {
      await callTool(ctx, 'grimmory_lookup_isbn', {
        isbn: ISBN,
      });
      expect(mockClient.get).toHaveBeenCalledWith('metadata/isbn/9781234567890');
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            lookupIsbn: { success: false, error: 'ISBN not found', isError: true },
          });
          registerMetadataTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_lookup_isbn',
          arguments: { isbn: '0000000000' },
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('ISBN not found');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_update_book_metadata ------------------------------------------

  describe('grimmory_update_book_metadata', () => {
    it('returns updated metadata as JSON', async () => {
      const result = await callTool<Record<string, unknown>>(ctx, 'grimmory_update_book_metadata', {
        bookId: BOOK_ID,
        metadata: { title: 'Updated Title' },
      });
      expect(result.updated).toBe(true);
    });

    it('calls PUT with correct path and body', async () => {
      const metadata = { title: 'Updated Title', author: 'New Author' };
      await callTool(ctx, 'grimmory_update_book_metadata', {
        bookId: BOOK_ID,
        metadata,
      });
      expect(mockClient.put).toHaveBeenCalledWith(`books/${BOOK_ID}/metadata`, metadata);
    });

    it('returns markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_update_book_metadata', {
        bookId: BOOK_ID,
        metadata: { title: 'Updated' },
        response_format: 'markdown',
      });
      expect(result).toContain('#');
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            updateBookMetadata: { success: false, error: 'Book not found', isError: true },
          });
          registerMetadataTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_update_book_metadata',
          arguments: { bookId: BOOK_ID, metadata: { title: 'X' } },
        });
        expect(result.isError).toBe(true);
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_get_file_metadata ---------------------------------------------

  describe('grimmory_get_file_metadata', () => {
    it('returns file metadata as JSON', async () => {
      const result = await callTool<Record<string, unknown>>(ctx, 'grimmory_get_file_metadata', {
        bookId: BOOK_ID,
      });
      expect(result.format).toBe('EPUB');
    });

    it('calls GET with correct path', async () => {
      await callTool(ctx, 'grimmory_get_file_metadata', {
        bookId: BOOK_ID,
      });
      expect(mockClient.get).toHaveBeenCalledWith(`books/${BOOK_ID}/file-metadata`);
    });

    it('returns markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_get_file_metadata', {
        bookId: BOOK_ID,
        response_format: 'markdown',
      });
      expect(result).toContain('#');
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            getFileMetadata: { success: false, error: 'No file metadata', isError: true },
          });
          registerMetadataTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_get_file_metadata',
          arguments: { bookId: BOOK_ID },
        });
        expect(result.isError).toBe(true);
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_get_comic_info ------------------------------------------------

  describe('grimmory_get_comic_info', () => {
    it('returns comic info as JSON', async () => {
      const result = await callTool<Record<string, unknown>>(ctx, 'grimmory_get_comic_info', {
        bookId: BOOK_ID,
      });
      expect(result.Title).toBe('Test Comic');
      expect(result.Writer).toBe('Test Writer');
    });

    it('calls GET with correct path', async () => {
      await callTool(ctx, 'grimmory_get_comic_info', {
        bookId: BOOK_ID,
      });
      expect(mockClient.get).toHaveBeenCalledWith(`books/${BOOK_ID}/cbx/metadata/comicinfo`);
    });

    it('returns markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_get_comic_info', {
        bookId: BOOK_ID,
        response_format: 'markdown',
      });
      expect(result).toContain('#');
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            getComicInfo: { success: false, error: 'Not a comic', isError: true },
          });
          registerMetadataTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_get_comic_info',
          arguments: { bookId: BOOK_ID },
        });
        expect(result.isError).toBe(true);
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_bulk_edit_metadata --------------------------------------------

  describe('grimmory_bulk_edit_metadata', () => {
    it('returns bulk edit result as JSON', async () => {
      const result = await callTool<Record<string, unknown>>(ctx, 'grimmory_bulk_edit_metadata', {
        bookIds: [BOOK_ID, BOOK_ID_2],
        metadata: { tags: ['batch-update'] },
      });
      expect(result.updated).toBe(2);
    });

    it('calls PUT with correct path and body', async () => {
      const metadata = { tags: ['batch'] };
      await callTool(ctx, 'grimmory_bulk_edit_metadata', {
        bookIds: [BOOK_ID, BOOK_ID_2],
        metadata,
      });
      expect(mockClient.put).toHaveBeenCalledWith('books/bulk-edit-metadata', {
        bookIds: [BOOK_ID, BOOK_ID_2],
        metadata,
      });
    });

    it('returns markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_bulk_edit_metadata', {
        bookIds: [BOOK_ID],
        metadata: { tags: ['x'] },
        response_format: 'markdown',
      });
      expect(result).toContain('#');
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            bulkEditMetadata: { success: false, error: 'Batch update failed', isError: true },
          });
          registerMetadataTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_bulk_edit_metadata',
          arguments: { bookIds: [BOOK_ID], metadata: {} },
        });
        expect(result.isError).toBe(true);
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_toggle_all_locks ----------------------------------------------

  describe('grimmory_toggle_all_locks', () => {
    it('returns toggle result as JSON', async () => {
      const result = await callTool<Record<string, unknown>>(ctx, 'grimmory_toggle_all_locks', {
        locked: true,
      });
      expect(result.locked).toBe(true);
    });

    it('calls PUT with correct path and body', async () => {
      await callTool(ctx, 'grimmory_toggle_all_locks', {
        locked: false,
      });
      expect(mockClient.put).toHaveBeenCalledWith('books/metadata/toggle-all-lock', {
        locked: false,
      });
    });

    it('returns markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_toggle_all_locks', {
        locked: true,
        response_format: 'markdown',
      });
      expect(result).toContain('#');
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            toggleAllLocks: { success: false, error: 'Lock toggle failed', isError: true },
          });
          registerMetadataTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_toggle_all_locks',
          arguments: { locked: true },
        });
        expect(result.isError).toBe(true);
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_toggle_field_locks --------------------------------------------

  describe('grimmory_toggle_field_locks', () => {
    it('returns toggle result as JSON', async () => {
      const result = await callTool<Record<string, unknown>>(ctx, 'grimmory_toggle_field_locks', {
        fields: ['title', 'author'],
        locked: false,
      });
      expect(result.fields).toEqual(['title', 'author']);
      expect(result.locked).toBe(false);
    });

    it('calls PUT with correct path and body', async () => {
      const fields = ['title', 'isbn'];
      await callTool(ctx, 'grimmory_toggle_field_locks', {
        fields,
        locked: true,
      });
      expect(mockClient.put).toHaveBeenCalledWith('books/metadata/toggle-field-locks', {
        fields,
        locked: true,
      });
    });

    it('returns markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_toggle_field_locks', {
        fields: ['title'],
        locked: true,
        response_format: 'markdown',
      });
      expect(result).toContain('#');
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            toggleFieldLocks: { success: false, error: 'Field lock failed', isError: true },
          });
          registerMetadataTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_toggle_field_locks',
          arguments: { fields: ['title'], locked: true },
        });
        expect(result.isError).toBe(true);
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_recalculate_match_scores --------------------------------------

  describe('grimmory_recalculate_match_scores', () => {
    it('returns recalculation result as JSON', async () => {
      const result = await callTool<Record<string, unknown>>(ctx, 'grimmory_recalculate_match_scores', {});
      expect(result.recalculated).toBe(true);
    });

    it('calls POST with correct path', async () => {
      await callTool(ctx, 'grimmory_recalculate_match_scores', {});
      expect(mockClient.post).toHaveBeenCalledWith('books/metadata/recalculate-match-scores', {});
    });

    it('returns markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_recalculate_match_scores', {
        response_format: 'markdown',
      });
      expect(result).toContain('#');
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            recalcMatchScores: { success: false, error: 'Recalc failed', isError: true },
          });
          registerMetadataTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_recalculate_match_scores',
          arguments: {},
        });
        expect(result.isError).toBe(true);
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_batch_isbn_lookup ---------------------------------------------

  describe('grimmory_batch_isbn_lookup', () => {
    it('returns batch lookup results as JSON', async () => {
      const result = await callTool<Array<Record<string, unknown>>>(ctx, 'grimmory_batch_isbn_lookup', {
        isbns: [ISBN, ISBN_2],
      });
      expect(result).toHaveLength(1);
      expect(result[0]!.isbn).toBe(ISBN);
    });

    it('calls POST with correct path and body', async () => {
      const isbns = [ISBN, ISBN_2];
      await callTool(ctx, 'grimmory_batch_isbn_lookup', {
        isbns,
      });
      expect(mockClient.post).toHaveBeenCalledWith('books/metadata/isbn-lookup', {
        isbns,
      });
    });

    it('returns markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_batch_isbn_lookup', {
        isbns: [ISBN],
        response_format: 'markdown',
      });
      expect(result).toContain('#');
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            batchIsbnLookup: { success: false, error: 'Batch lookup failed', isError: true },
          });
          registerMetadataTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_batch_isbn_lookup',
          arguments: { isbns: [ISBN] },
        });
        expect(result.isError).toBe(true);
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_get_provider_metadata -----------------------------------------

  describe('grimmory_get_provider_metadata', () => {
    it('returns provider metadata as JSON', async () => {
      const result = await callTool<Record<string, unknown>>(ctx, 'grimmory_get_provider_metadata', {
        provider: 'google-books',
        providerItemId: 'abc123',
      });
      expect(result.provider).toBe('google-books');
    });

    it('calls GET with correct path', async () => {
      await callTool(ctx, 'grimmory_get_provider_metadata', {
        provider: 'google-books',
        providerItemId: 'abc123',
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        'books/metadata/detail/google-books/abc123',
      );
    });

    it('returns markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_get_provider_metadata', {
        provider: 'open-library',
        providerItemId: 'OL123',
        response_format: 'markdown',
      });
      expect(result).toContain('#');
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            getProviderMetadata: { success: false, error: 'Provider not found', isError: true },
          });
          registerMetadataTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_get_provider_metadata',
          arguments: { provider: 'unknown', providerItemId: 'xyz' },
        });
        expect(result.isError).toBe(true);
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_get_lock_fields -----------------------------------------------

  describe('grimmory_get_lock_fields', () => {
    it('returns lock fields as JSON', async () => {
      const result = await callTool<string[]>(ctx, 'grimmory_get_lock_fields', {});
      expect(result).toContain('title');
      expect(result).toContain('author');
    });

    it('calls GET with correct path', async () => {
      await callTool(ctx, 'grimmory_get_lock_fields', {});
      expect(mockClient.get).toHaveBeenCalledWith('books/metadata/lock-fields');
    });

    it('returns markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_get_lock_fields', {
        response_format: 'markdown',
      });
      expect(result).toContain('#');
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            getLockFields: { success: false, error: 'Failed to fetch lock fields', isError: true },
          });
          registerMetadataTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_get_lock_fields',
          arguments: {},
        });
        expect(result.isError).toBe(true);
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_consolidate_metadata ------------------------------------------

  describe('grimmory_consolidate_metadata', () => {
    it('returns consolidation result as JSON', async () => {
      const result = await callTool<Record<string, unknown>>(ctx, 'grimmory_consolidate_metadata', {
        bookIds: [BOOK_ID],
      });
      expect(result.consolidated).toBe(5);
    });

    it('calls POST with correct path and body (with bookIds)', async () => {
      await callTool(ctx, 'grimmory_consolidate_metadata', {
        bookIds: [BOOK_ID, BOOK_ID_2],
      });
      expect(mockClient.post).toHaveBeenCalledWith('metadata/manage/consolidate', {
        bookIds: [BOOK_ID, BOOK_ID_2],
      });
    });

    it('calls POST with empty body when no bookIds provided', async () => {
      await callTool(ctx, 'grimmory_consolidate_metadata', {});
      expect(mockClient.post).toHaveBeenCalledWith('metadata/manage/consolidate', {});
    });

    it('returns markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_consolidate_metadata', {
        bookIds: [BOOK_ID],
        response_format: 'markdown',
      });
      expect(result).toContain('#');
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            consolidateMetadata: { success: false, error: 'Consolidation failed', isError: true },
          });
          registerMetadataTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_consolidate_metadata',
          arguments: { bookIds: [BOOK_ID] },
        });
        expect(result.isError).toBe(true);
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_delete_metadata_values ----------------------------------------

  describe('grimmory_delete_metadata_values', () => {
    it('returns deletion result as JSON', async () => {
      const result = await callTool<Record<string, unknown>>(ctx, 'grimmory_delete_metadata_values', {
        bookIds: [BOOK_ID],
        fields: ['tags', 'categories'],
      });
      expect(result.deleted).toBe(true);
    });

    it('calls POST with correct path and body', async () => {
      const bookIds = [BOOK_ID];
      const fields = ['tags', 'custom'];
      await callTool(ctx, 'grimmory_delete_metadata_values', {
        bookIds,
        fields,
      });
      expect(mockClient.post).toHaveBeenCalledWith('metadata/manage/delete', {
        bookIds,
        fields,
      });
    });

    it('returns markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_delete_metadata_values', {
        bookIds: [BOOK_ID],
        fields: ['tags'],
        response_format: 'markdown',
      });
      expect(result).toContain('#');
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            deleteMetadataValues: { success: false, error: 'Delete failed', isError: true },
          });
          registerMetadataTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_delete_metadata_values',
          arguments: { bookIds: [BOOK_ID], fields: ['tags'] },
        });
        expect(result.isError).toBe(true);
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_prospective_metadata ------------------------------------------

  describe('grimmory_prospective_metadata', () => {
    it('returns prospective metadata as JSON', async () => {
      const result = await callTool<Array<Record<string, unknown>>>(ctx, 'grimmory_prospective_metadata', {
        bookId: BOOK_ID,
      });
      expect(result).toHaveLength(1);
      expect(result[0]!.provider).toBe('google');
    });

    it('calls GET with correct path', async () => {
      await callTool(ctx, 'grimmory_prospective_metadata', {
        bookId: BOOK_ID,
      });
      expect(mockClient.sseGet).toHaveBeenCalledWith(`books/${BOOK_ID}/metadata/prospective`);
    });

    it('returns markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_prospective_metadata', {
        bookId: BOOK_ID,
        response_format: 'markdown',
      });
      expect(result).toContain('#');
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            prospectiveMetadata: { success: false, error: 'No prospective matches', isError: true },
          });
          registerMetadataTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_prospective_metadata',
          arguments: { bookId: BOOK_ID },
        });
        expect(result.isError).toBe(true);
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });
});
